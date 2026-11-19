/**
 * ISO 7064 MOD 97-10, the check digit algorithm shared by the IBAN (ISO 13616) and the Creditor Reference
 * (ISO 11649).
 *
 * @module
 */

const CODE_0 = 48; // '0'
const CODE_A = 65; // 'A'

/**
 * Computes the remainder of an alphanumeric string divided by 97, each letter counting as two digits: A = 10,
 * B = 11… Z = 35.
 *
 * The division is done digit by digit, so the result is exact whatever the length of the string.
 *
 * @param value - Digits and upper-case letters only.
 * @returns A number from 0 to 96. An IBAN or a Creditor Reference whose first four characters are moved to the
 *   end gives 1 when its check digits are correct.
 * @example
 * ```ts
 * mod97('00791123000889012CH58'); // 1, so CH58 0079 1123 0008 8901 2 is a valid IBAN
 * ```
 */
export function mod97(value: string): number {
  let remainder = 0;
  for (const char of value) {
    const code = char.charCodeAt(0);
    const digits = code >= CODE_A ? String(code - CODE_A + 10) : char;
    for (const digit of digits) {
      remainder = (remainder * 10 + digit.charCodeAt(0) - CODE_0) % 97;
    }
  }
  return remainder;
}
