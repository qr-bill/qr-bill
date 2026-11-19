/**
 * The payment part, on the right of the payment slip (SIX IG QR-bill v2.4, chapter 3.5): title, Swiss QR Code,
 * amount, information and further information.
 *
 * @module
 */

import { formatAmount } from '../amount/amount.js';
import type { QRBill } from '../bill/bill.types.js';
import type { Labels } from '../labels/labels.types.js';
import { encodeSwissQRCode } from '../qr-code/encoder.js';
import {
  ADDITIONAL_INFORMATION_MAX_LINES,
  FURTHER_INFORMATION,
  FURTHER_INFORMATION_FONT_SIZE,
  FURTHER_INFORMATION_LINE_SPACING,
  PAYMENT_PART_AMOUNT,
  PAYMENT_PART_AMOUNT_FIELD,
  PAYMENT_PART_AMOUNT_LINE_SPACING,
  PAYMENT_PART_AMOUNT_X,
  PAYMENT_PART_DEBTOR_FIELD,
  PAYMENT_PART_INFORMATION,
  PAYMENT_PART_SMALLEST_STYLE,
  PAYMENT_PART_STYLES,
  PAYMENT_PART_TITLE,
  QR_CODE,
  type TextStyle,
  TITLE_FONT_SIZE,
} from './dimensions.js';
import { flowBlocks, informationBlocks } from './information.js';
import type { LayoutElement } from './layout.types.js';
import { cornerMarks, qrCodePath, swissCross, text } from './shapes.js';
import { MM_PER_PT, ascent, shorten, textWidth } from './text.js';

/** The information section in a style, with all the additional information or at most `lines` of it. */
function information(bill: QRBill, labels: Labels, style: TextStyle, lines?: number) {
  const content = { streets: true, additionalInformation: true, additionalInformationLines: lines };
  const blocks = informationBlocks(
    bill,
    labels,
    PAYMENT_PART_INFORMATION.width,
    style,
    PAYMENT_PART_DEBTOR_FIELD,
    content,
  );
  return { style, ...flowBlocks(blocks, PAYMENT_PART_INFORMATION, style) };
}

/**
 * Fits the information section: the recommended fonts (8/10 pt) if everything fits, smaller ones down to 6/8 pt
 * otherwise (chapter 3.4), and as a last resort the additional information shortened, line by line, with an
 * ellipsis at the end (3.5.4).
 */
function fitInformation(bill: QRBill, labels: Labels) {
  const fits = (result: { height: number }) => result.height <= PAYMENT_PART_INFORMATION.height;
  for (const style of PAYMENT_PART_STYLES) {
    const result = information(bill, labels, style);
    if (fits(result)) return result;
  }
  let lines = ADDITIONAL_INFORMATION_MAX_LINES;
  let result = information(bill, labels, PAYMENT_PART_SMALLEST_STYLE, lines);
  while (!fits(result) && lines > 1) {
    lines--;
    result = information(bill, labels, PAYMENT_PART_SMALLEST_STYLE, lines);
  }
  return result;
}

/**
 * Writes the alternative procedures: one line each in 7 pt, the name of the procedure in bold, shortened with an
 * ellipsis when the line is too long (chapter 3.5.5). The name is the text before the first separator, e.g. "eBill"
 * in "eBill/B/peter@sample.ch", or "Name AV1" in "Name AV1: UV;UltraPay005;12345".
 */
function alternativeProcedures(bill: QRBill): LayoutElement[] {
  const size = FURTHER_INFORMATION_FONT_SIZE;
  const { x, y, width } = FURTHER_INFORMATION;
  return bill.alternativeProcedures.flatMap((procedure, index) => {
    const baseline = y + ascent(size) + index * FURTHER_INFORMATION_LINE_SPACING * MM_PER_PT;
    // Without a separator there is no name to set apart: the whole line is regular.
    const separator = procedure.search(/[^\p{L}\p{N} ]/u);
    const fullName = separator < 0 ? '' : procedure.slice(0, separator);
    const name = shorten(fullName, width, { size, weight: 'bold' });
    const nameWidth = textWidth(name, size, 'bold');
    const rest =
      name === fullName ? shorten(procedure.slice(name.length), width - nameWidth, { size, weight: 'regular' }) : '';
    return [
      text(x, baseline, name, { size, weight: 'bold' }),
      text(x + nameWidth, baseline, rest, { size, weight: 'regular' }),
    ].filter((element) => element.text !== '');
  });
}

/**
 * Lays out the payment part.
 *
 * @param bill - The bill.
 * @param labels - The headings, in the language of the bill.
 * @returns The elements of the payment part.
 */
export function layoutPaymentPart(bill: QRBill, labels: Labels): LayoutElement[] {
  const fitted = fitInformation(bill, labels);
  const heading = { size: fitted.style.heading, weight: 'bold' } as const;
  const value = { size: fitted.style.value, weight: 'regular' } as const;
  const amountHeading = PAYMENT_PART_AMOUNT.y + ascent(heading.size);
  const amountValue = amountHeading + PAYMENT_PART_AMOUNT_LINE_SPACING * MM_PER_PT;
  const qrCodeCenter = { x: QR_CODE.x + QR_CODE.width / 2, y: QR_CODE.y + QR_CODE.height / 2 };

  return [
    text(PAYMENT_PART_TITLE.x, PAYMENT_PART_TITLE.y + ascent(TITLE_FONT_SIZE), labels.paymentPart, {
      size: TITLE_FONT_SIZE,
      weight: 'bold',
    }),
    qrCodePath(encodeSwissQRCode(bill.payload), QR_CODE),
    ...swissCross(qrCodeCenter.x, qrCodeCenter.y),
    text(PAYMENT_PART_AMOUNT.x, amountHeading, labels.currency, heading),
    text(PAYMENT_PART_AMOUNT_X, amountHeading, labels.amount, heading),
    text(PAYMENT_PART_AMOUNT.x, amountValue, bill.currency, value),
    bill.amount === undefined
      ? cornerMarks(PAYMENT_PART_AMOUNT_FIELD)
      : text(PAYMENT_PART_AMOUNT_X, amountValue, formatAmount(bill.amount), value),
    ...fitted.elements,
    ...alternativeProcedures(bill),
  ];
}
