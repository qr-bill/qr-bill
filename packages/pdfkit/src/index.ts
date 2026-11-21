/**
 * Public API of `@qr-bill/pdfkit`: the Swiss QR-bill payment slip in a PDFKit document.
 *
 * - {@link attachTo}: the slip at the bottom of the last page, or on a new page.
 * - {@link drawPaymentSlip}: the slip at a given position.
 * - {@link registerFonts}: the fonts of the slip, for the rest of the document.
 *
 * @module
 */

export { attachTo } from './attach.js';
export { POINTS_PER_MM, drawPaymentSlip } from './draw.js';
export { registerFonts } from './fonts.js';
export type {
  AttachOptions,
  AttachResult,
  DrawOptions,
  PDFKitDocument,
  PDFKitPage,
  PageMargins,
  PaymentSlipFonts,
  RegisteredFonts,
} from './pdfkit.types.js';
