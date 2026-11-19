/**
 * Dimensions of the payment slip, from the style guide of the QR-bill (page 6, "Precise dimensions"; page 7, blank
 * fields; page 15, fonts) and SIX IG QR-bill v2.4, chapters 3.3 to 3.6 and 6.4. Lengths in millimetres, font sizes
 * and line spacings in points.
 *
 * @module
 */

import type { Box } from './layout.types.js';

/** A width and a height, in millimetres. */
export interface Size {
  /** Width. */
  readonly width: number;
  /** Height. */
  readonly height: number;
}

/** The slip: receipt and payment part, 210 × 105 mm (chapter 3.3). */
export const SLIP: Box = { x: 0, y: 0, width: 210, height: 105 };

/** The receipt, on the left: 62 × 105 mm. */
export const RECEIPT: Box = { x: 0, y: 0, width: 62, height: 105 };

/** The payment part, on the right: 148 × 105 mm, DIN A6. */
export const PAYMENT_PART: Box = { x: 62, y: 0, width: 148, height: 105 };

// Sections of the receipt (style guide, page 6): a 5 mm margin all around, then title, information, amount and
// acceptance point.
/** Title section of the receipt. */
export const RECEIPT_TITLE: Box = { x: 5, y: 5, width: 52, height: 7 };
/** Information section of the receipt. */
export const RECEIPT_INFORMATION: Box = { x: 5, y: 12, width: 52, height: 56 };
/** Amount section of the receipt. */
export const RECEIPT_AMOUNT: Box = { x: 5, y: 68, width: 52, height: 14 };
/** Acceptance point section of the receipt (at least 2 cm high minus the margin, chapter 3.6). */
export const RECEIPT_ACCEPTANCE_POINT: Box = { x: 5, y: 82, width: 52, height: 18 };

// Sections of the payment part (style guide, page 6): a left column of 46 mm (title, QR code, amount), 5 mm of space,
// a right column of 87 mm (information), and the further information across the bottom.
/** Title section of the payment part. */
export const PAYMENT_PART_TITLE: Box = { x: 67, y: 5, width: 46, height: 7 };
/** The Swiss QR Code: 46 × 46 mm whatever its version (chapter 6.4), with 5 mm of space around it (3.5.2). */
export const QR_CODE: Box = { x: 67, y: 17, width: 46, height: 46 };
/** Amount section of the payment part. */
export const PAYMENT_PART_AMOUNT: Box = { x: 67, y: 68, width: 46, height: 22 };
/** Information section of the payment part. */
export const PAYMENT_PART_INFORMATION: Box = { x: 118, y: 5, width: 87, height: 85 };
/** Further information section: the alternative procedures (3.5.5). */
export const FURTHER_INFORMATION: Box = { x: 67, y: 90, width: 138, height: 10 };

/** Side of the Swiss cross printed over the centre of the QR code (chapter 6.4.2). */
export const SWISS_CROSS_SIZE = 7;

// Blank fields left for the debtor to fill in by hand (style guide, page 7; chapters 3.5.3, 3.5.4, 3.6.2, 3.6.3).
/**
 * Blank amount field of the payment part, below the headings and right of the currency. The example of the style
 * guide puts it against the right column (78 to 118 mm); 2 mm to the left keep it apart from the blank debtor field
 * when the additional information pushes that one down.
 */
export const PAYMENT_PART_AMOUNT_FIELD: Box = { x: 76, y: 74, width: 40, height: 15 };
/** Blank amount field of the receipt, next to the headings, its right edge on the margin. */
export const RECEIPT_AMOUNT_FIELD: Box = { x: 27, y: 70, width: 30, height: 10 };
/** Size of the blank debtor field of the payment part. */
export const PAYMENT_PART_DEBTOR_FIELD: Size = { width: 65, height: 25 };
/** Size of the blank debtor field of the receipt. */
export const RECEIPT_DEBTOR_FIELD: Size = { width: 52, height: 20 };
/** Length of each arm of a corner mark. */
export const CORNER_MARK_LENGTH = 3;
/** Thickness of the corner marks, in points. */
export const CORNER_MARK_THICKNESS = 0.75;

/** Horizontal position of the amount, after the currency: payment part (style guide, page 7). */
export const PAYMENT_PART_AMOUNT_X = 82;
/** Horizontal position of the amount, after the currency: receipt. */
export const RECEIPT_AMOUNT_X = 17;

/** A set of font sizes and line spacing for headings and their values. */
export interface TextStyle {
  /** Size of the headings, bold, in points. */
  readonly heading: number;
  /** Size of the values, in points. */
  readonly value: number;
  /** Distance between two baselines, in points; a blank line of the same height separates the blocks. */
  readonly lineSpacing: number;
}

/** Title of the receipt and the payment part: 11 pt bold (chapters 3.5.1 and 3.6.1). */
export const TITLE_FONT_SIZE = 11;

/** The smallest style of the payment part: 6 pt headings, 8 pt values, 9 pt line spacing (chapter 3.4). */
export const PAYMENT_PART_SMALLEST_STYLE: TextStyle = { heading: 6, value: 8, lineSpacing: 9 };

/**
 * Styles of the information section of the payment part, from the recommended one (8 pt headings, 10 pt values,
 * 11 pt line spacing) down to {@link PAYMENT_PART_SMALLEST_STYLE}; the first that fits is used.
 */
export const PAYMENT_PART_STYLES: readonly TextStyle[] = [
  { heading: 8, value: 10, lineSpacing: 11 },
  { heading: 7, value: 9, lineSpacing: 10 },
  PAYMENT_PART_SMALLEST_STYLE,
];

/** Lines of additional information kept, at most, when even the smallest style does not hold everything. */
export const ADDITIONAL_INFORMATION_MAX_LINES = 8;

/** Style of the receipt: 6 pt headings, 8 pt values, 9 pt line spacing (chapter 3.4, style guide page 15). */
export const RECEIPT_STYLE: TextStyle = { heading: 6, value: 8, lineSpacing: 9 };

/** Distance between the baselines of the heading and the value of the amount, payment part (style guide p. 15). */
export const PAYMENT_PART_AMOUNT_LINE_SPACING = 13;
/** Distance between the baselines of the heading and the value of the amount, receipt (style guide p. 15). */
export const RECEIPT_AMOUNT_LINE_SPACING = 11;

/** Font size of the alternative procedures, the name of the procedure in bold (3.5.5, style guide page 15). */
export const FURTHER_INFORMATION_FONT_SIZE = 7;
/** Line spacing of the alternative procedures (style guide page 15). */
export const FURTHER_INFORMATION_LINE_SPACING = 8;

/** Thickness of the cutting lines of a PDF slip, in points (chapter 3.7). */
export const SEPARATOR_THICKNESS = 0.5;
/** Dashes of the cutting lines: 1 mm of line, 1 mm of space. */
export const SEPARATOR_DASH: readonly number[] = [1, 1];
/** Font size of the instruction "Separate before paying in", printed above the slip. */
export const SEPARATOR_TEXT_FONT_SIZE = 7;
