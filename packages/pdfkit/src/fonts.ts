/**
 * The default fonts of the payment slip: Liberation Sans Regular and Bold 2.1.5, shipped unmodified in the `fonts`
 * folder of this package (SIL Open Font License 1.1, see `fonts/LICENSE`). They are the fonts the layout of
 * `@qr-bill/core` is measured with, and one of the four fonts the QR-bill allows (SIX IG QR-bill v2.4, chapter 3.4).
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import type { PaymentSlipFonts } from './pdfkit.types.js';

let fonts: PaymentSlipFonts | undefined;

/**
 * Reads the default fonts, once.
 *
 * @returns Liberation Sans Regular and Bold.
 */
export function defaultFonts(): PaymentSlipFonts {
  fonts ??= {
    regular: readFileSync(new URL('../fonts/LiberationSans-Regular.ttf', import.meta.url)),
    bold: readFileSync(new URL('../fonts/LiberationSans-Bold.ttf', import.meta.url)),
  };
  return fonts;
}
