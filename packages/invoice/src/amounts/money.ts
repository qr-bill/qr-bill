/**
 * Decimal numbers of an invoice as exact integers: a quantity, a price, a rate or an amount is read into a
 * `bigint` counted in its smallest unit (cents for an amount), computed exactly, and written back as a decimal
 * string. No floating-point number ever holds money.
 *
 * @module
 */

import type { AmountFormat } from '../invoice/invoice.types.js';

/**
 * Reads a decimal number with at most a given number of decimals, as an integer in that unit: `"12.5"` with 2
 * decimals is `1250n`. A string (`"-12.50"`, surrounding spaces ignored) or a number is accepted; a number only when
 * its decimal form has at most that many decimals, so that `0.1 + 0.2` is refused.
 *
 * @param value - The number as given.
 * @param decimals - The number of decimals allowed, which is also the scale of the result.
 * @returns The scaled integer, or `undefined` when the value is not such a number.
 * @example
 * ```ts
 * parseDecimal('-12.5', 2); // -1250n
 * parseDecimal(0.1 + 0.2, 2); // undefined: 0.30000000000000004
 * ```
 */
export function parseDecimal(value: unknown, decimals: number): bigint | undefined {
  let text: string;
  if (typeof value === 'string') text = value.trim();
  else if (typeof value === 'number' && Number.isFinite(value)) text = String(value);
  else return undefined;
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (match === null) return undefined;
  const [, sign, whole, fraction = ''] = match as unknown as [string, string, string, string?];
  if (fraction.length > decimals) return undefined;
  const units = BigInt(whole + fraction.padEnd(decimals, '0'));
  return sign === '-' ? -units : units;
}

/**
 * Divides two integers, rounding half away from zero (commercial rounding): 2.5 gives 3 and -2.5 gives -3.
 *
 * @param numerator - The dividend.
 * @param denominator - The divisor, not zero.
 * @returns The rounded quotient.
 * @example
 * ```ts
 * roundDiv(5n, 2n); // 3n
 * roundDiv(-5n, 2n); // -3n
 * ```
 */
export function roundDiv(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const twice = 2n * (remainder < 0n ? -remainder : remainder);
  if (twice < (denominator < 0n ? -denominator : denominator)) return quotient;
  return numerator < 0n === denominator < 0n ? quotient + 1n : quotient - 1n;
}

/**
 * Writes a scaled integer as a decimal string with exactly that many decimals.
 *
 * @param units - The integer, e.g. cents.
 * @param scale - The number of decimals.
 * @returns The decimal string, with `-` for a negative number.
 * @example
 * ```ts
 * toDecimal(-9000n, 2); // '-90.00'
 * ```
 */
export function toDecimal(units: bigint, scale: number): string {
  const sign = units < 0n ? '-' : '';
  const digits = (units < 0n ? -units : units).toString().padStart(scale + 1, '0');
  return scale === 0 ? `${sign}${digits}` : `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

/**
 * Writes a scaled integer as a decimal string without trailing zeros after the decimal point, at least
 * `minDecimals` decimals being kept.
 *
 * @param units - The integer.
 * @param scale - Its number of decimals.
 * @param minDecimals - Decimals always kept; 0 by default.
 * @returns The shortest decimal string.
 * @example
 * ```ts
 * toShortDecimal(810n, 2); // '8.1'
 * toShortDecimal(1250000n, 4, 2); // '125.00'
 * ```
 */
export function toShortDecimal(units: bigint, scale: number, minDecimals = 0): string {
  const full = toDecimal(units, scale);
  if (scale === 0) return full;
  const [whole, fraction] = full.split('.') as [string, string];
  const kept = fraction.replace(/0+$/, '').padEnd(minDecimals, '0');
  return kept === '' ? whole : `${whole}.${kept}`;
}

/**
 * Writes an amount as it is printed on the invoice: thousands separated by a space (as on the payment part) or by
 * an apostrophe, two decimals.
 *
 * @param amount - A decimal string with two decimals, e.g. `"-1234.50"`.
 * @param format - `space` or `apostrophe`.
 * @returns The amount as printed.
 * @example
 * ```ts
 * formatMoney('-1234.50', 'space'); // '-1 234.50'
 * formatMoney('1234567.00', 'apostrophe'); // "1'234'567.00"
 * ```
 */
export function formatMoney(amount: string, format: AmountFormat): string {
  const negative = amount.startsWith('-');
  const [whole, fraction] = (negative ? amount.slice(1) : amount).split('.') as [string, string];
  const separator = format === 'space' ? ' ' : "'";
  const grouped = whole.replace(/\B(?=(\d{3})+$)/g, separator);
  return `${negative ? '-' : ''}${grouped}.${fraction}`;
}
