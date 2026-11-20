/**
 * Types of the amounts of an invoice: the totals given by the caller, the totals printed, and the integers they are
 * computed with.
 *
 * @module
 */

/** VAT of one rate, as given in {@link InvoiceProvidedTotals}. */
export interface InvoiceProvidedVAT {
  /** The rate in percent, e.g. `"8.1"`. */
  readonly rate: string | number;
  /** The amount the rate applies to; optional. */
  readonly base?: string | number | undefined;
  /** The VAT. */
  readonly amount: string | number;
}

/** Totals computed elsewhere, printed as they are: nothing is computed. */
export interface InvoiceProvidedTotals {
  /** Sum of the lines; optional. */
  readonly subtotal?: string | number | undefined;
  /** VAT per rate; optional. */
  readonly vat?: readonly InvoiceProvidedVAT[] | undefined;
  /** The total to pay. */
  readonly total: string | number;
}

/** VAT of one rate. */
export interface InvoiceVAT {
  /** The rate in percent, without trailing zeros, e.g. `"8.1"`. */
  readonly rate: string;
  /**
   * The amount the rate applies to: the sum of the lines at this rate, before VAT when the prices exclude it,
   * VAT included when they include it. Absent when given totals have none.
   */
  readonly base?: string;
  /** The VAT. */
  readonly amount: string;
}

/** The amounts of an invoice, as decimal strings with two decimals (`"-90.00"`). */
export interface InvoiceTotals {
  /** The amount of each line, in the order of the lines; absent for a line of text. */
  readonly lines: readonly (string | undefined)[];
  /** The sum of the lines. */
  readonly subtotal?: string;
  /** VAT per rate, highest rate first; empty when no line has a rate. */
  readonly vat: readonly InvoiceVAT[];
  /** What the rounding to 5 centimes added to the total; absent when there is no rounding. */
  readonly rounding?: string;
  /** The total to pay. */
  readonly total: string;
}

/** A line of an invoice, its numbers read as scaled integers (see the *_DECIMALS constants). */
export interface ParsedLine {
  /** Quantity, in thousandths. */
  readonly quantity?: bigint | undefined;
  /** Unit price, in ten-thousandths. */
  readonly unitPrice?: bigint | undefined;
  /** VAT rate, in hundredths of a percent. */
  readonly vatRate?: bigint | undefined;
  /** Amount of the line, in centimes. */
  readonly amount?: bigint | undefined;
}

/** How the totals are computed. */
export interface TotalsOptions {
  /** Whether the prices include VAT; they do not by default. */
  readonly pricesIncludeVAT?: boolean | undefined;
  /** Whether the total is rounded to 5 centimes. */
  readonly roundTo5Centimes?: boolean | undefined;
}

/** VAT of one rate, in centimes and hundredths of a percent. */
export interface ComputedVAT {
  /** The rate, in hundredths of a percent. */
  readonly rate: bigint;
  /** The sum of the lines at this rate. */
  readonly base: bigint;
  /** The VAT. */
  readonly amount: bigint;
}

/** Totals in centimes, as computed by {@link computeTotals}. */
export interface ComputedTotals {
  /** The amount of each line; `undefined` for a line of text. */
  readonly lines: readonly (bigint | undefined)[];
  /** The sum of the lines. */
  readonly subtotal: bigint;
  /** VAT per rate, highest rate first. */
  readonly vat: readonly ComputedVAT[];
  /** What the rounding to 5 centimes added, when requested. */
  readonly rounding?: bigint;
  /** The total to pay. */
  readonly total: bigint;
}

/** Totals given by the caller, as printed, and their total as an integer for the payment part. */
export interface ProvidedTotals {
  /** The totals as printed, without the amounts of the lines, which come from the lines. */
  readonly totals: Omit<InvoiceTotals, 'lines'>;
  /** The total, in centimes. */
  readonly total: bigint;
}
