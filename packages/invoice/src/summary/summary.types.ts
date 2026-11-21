/**
 * Types of the summary under the table of the lines.
 *
 * @module
 */

/** A row of the totals: its label and its amount, as printed. */
export interface TotalRow {
  /** The label, e.g. "VAT 8.1 % on 1 340.00". */
  readonly label: string;
  /** The amount, e.g. "108.54". */
  readonly value: string;
}

/** The rows of the totals, in three groups. */
export interface TotalRows {
  /** Before the total: the subtotal, the VAT added, the rounding. */
  readonly before: readonly TotalRow[];
  /** The total, in the currency of the invoice. */
  readonly total: TotalRow;
  /** After the total: the VAT included in the prices. */
  readonly after: readonly TotalRow[];
}
