/**
 * Adding the payment slip at the bottom of the last page of a PDFKit document, or on a new page when the last one
 * has not enough room left (SIX IG QR-bill v2.4, chapter 3.1: the payment part sits on the lower edge).
 *
 * @module
 */

import { type QRBill, layoutQRBill } from '@qr-bill/core';
import { POINTS_PER_MM, drawPaymentSlip } from './draw.js';
import type { AttachOptions, AttachResult, PDFKitDocument } from './pdfkit.types.js';

/**
 * Adds the payment slip of a bill (receipt and payment part, 210 × 105 mm) at the bottom of the current page, the
 * last one written, or on a new page of the same size and margins when the text already reaches into the 105 mm,
 * plus what the cutting lines draw above the slip. The slip is centred horizontally: on an A4 page, it spans the
 * whole width.
 *
 * Afterwards the text cursor is at the bottom of the page, so further text goes to a new page. The font of the
 * document becomes Liberation Sans: select your font again before writing more text.
 *
 * @param doc - A PDFKit document (`new PDFDocument()`).
 * @param bill - The bill, see `createQRBill` of `@qr-bill/core`.
 * @param options - Language of the slip, cutting lines (scissors by default) and optionally the fonts.
 * @returns Whether a page was added.
 * @throws {RangeError} When the page is narrower than 210 mm, or too low for the slip.
 * @example
 * ```ts
 * const doc = new PDFDocument({ size: 'A4' });
 * doc.pipe(createWriteStream('invoice.pdf'));
 * doc.text('Invoice 2026-11'); // … the body of the invoice
 * attachTo(doc, createQRBill(input), { language: 'fr' });
 * doc.end();
 * ```
 */
export function attachTo(doc: PDFKitDocument, bill: QRBill, options: AttachOptions): AttachResult {
  const layout = layoutQRBill(bill, options);
  const width = layout.width * POINTS_PER_MM;
  const height = layout.height * POINTS_PER_MM;
  // The cutting lines may draw above the slip (the scissors, or the instruction to separate it).
  const required = (layout.height - layout.bounds.y) * POINTS_PER_MM;
  const { page } = doc;
  if (page.width < width || page.height < required) {
    throw new RangeError(`The payment slip needs a page of at least 210 × ${(required / POINTS_PER_MM).toFixed(1)} mm`);
  }

  const newPage = doc.y > page.height - required;
  if (newPage) doc.addPage({ size: [page.width, page.height], margins: page.margins });

  drawPaymentSlip(doc, layout, {
    x: (doc.page.width - width) / 2,
    y: doc.page.height - height,
    fonts: options.fonts,
  });
  doc.y = doc.page.height;
  return { newPage };
}
