/**
 * The Swiss business identification number (UID; IDE in French and Italian): the prefix `CHE`, eight digits and a
 * check digit, written `CHE-123.456.788`. A company registered for VAT uses it as its VAT number, followed by
 * `MWST`, `TVA` or `IVA`. The check digit is a modulo 11 with the weights 5, 4, 3, 2, 7, 6, 5, 4 (standard
 * eCH-0097).
 *
 * @module
 */

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4] as const;

/**
 * The nine digits of a UID written in a usual way: separators, spaces, lower case and a VAT suffix are accepted.
 *
 * @param value - The UID, e.g. `"CHE-123.456.788 TVA"`.
 * @returns The nine digits, or `undefined` when the value does not have the shape of a UID.
 * @example
 * ```ts
 * uidDigits('che-123.456.788 TVA'); // '123456788'
 * ```
 */
export function uidDigits(value: string): string | undefined {
  const compact = value
    .normalize('NFC')
    .toUpperCase()
    .replace(/[\s.-]/g, '')
    .replace(/(MWST|TVA|IVA)$/, '');
  return /^CHE(\d{9})$/.exec(compact)?.[1];
}

/**
 * Whether the last of nine digits is the check digit of the eight others. A remainder giving 10 means that no UID
 * uses these eight digits.
 *
 * @param digits - Nine digits, as returned by {@link uidDigits}.
 * @returns `true` when the check digit is right.
 * @example
 * ```ts
 * hasValidCheckDigit('123456788'); // true
 * ```
 */
export function hasValidCheckDigit(digits: string): boolean {
  const sum = WEIGHTS.reduce((total, weight, index) => total + weight * Number(digits[index]), 0);
  const check = (11 - (sum % 11)) % 11;
  return check !== 10 && check === Number(digits[8]);
}

/**
 * Writes a UID in its usual form, `CHE-123.456.788`.
 *
 * @param value - A UID that {@link validateUID} accepts.
 * @returns The UID with its separators, without VAT suffix.
 * @throws {RangeError} When the value is not a valid UID.
 * @example
 * ```ts
 * formatUID('che123456788'); // 'CHE-123.456.788'
 * ```
 */
export function formatUID(value: string): string {
  const digits = uidDigits(value);
  if (digits === undefined || !hasValidCheckDigit(digits)) {
    throw new RangeError(`Invalid UID: ${JSON.stringify(value)}`);
  }
  return `CHE-${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
}
