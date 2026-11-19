/**
 * Validators of the amount and the currency (SIX IG QR-bill v2.4, chapters 3.5.3, 4.2.2 and 4.4).
 *
 * @module
 */

import { MAX_AMOUNT, normalizeAmount } from './amount.js';
import type { AmountStatus, Currency } from './amount.types.js';

/**
 * Tells whether a value is a currency of the QR-bill: "CHF" or "EUR", in upper case.
 *
 * @param value - Any value.
 * @returns `true` for "CHF" or "EUR". In TypeScript, the value is then known to be a {@link Currency}.
 */
export function isValidCurrency(value: unknown): value is Currency {
  return value === 'CHF' || value === 'EUR';
}

/**
 * Tells whether a normalized amount lies between 0.01 and 999 999 999.99.
 *
 * @param normalized - An amount returned by {@link normalizeAmount}.
 * @returns `true` when the amount is in range.
 */
export function isAmountInRange(normalized: string): boolean {
  const value = Number(normalized);
  return value >= 0.01 && value <= Number(MAX_AMOUNT);
}

/**
 * Validates an amount. An empty amount is valid: the debtor then writes it by hand on the payment part.
 *
 * @param value - A decimal string ("1949.75", "50") or a number with at most two decimals. Blank counts as empty.
 * @returns `valid`, `zero`, `invalid_amount` or `amount_out_of_range` (see {@link AmountStatus}).
 * @example
 * ```ts
 * validateAmount('1949.75'); // 'valid'
 * validateAmount(''); // 'valid': the debtor fills it in
 * validateAmount('0.00'); // 'zero': only for a "DO NOT USE FOR PAYMENT" notification
 * validateAmount('1,50'); // 'invalid_amount'
 * validateAmount('1000000000'); // 'amount_out_of_range'
 * ```
 */
export function validateAmount(value: string | number | null | undefined): AmountStatus {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return 'valid';
  const amount = normalizeAmount(value);
  if (amount === undefined) return 'invalid_amount';
  if (amount === '0.00') return 'zero';
  return isAmountInRange(amount) ? 'valid' : 'amount_out_of_range';
}
