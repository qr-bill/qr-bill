/**
 * Modulo 10 recursive, the check digit algorithm of the QR reference (SIX IG QR-bill v2.4, Annex B).
 *
 * @module
 */

/**
 * First row of the table of Annex B. Row `n` of the table is this row shifted left by `n` positions, so the
 * value at row `carry`, column `digit` is `TABLE[(carry + digit) % 10]`.
 */
const TABLE = '0946827135';

/**
 * Computes the check digit of a string of digits with the modulo 10 recursive algorithm of Annex B.
 *
 * @param digits - Digits only: the first 26 digits of a QR reference.
 * @returns The check digit, from 0 to 9, which becomes the 27th digit of the QR reference.
 * @example
 * ```ts
 * mod10Recursive('21000000000313947143000901'); // 7, the worked example of Annex B
 * ```
 */
export function mod10Recursive(digits: string): number {
  let carry = 0;
  for (const digit of digits) {
    carry = Number(TABLE.charAt((carry + Number(digit)) % 10));
  }
  return (10 - carry) % 10;
}
