/**
 * Drawing a payment slip layout in a PDFKit document: texts at their baseline, in Liberation Sans, and paths in a
 * frame in millimetres, in the order of the layout.
 *
 * @module
 */

import type { PathElement, QRBillLayout, TextElement } from '@qr-bill/core';
import { defaultFonts } from './fonts.js';
import type { DrawOptions, PDFKitDocument } from './pdfkit.types.js';

/** Points in a millimetre: a point is 1/72 inch, an inch 25.4 mm. */
export const POINTS_PER_MM: number = 72 / 25.4;

/** Names the fonts are registered under, chosen not to collide with the fonts of the document. */
const FONT_NAMES = { regular: 'QRBill-LiberationSans', bold: 'QRBill-LiberationSans-Bold' } as const;

/** Draws a path of the layout, in a frame in millimetres whose origin is the top left corner of the slip. */
function drawPath(doc: PDFKitDocument, element: PathElement, x: number, y: number): void {
  doc.save();
  doc.translate(x, y);
  doc.scale(POINTS_PER_MM);
  doc.path(element.d);
  if ('fill' in element) {
    doc.fill(element.fill);
  } else {
    // In this frame, the width of the line is in millimetres; the dashes already are.
    doc.lineWidth(element.stroke.width / POINTS_PER_MM);
    const { dash } = element.stroke;
    if (dash === undefined) doc.undash();
    else doc.dash([...dash]);
    doc.stroke('black');
  }
  doc.restore();
}

/**
 * Writes a text of the layout, in black, its baseline at its position. Kerning and ligatures are turned off, which
 * PDFKit applies by default: the text then takes exactly the width the layout measured.
 */
function drawText(doc: PDFKitDocument, element: TextElement, x: number, y: number): void {
  doc.font(element.fontWeight === 'bold' ? FONT_NAMES.bold : FONT_NAMES.regular);
  doc.fontSize(element.fontSize);
  doc.fillColor('black');
  doc.text(element.text, x + element.x * POINTS_PER_MM, y + element.y * POINTS_PER_MM, {
    baseline: 'alphabetic',
    lineBreak: false,
    features: { kern: false, liga: false },
  });
}

/**
 * Draws a payment slip at a given position, without checking the room left on the page. Use {@link attachTo} to add
 * it at the bottom of the last page.
 *
 * The graphics state of the document (colors, opacity, line width, dashes…) and its text cursor (`doc.x`, `doc.y`)
 * are left as they were. The font of the document becomes Liberation Sans: select your font again before writing
 * more text.
 *
 * @param doc - A PDFKit document (`new PDFDocument()`).
 * @param layout - The layout of the slip, see `layoutQRBill` of `@qr-bill/core`.
 * @param options - Where to draw it, in points, and optionally the fonts.
 * @example
 * ```ts
 * // A page of the size of the slip alone, 210 × 105 mm
 * const doc = new PDFDocument({ size: [595.28, 297.64], margin: 0 });
 * drawPaymentSlip(doc, layoutQRBill(bill, { language: 'de', separators: 'none' }), { x: 0, y: 0 });
 * ```
 */
export function drawPaymentSlip(doc: PDFKitDocument, layout: QRBillLayout, options: DrawOptions): void {
  const fonts = options.fonts ?? defaultFonts();
  doc.registerFont(FONT_NAMES.regular, fonts.regular);
  doc.registerFont(FONT_NAMES.bold, fonts.bold);
  const cursor = { x: doc.x, y: doc.y };
  doc.save();
  // The state the document may have set would change the slip: a transparency fades the QR code, round caps lengthen
  // the dashes of the cutting lines.
  doc.opacity(1);
  doc.lineCap('butt');
  for (const element of layout.elements) {
    if (element.type === 'text') drawText(doc, element, options.x, options.y);
    else drawPath(doc, element, options.x, options.y);
  }
  doc.restore();
  doc.x = cursor.x;
  doc.y = cursor.y;
}
