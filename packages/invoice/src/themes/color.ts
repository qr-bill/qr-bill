/**
 * Colours written `#RRGGBB`: tints mixed with white, and the contrast between two colours as defined by WCAG 2
 * (relative luminance, ratio from 1 to 21). A text is readable when its contrast with its background is at least
 * 4.5:1, the level AA of WCAG for normal text.
 *
 * @module
 */

/** The contrast a text needs on its background: level AA of WCAG 2 for normal text. */
export const MINIMUM_CONTRAST = 4.5;

/**
 * The red, green and blue of a colour.
 *
 * @param color - A colour written `#RRGGBB`.
 * @returns The three channels, from 0 to 255.
 */
function channels(color: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16)) as [number, number, number];
}

/**
 * Writes three channels as `#RRGGBB`, in upper case.
 *
 * @param values - Red, green and blue, rounded and kept within 0 to 255.
 * @returns The colour.
 */
function toHex(values: readonly number[]): string {
  const hex = values.map((value) =>
    Math.min(255, Math.max(0, Math.round(value)))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${hex.join('')}`.toUpperCase();
}

/**
 * Mixes a colour with another one: with a share of 1 the result is the colour, with 0 the other one.
 *
 * @param color - The colour, `#RRGGBB`.
 * @param background - The colour it is mixed with, usually white.
 * @param share - The share of the colour, from 0 to 1.
 * @returns The mixed colour.
 * @example
 * ```ts
 * mix('#1F3A5F', '#FFFFFF', 0.5); // '#8F9DAF'
 * ```
 */
export function mix(color: string, background: string, share: number): string {
  const [red, green, blue] = channels(color);
  const [baseRed, baseGreen, baseBlue] = channels(background);
  return toHex([
    baseRed + (red - baseRed) * share,
    baseGreen + (green - baseGreen) * share,
    baseBlue + (blue - baseBlue) * share,
  ]);
}

/**
 * The relative luminance of a colour, from 0 (black) to 1 (white), as WCAG 2 defines it.
 *
 * @param color - The colour, `#RRGGBB`.
 * @returns The luminance.
 */
export function luminance(color: string): number {
  const [red, green, blue] = channels(color).map((value) => {
    const share = value / 255;
    return share <= 0.04045 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * The contrast between two colours, from 1 (the same luminance) to 21 (black on white), as WCAG 2 defines it.
 *
 * @param first - A colour, `#RRGGBB`.
 * @param second - Another colour.
 * @returns The contrast ratio.
 * @example
 * ```ts
 * contrastRatio('#000000', '#FFFFFF'); // 21
 * ```
 */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Darkens a colour by steps of 5 % until it is readable on a light background, where black always is.
 *
 * @param color - The colour of the text, `#RRGGBB`.
 * @param background - A light background, e.g. white or a tint.
 * @returns The colour itself when it is readable already, otherwise the first darker step that is.
 * @example
 * ```ts
 * readableOn('#1F3A5F', '#FFFFFF'); // '#1F3A5F': dark enough already
 * readableOn('#F59E0B', '#FFFFFF'); // '#9F6707': amber, darkened to a contrast of 4.75
 * ```
 */
export function readableOn(color: string, background: string): string {
  let darker = color;
  for (let step = 1; contrastRatio(darker, background) < MINIMUM_CONTRAST && step <= 20; step++) {
    darker = mix(color, '#000000', 1 - step * 0.05);
  }
  return darker;
}
