/**
 * Measuring and fitting text with the metrics of Liberation Sans: widths, line breaks and shortening with an
 * ellipsis (SIX IG QR-bill v2.4, chapters 3.5.4 and 3.5.5).
 *
 * @module
 */

import { codePoints } from '../text/charset.js';
import { ASCENT, BOLD_WIDTHS, DESCENT, REGULAR_WIDTHS } from './font-metrics.js';
import type { FontWeight } from './layout.types.js';

/** Millimetres in a point: a point is 1/72 inch, an inch 25.4 mm. */
export const MM_PER_PT: number = 25.4 / 72;

/** The ellipsis that marks shortened text. */
export const ELLIPSIS = '…';

/** Width given to a character missing from the metrics, that of a digit; the validation makes it rare. */
const FALLBACK_WIDTH = 556;

/** Advance width of a character, in thousandths of the font size. */
function characterWidth(codePoint: number, weight: FontWeight): number {
  for (const [first, widths] of weight === 'bold' ? BOLD_WIDTHS : REGULAR_WIDTHS) {
    const width = widths[codePoint - first];
    if (width !== undefined) return width;
  }
  return FALLBACK_WIDTH;
}

/**
 * Measures the width of a text set in Liberation Sans.
 *
 * @param text - One line of text.
 * @param fontSize - Font size, in points.
 * @param weight - Font weight.
 * @returns The width, in millimetres.
 * @example
 * ```ts
 * textWidth('CHF', 10, 'regular').toFixed(2); // '7.25': C, H and F are 722, 722 and 611 thousandths of 10 pt
 * ```
 */
export function textWidth(text: string, fontSize: number, weight: FontWeight): number {
  const units = codePoints(text).reduce((total, codePoint) => total + characterWidth(codePoint, weight), 0);
  return (units / 1000) * fontSize * MM_PER_PT;
}

/**
 * Gives the height of the font above the baseline.
 *
 * @param fontSize - Font size, in points.
 * @returns The ascent, in millimetres.
 */
export function ascent(fontSize: number): number {
  return (ASCENT / 1000) * fontSize * MM_PER_PT;
}

/**
 * Gives the depth of the font below the baseline.
 *
 * @param fontSize - Font size, in points.
 * @returns The descent, in millimetres.
 */
export function descent(fontSize: number): number {
  return (DESCENT / 1000) * fontSize * MM_PER_PT;
}

/** A font: size in points and weight. */
export interface Font {
  /** Font size, in points. */
  readonly size: number;
  /** Font weight. */
  readonly weight: FontWeight;
}

/**
 * Shortens a text to a width, replacing its end with an ellipsis.
 *
 * @param text - One line of text.
 * @param width - The width available, in millimetres.
 * @param font - The font of the text.
 * @returns The text itself when it fits, otherwise its longest beginning that fits with the ellipsis.
 */
export function shorten(text: string, width: number, font: Font): string {
  if (textWidth(text, font.size, font.weight) <= width) return text;
  const characters = [...text];
  while (characters.length > 0) {
    characters.pop();
    const candidate = `${characters.join('').trimEnd()}${ELLIPSIS}`;
    if (textWidth(candidate, font.size, font.weight) <= width) return candidate;
  }
  return ELLIPSIS;
}

/**
 * Breaks a text into lines that fit a width: between words when possible, inside a word longer than a line
 * otherwise.
 *
 * @param text - The text; line breaks in it are kept.
 * @param width - The width available, in millimetres.
 * @param font - The font of the text.
 * @param maxLines - The most lines allowed, none by default; the last one is shortened with an ellipsis when the text
 *   is longer.
 * @returns The lines, at least one.
 */
export function wrap(text: string, width: number, font: Font, maxLines?: number): string[] {
  const fits = (line: string): boolean => textWidth(line, font.size, font.weight) <= width;
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ').filter((part) => part !== '')) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      if (line !== '') lines.push(line);
      // A word longer than a line is cut where the line is full; a single character always stays on a line.
      let rest = [...word];
      while (rest.length > 1 && !fits(rest.join(''))) {
        let cut = rest.length - 1;
        while (cut > 1 && !fits(rest.slice(0, cut).join(''))) cut--;
        lines.push(rest.slice(0, cut).join(''));
        rest = rest.slice(cut);
      }
      line = rest.join('');
    }
    lines.push(line);
  }
  const limit = maxLines ?? Infinity;
  if (lines.length <= limit) return lines;
  const [last = ''] = lines.slice(limit - 1, limit);
  return [...lines.slice(0, limit - 1), shorten(`${last}${ELLIPSIS}`, width, font)];
}
