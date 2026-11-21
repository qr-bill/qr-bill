/**
 * The default fonts of the payment slip: Liberation Sans Regular and Bold 2.1.5, shipped unmodified in the `fonts`
 * folder of this package (SIL Open Font License 1.1, see `fonts/LICENSE`). They are the fonts the layout of
 * `@qr-bill/core` is measured with, and one of the four fonts the QR-bill allows (SIX IG QR-bill v2.4, chapter 3.4).
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import type { PDFKitDocument, PaymentSlipFonts, RegisteredFonts } from './pdfkit.types.js';

/** Names the fonts are registered under, chosen not to collide with the fonts of the document. */
const FONT_NAMES: RegisteredFonts = { regular: 'QRBill-LiberationSans', bold: 'QRBill-LiberationSans-Bold' };

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

/**
 * Registers the fonts of the payment slip in a PDFKit document, so that other content, such as the invoice above
 * the slip, can be written in the same fonts: they are then embedded once, with only the characters used.
 *
 * @param doc - A PDFKit document (`new PDFDocument()`).
 * @param fonts - The font files; by default Liberation Sans, shipped with this package.
 * @returns The names to select the fonts with, e.g. `doc.font(names.bold)`.
 * @example
 * ```ts
 * const names = registerFonts(doc);
 * doc.font(names.bold).fontSize(16).text('Invoice 2026-042');
 * ```
 */
export function registerFonts(doc: Pick<PDFKitDocument, 'registerFont'>, fonts?: PaymentSlipFonts): RegisteredFonts {
  const files = fonts ?? defaultFonts();
  doc.registerFont(FONT_NAMES.regular, files.regular);
  doc.registerFont(FONT_NAMES.bold, files.bold);
  return FONT_NAMES;
}
