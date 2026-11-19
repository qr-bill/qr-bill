/**
 * Layout of the payment slip (SIX IG QR-bill v2.4, chapter 3, and the style guide of the QR-bill): the receipt and
 * the payment part, 210 × 105 mm, as elements positioned in millimetres. Renderers (SVG, PDF…) only draw them.
 *
 * @module
 */

import type { QRBill } from '../bill/bill.types.js';
import { LABELS } from '../labels/labels.js';
import { SLIP } from './dimensions.js';
import type { LayoutOptions, QRBillLayout } from './layout.types.js';
import { layoutPaymentPart } from './payment-part.js';
import { layoutReceipt } from './receipt.js';
import { layoutSeparators } from './separators.js';

/**
 * Lays out the payment slip of a bill: the receipt on the left, the payment part with the Swiss QR Code on the
 * right, and the cutting lines.
 *
 * Text is measured with Liberation Sans, one of the four fonts the QR-bill allows; a renderer that draws it with
 * Liberation Sans, or the metric-compatible Arial, gets the same line breaks.
 *
 * @param bill - A bill created by {@link createQRBill} or read by {@link parseQRBill}.
 * @param options - Language and cutting lines.
 * @returns The layout, frozen; coordinates in millimetres from the top left corner of the slip.
 * @example
 * ```ts
 * const layout = layoutQRBill(createQRBill(input), { language: 'fr' });
 * const svg = renderSVG(layout); // an SVG document of 210 × 105 mm
 * ```
 */
export function layoutQRBill(bill: QRBill, options: LayoutOptions): QRBillLayout {
  const labels = LABELS[options.language];
  const separators = layoutSeparators(options.separators ?? 'scissors', labels);
  return Object.freeze({
    width: SLIP.width,
    height: SLIP.height,
    bounds: Object.freeze({ x: 0, y: separators.top, width: SLIP.width, height: SLIP.height - separators.top }),
    elements: Object.freeze([
      ...separators.elements,
      ...layoutReceipt(bill, labels),
      ...layoutPaymentPart(bill, labels),
    ]),
  });
}
