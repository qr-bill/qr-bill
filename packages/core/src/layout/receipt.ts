/**
 * The receipt, on the left of the payment slip (SIX IG QR-bill v2.4, chapter 3.6): title, information, amount and
 * acceptance point. No additional information, no QR code.
 *
 * @module
 */

import { formatAmount } from '../amount/amount.js';
import type { QRBill } from '../bill/bill.types.js';
import type { Labels } from '../labels/labels.types.js';
import {
  RECEIPT_ACCEPTANCE_POINT,
  RECEIPT_AMOUNT,
  RECEIPT_AMOUNT_FIELD,
  RECEIPT_AMOUNT_LINE_SPACING,
  RECEIPT_AMOUNT_X,
  RECEIPT_DEBTOR_FIELD,
  RECEIPT_INFORMATION,
  RECEIPT_STYLE,
  RECEIPT_TITLE,
  TITLE_FONT_SIZE,
} from './dimensions.js';
import { flowBlocks, informationBlocks } from './information.js';
import type { LayoutElement } from './layout.types.js';
import { cornerMarks, text } from './shapes.js';
import { MM_PER_PT, ascent, textWidth } from './text.js';

/**
 * Lays out the receipt. Its fonts are fixed (6 pt headings, 8 pt values); when the information does not fit, the
 * streets of the addresses are left out, as chapter 3.6.2 allows.
 *
 * @param bill - The bill.
 * @param labels - The headings, in the language of the bill.
 * @returns The elements of the receipt.
 */
export function layoutReceipt(bill: QRBill, labels: Labels): LayoutElement[] {
  const style = RECEIPT_STYLE;
  const heading = { size: style.heading, weight: 'bold' } as const;
  const value = { size: style.value, weight: 'regular' } as const;
  const { width } = RECEIPT_INFORMATION;
  const blocks = (streets: boolean) =>
    flowBlocks(
      informationBlocks(bill, labels, width, style, RECEIPT_DEBTOR_FIELD, { streets, additionalInformation: false }),
      RECEIPT_INFORMATION,
      style,
    );
  const full = blocks(true);
  const information = full.height <= RECEIPT_INFORMATION.height ? full : blocks(false);

  const amountHeading = RECEIPT_AMOUNT.y + ascent(style.heading);
  const amountValue = amountHeading + RECEIPT_AMOUNT_LINE_SPACING * MM_PER_PT;
  const acceptancePointWidth = textWidth(labels.acceptancePoint, heading.size, heading.weight);
  const right = RECEIPT_ACCEPTANCE_POINT.x + RECEIPT_ACCEPTANCE_POINT.width;

  return [
    text(RECEIPT_TITLE.x, RECEIPT_TITLE.y + ascent(TITLE_FONT_SIZE), labels.receipt, {
      size: TITLE_FONT_SIZE,
      weight: 'bold',
    }),
    ...information.elements,
    text(RECEIPT_AMOUNT.x, amountHeading, labels.currency, heading),
    text(RECEIPT_AMOUNT_X, amountHeading, labels.amount, heading),
    text(RECEIPT_AMOUNT.x, amountValue, bill.currency, value),
    bill.amount === undefined
      ? cornerMarks(RECEIPT_AMOUNT_FIELD)
      : text(RECEIPT_AMOUNT_X, amountValue, formatAmount(bill.amount), value),
    text(
      right - acceptancePointWidth,
      RECEIPT_ACCEPTANCE_POINT.y + ascent(heading.size),
      labels.acceptancePoint,
      heading,
    ),
  ];
}
