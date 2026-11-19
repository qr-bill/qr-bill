/**
 * Types of the amount and the currency.
 *
 * @module
 */

/** Currencies of the QR-bill (SIX IG QR-bill v2.4, chapter 4.2.2, table 8, "Currency"). */
export type Currency = 'CHF' | 'EUR';

/**
 * Result of the validation of an amount.
 *
 * - `valid`: between 0.01 and 999 999 999.99, or empty: the debtor then writes the amount by hand.
 * - `zero`: 0.00, only allowed for a notification whose message is "DO NOT USE FOR PAYMENT" (chapter 4.4, see
 *   {@link isZeroAmountAllowed}).
 * - `invalid_amount`: not a number with at most two decimals and "." as decimal separator.
 * - `amount_out_of_range`: above 999 999 999.99.
 */
export type AmountStatus = 'valid' | 'zero' | 'invalid_amount' | 'amount_out_of_range';
