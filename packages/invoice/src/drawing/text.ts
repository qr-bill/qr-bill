/**
 * Fitting texts in their zones: breaking a text into lines that fit a width, and shortening a line with "…" when it
 * cannot fit otherwise. The width of a text is given by a function, so that the same rules serve any font; on the
 * invoice it is measured by PDFKit, with the font that prints it.
 *
 * @module
 */

import type { Measure } from './drawing.types.js';

/** The ellipsis that ends a shortened text. */
export const ELLIPSIS = '…';

/**
 * Shortens a text with "…" until it fits a width. A text that fits already is returned as is.
 *
 * @param text - The text, on one line.
 * @param width - The width available, in millimetres.
 * @param measure - The width of a text.
 * @returns The text, or its beginning followed by "…"; just "…" when nothing else fits.
 * @example
 * ```ts
 * shorten('Seldwyla', 5, (text) => text.length); // 'Seld…'
 * ```
 */
export function shorten(text: string, width: number, measure: Measure): string {
  if (measure(text) <= width) return text;
  const characters = [...text];
  for (let length = characters.length - 1; length > 0; length--) {
    const candidate = `${characters.slice(0, length).join('').trimEnd()}${ELLIPSIS}`;
    if (measure(candidate) <= width) return candidate;
  }
  return ELLIPSIS;
}

/**
 * Breaks a text into lines that fit a width: between words where possible, inside a word longer than the width
 * otherwise. Line feeds start new lines. Beyond the maximum number of lines, the last one is shortened with "…".
 *
 * @param text - The text, which may contain line feeds.
 * @param width - The width available, in millimetres.
 * @param measure - The width of a text.
 * @param maxLines - The maximum number of lines; unlimited by default.
 * @returns The lines, each fitting the width.
 * @example
 * ```ts
 * wrap('Max Muster & Söhne', 10, (text) => text.length); // ['Max Muster', '& Söhne']
 * wrap('Max Muster & Söhne', 10, (text) => text.length, 1); // ['Max Muste…']
 * ```
 */
export function wrap(
  text: string,
  width: number,
  measure: Measure,
  maxLines: number = Number.POSITIVE_INFINITY,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ').filter((part) => part !== '')) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (measure(candidate) <= width) {
        line = candidate;
        continue;
      }
      if (line !== '') lines.push(line);
      // A word longer than the width is broken where it must.
      let rest = [...word];
      // A character wider than the width stays alone on its line.
      while (rest.length > 1 && measure(rest.join('')) > width) {
        // The longest beginning that fits, but at least one character, even wider than the width, so that the loop
        // always ends. It stops before the end of the word, which does not fit.
        let length = 1;
        while (measure(rest.slice(0, length + 1).join('')) <= width) length++;
        lines.push(rest.slice(0, length).join(''));
        rest = rest.slice(length);
      }
      line = rest.join('');
    }
    lines.push(line);
  }
  if (lines.length <= maxLines) return lines;
  const [last = ''] = lines.slice(maxLines - 1, maxLines);
  return [...lines.slice(0, maxLines - 1), shorten(`${last}${ELLIPSIS}`, width, measure)];
}
