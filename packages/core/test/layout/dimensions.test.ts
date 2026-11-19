import { describe, expect, it } from 'vitest';
import {
  CORNER_MARK_LENGTH,
  CORNER_MARK_THICKNESS,
  FURTHER_INFORMATION,
  PAYMENT_PART,
  PAYMENT_PART_AMOUNT,
  PAYMENT_PART_AMOUNT_FIELD,
  PAYMENT_PART_DEBTOR_FIELD,
  PAYMENT_PART_INFORMATION,
  PAYMENT_PART_SMALLEST_STYLE,
  PAYMENT_PART_STYLES,
  PAYMENT_PART_TITLE,
  QR_CODE,
  RECEIPT,
  RECEIPT_ACCEPTANCE_POINT,
  RECEIPT_AMOUNT,
  RECEIPT_AMOUNT_FIELD,
  RECEIPT_DEBTOR_FIELD,
  RECEIPT_INFORMATION,
  RECEIPT_STYLE,
  RECEIPT_TITLE,
  SLIP,
  SWISS_CROSS_SIZE,
  TITLE_FONT_SIZE,
} from '../../src/layout/dimensions.js';

const bottom = (box: { y: number; height: number }) => box.y + box.height;
const right = (box: { x: number; width: number }) => box.x + box.width;

describe('dimensions of the slip (chapter 3.3, style guide page 6)', () => {
  it('puts the receipt, 62 mm, left of the payment part, 148 mm, on 210 × 105 mm', () => {
    expect(SLIP).toEqual({ x: 0, y: 0, width: 210, height: 105 });
    expect(RECEIPT.width + PAYMENT_PART.width).toBe(210);
    expect(PAYMENT_PART.x).toBe(RECEIPT.width);
  });

  it('stacks the sections of the receipt between 5 mm margins: 7, 56, 14 and 18 mm', () => {
    const sections = [RECEIPT_TITLE, RECEIPT_INFORMATION, RECEIPT_AMOUNT, RECEIPT_ACCEPTANCE_POINT];
    expect(sections.map((section) => section.height)).toEqual([7, 56, 14, 18]);
    expect(RECEIPT_TITLE.y).toBe(5);
    for (let i = 1; i < sections.length; i++) expect(sections[i]?.y).toBe(bottom(sections[i - 1] ?? SLIP));
    expect(bottom(RECEIPT_ACCEPTANCE_POINT)).toBe(SLIP.height - 5);
    for (const section of sections) {
      expect(section.x).toBe(5);
      expect(right(section)).toBe(RECEIPT.width - 5);
    }
  });

  it('places the Swiss QR Code, 46 × 46 mm, with 5 mm of space around it (3.5.2, 6.4)', () => {
    expect(QR_CODE).toEqual({ x: PAYMENT_PART.x + 5, y: bottom(PAYMENT_PART_TITLE) + 5, width: 46, height: 46 });
    expect(PAYMENT_PART_AMOUNT.y).toBe(bottom(QR_CODE) + 5);
    expect(SWISS_CROSS_SIZE).toBe(7);
  });

  it('lays out the payment part in two columns of 46 and 87 mm, 5 mm apart', () => {
    expect(PAYMENT_PART_TITLE.x).toBe(QR_CODE.x);
    expect(PAYMENT_PART_AMOUNT.width).toBe(46);
    expect(PAYMENT_PART_INFORMATION.x).toBe(right(QR_CODE) + 5);
    expect(PAYMENT_PART_INFORMATION.width).toBe(87);
    expect(right(PAYMENT_PART_INFORMATION)).toBe(SLIP.width - 5);
    expect(bottom(PAYMENT_PART_INFORMATION)).toBe(FURTHER_INFORMATION.y);
    expect(FURTHER_INFORMATION).toEqual({ x: QR_CODE.x, y: 90, width: 138, height: 10 });
    expect(bottom(FURTHER_INFORMATION)).toBe(SLIP.height - 5);
  });

  it('gives the blank fields the sizes of the standard, with 3 mm corner marks of 0.75 pt (3.5.3, 3.5.4, 3.6)', () => {
    expect([PAYMENT_PART_AMOUNT_FIELD.width, PAYMENT_PART_AMOUNT_FIELD.height]).toEqual([40, 15]);
    expect([RECEIPT_AMOUNT_FIELD.width, RECEIPT_AMOUNT_FIELD.height]).toEqual([30, 10]);
    expect(PAYMENT_PART_DEBTOR_FIELD).toEqual({ width: 65, height: 25 });
    expect(RECEIPT_DEBTOR_FIELD).toEqual({ width: 52, height: 20 });
    expect([CORNER_MARK_LENGTH, CORNER_MARK_THICKNESS]).toEqual([3, 0.75]);
    expect(bottom(PAYMENT_PART_AMOUNT_FIELD)).toBeLessThanOrEqual(bottom(PAYMENT_PART_AMOUNT));
    expect(right(RECEIPT_AMOUNT_FIELD)).toBe(right(RECEIPT_AMOUNT));
  });

  it('uses the font sizes of chapter 3.4: 11 pt titles, 8/10 pt recommended, 6 pt at least', () => {
    expect(TITLE_FONT_SIZE).toBe(11);
    expect(PAYMENT_PART_STYLES[0]).toEqual({ heading: 8, value: 10, lineSpacing: 11 });
    expect(PAYMENT_PART_STYLES.at(-1)).toBe(PAYMENT_PART_SMALLEST_STYLE);
    expect(PAYMENT_PART_SMALLEST_STYLE.heading).toBe(6);
    for (const style of PAYMENT_PART_STYLES) expect(style.value - style.heading).toBe(2);
    expect(RECEIPT_STYLE).toEqual({ heading: 6, value: 8, lineSpacing: 9 });
  });
});
