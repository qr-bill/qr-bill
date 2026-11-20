/**
 * Types of the lines of an invoice: as given, and normalized by the validation.
 *
 * @module
 */

import type { ParsedLine } from '../amounts/amounts.types.js';

/**
 * A line of the invoice. Its amount is either given (`amount`) or computed (`quantity` × `unitPrice`, the
 * quantity being 1 when absent). A line with a description only is a line of text. Discounts, deposits and fees
 * are lines too, with negative amounts. Numbers may be strings (`"12.50"`, the safest) or numbers.
 */
export interface InvoiceItem {
  /** What is invoiced, max. 300 characters and 6 lines. */
  readonly description: string;
  /** Quantity, with at most 3 decimals; may be negative. */
  readonly quantity?: string | number | undefined;
  /** Unit, e.g. "h" or "pce"; max. 10 characters. */
  readonly unit?: string | undefined;
  /** Price of one unit, with at most 4 decimals; may be negative. */
  readonly unitPrice?: string | number | undefined;
  /** VAT rate in percent, e.g. `"8.1"`, with at most 2 decimals, from 0 to 100. */
  readonly vatRate?: string | number | undefined;
  /** Amount of the line, with at most 2 decimals; takes precedence over quantity × unit price. */
  readonly amount?: string | number | undefined;
}

/** A line of a valid invoice, normalized; numbers are decimal strings. */
export interface InvoiceLine {
  /** What is invoiced. */
  readonly description: string;
  /** Quantity, without trailing zeros after the decimal point. */
  readonly quantity?: string;
  /** Unit. */
  readonly unit?: string;
  /** Price of one unit, with at least two decimals. */
  readonly unitPrice?: string;
  /** VAT rate in percent, without trailing zeros. */
  readonly vatRate?: string;
}

/** The lines of a valid invoice, as read by the validation. */
export interface ItemsRead {
  /** Their numbers, as exact integers, for the computation of the totals. */
  readonly parsed: readonly ParsedLine[];
  /** The lines, normalized. */
  readonly lines: readonly InvoiceLine[];
}
