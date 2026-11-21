/**
 * Types of the details of the invoice.
 *
 * @module
 */

/** A detail printed in the grid under the title: its label and its value, e.g. "Date" and "20.11.2026". */
export interface Detail {
  /** The label. */
  readonly label: string;
  /** The value. */
  readonly value: string;
}
