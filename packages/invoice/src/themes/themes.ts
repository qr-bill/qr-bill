/**
 * The themes of the invoice and the colours computed from them. A theme changes only the look of the invoice (the
 * title, the table header, the rows of the table, the total, a bar along the top of the pages), never its layout:
 * positions, limits and the payment part stay the same. The payment part is always black on white, as the style
 * guide of the QR-bill requires.
 *
 * @module
 */

import { BUSINESS_THEME } from './business.js';
import { MINIMUM_CONTRAST, contrastRatio, mix, readableOn } from './color.js';
import { MODERN_THEME } from './modern.js';
import { STANDARD_THEME } from './standard.js';
import type { InvoiceThemeData, ThemeColors, ThemeDefinition, ThemeName } from './themes.types.js';

/**
 * The names of the themes, for a selector: `standard` (black and grey, the default), `business` (a filled band of
 * colour), `modern` (light tints).
 *
 * @example
 * ```ts
 * INVOICE_THEMES.length; // 3
 * ```
 */
export const INVOICE_THEMES: readonly ThemeName[] = ['standard', 'business', 'modern'];

/** Each theme by its name. */
export const THEMES: Readonly<Record<ThemeName, ThemeDefinition>> = {
  standard: STANDARD_THEME,
  business: BUSINESS_THEME,
  modern: MODERN_THEME,
};

const BLACK = '#000000';
const WHITE = '#FFFFFF';
/** Share of the accent in the tint of a table header, and in the tint of a striped row. */
const HEADER_TINT = 0.14;
const STRIPE_TINT = 0.05;

/**
 * Computes the colours of an invoice from its theme and accent. Every text stays readable, with a contrast of at
 * least 4.5:1 on its background: a text written in the accent colour is darkened if needed, and the text of a band
 * filled with the accent is white, or black when the accent is too light for white.
 *
 * @param theme - The theme of the invoice and its accent, if one was given.
 * @returns The colours of each part of the invoice.
 * @example
 * ```ts
 * resolveTheme({ name: 'business' }).tableHeaderBackground; // '#1F3A5F'
 * resolveTheme({ name: 'business', accent: '#FDE047' }).tableHeaderText; // '#000000': yellow is too light for white
 * ```
 */
export function resolveTheme(theme: InvoiceThemeData): ThemeColors {
  const definition = THEMES[theme.name];
  const accent = theme.accent ?? definition.accent;
  const readableAccent = readableOn(accent, WHITE);
  let header: Pick<ThemeColors, 'tableHeaderText' | 'tableHeaderBackground' | 'tableHeaderRule'>;
  if (definition.tableHeader === 'band') {
    // White when it is readable on the accent; otherwise black, which then always is.
    const white = contrastRatio(WHITE, accent) >= MINIMUM_CONTRAST;
    header = { tableHeaderBackground: accent, tableHeaderText: white ? WHITE : BLACK };
  } else if (definition.tableHeader === 'tint') {
    const tint = mix(accent, WHITE, HEADER_TINT);
    header = { tableHeaderBackground: tint, tableHeaderText: readableOn(accent, tint) };
  } else {
    header = { tableHeaderRule: accent, tableHeaderText: BLACK };
  }
  return {
    text: BLACK,
    muted: '#595959',
    line: '#DDDDDD',
    title: definition.accentTitle ? readableAccent : BLACK,
    ...header,
    ...(definition.stripedRows && { stripe: mix(accent, WHITE, STRIPE_TINT) }),
    total: definition.accentTotal ? readableAccent : BLACK,
    totalRule: accent,
    ...(definition.topBar && { topBar: accent }),
  };
}
