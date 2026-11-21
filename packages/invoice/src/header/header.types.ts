/**
 * Types of the header of the invoice.
 *
 * @module
 */

/** A line of the details of the issuer or of the address window, with its weight. */
export interface HeaderLine {
  /** The text, fitting its zone. */
  readonly text: string;
  /** Whether it is bold: the names. */
  readonly bold: boolean;
}
