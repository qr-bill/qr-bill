/**
 * Amounts of the QR-bill (SIX IG QR-bill v2.4, chapters 3.5.3 and 4.2.2): converting, normalizing and printing.
 *
 * Amounts are handled as decimal strings end to end: a floating-point number cannot represent most amounts in
 * cents exactly (0.1 + 0.2 is 0.30000000000000004). A number is only accepted when it carries at most two
 * decimals exactly.
 *
 * @module
 */

/** Largest amount of a QR-bill. */
export const MAX_AMOUNT = '999999999.99';

// Up to 15 integer digits, so that a too large amount is reported as out of range rather than as badly written.
const DECIMAL = /^(\d{1,15})(?:\.(\d{1,2}))?$/;

/**
 * Converts an integer number of cents, the way amounts should be stored, to the amount format of the QR-bill.
 *
 * @param cents - A non-negative integer: a safe integer `number` or a `bigint`.
 * @returns The amount with two decimals.
 * @throws {RangeError} When `cents` is negative, not an integer, or a `number` beyond `Number.MAX_SAFE_INTEGER`.
 * @example
 * ```ts
 * fromCents(194975); // '1949.75'
 * fromCents(5); // '0.05'
 * ```
 */
export function fromCents(cents: number | bigint): string {
  if (typeof cents === 'number' && !Number.isSafeInteger(cents)) {
    throw new RangeError(`Cents must be a safe integer, received ${cents}`);
  }
  const value = BigInt(cents);
  if (value < 0n) throw new RangeError(`Cents must not be negative, received ${String(cents)}`);
  const units = value / 100n;
  const hundredths = value % 100n;
  return `${units}.${String(hundredths).padStart(2, '0')}`;
}

/**
 * Normalizes an amount to the format of the Swiss QR Code: two decimals, "." as separator, no leading zeros.
 * The range is not checked here; see {@link validateAmount}.
 *
 * @param amount - A decimal string ("1949.75", "50") or a number with at most two decimals.
 * @returns The normalized amount, or `undefined` when the input is not an amount.
 * @example
 * ```ts
 * normalizeAmount('50'); // '50.00'
 * normalizeAmount(1949.75); // '1949.75'
 * normalizeAmount('1,50'); // undefined: "," is not a decimal separator
 * normalizeAmount(0.1 + 0.2); // undefined: 0.30000000000000004 has more than two decimals
 * ```
 */
export function normalizeAmount(amount: string | number): string | undefined {
  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) / 100 !== amount) {
      return undefined;
    }
    return normalizeAmount(amount.toFixed(2));
  }
  const match = DECIMAL.exec(amount.trim());
  if (match === null) return undefined;
  const units = String(Number(match[1]));
  const decimals = (match[2] ?? '').padEnd(2, '0');
  return `${units}.${decimals}`;
}

/**
 * Formats an amount for printing on the payment part and the receipt: a space as thousands separator, two
 * decimals (chapter 3.5.3).
 *
 * @param amount - A decimal string or a number with at most two decimals.
 * @returns The formatted amount.
 * @throws {RangeError} When `amount` is not an amount (see {@link normalizeAmount}).
 * @example
 * ```ts
 * formatAmount('1590'); // '1 590.00'
 * ```
 */
export function formatAmount(amount: string | number): string {
  const normalized = normalizeAmount(amount);
  if (normalized === undefined) throw new RangeError(`Invalid amount: ${String(amount)}`);
  const [units = '0', decimals = '00'] = normalized.split('.');
  return `${units.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${decimals}`;
}
