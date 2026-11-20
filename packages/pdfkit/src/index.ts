/**
 * Public API of `@qr-bill/pdfkit`: the Swiss QR-bill payment slip in a PDFKit document.
 *
 * - {@link attachTo}: the slip at the bottom of the last page, or on a new page.
 * - {@link drawPaymentSlip}: the slip at a given position.
 *
 * @module
 */

export { attachTo } from './attach.js';
export { POINTS_PER_MM, drawPaymentSlip } from './draw.js';
export type {
  AttachOptions,
  AttachResult,
  DrawOptions,
  PDFKitDocument,
  PDFKitPage,
  PageMargins,
  PaymentSlipFonts,
} from './pdfkit.types.js';
