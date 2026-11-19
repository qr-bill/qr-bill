/**
 * Normalizing and printing an IBAN (SIX IG QR-bill v2.4, chapters 2.9 and 3.5.4).
 *
 * @module
 */

/**
 * Normalizes an IBAN the way it is written in the Swiss QR Code: without spaces, in upper case.
 *
 * @param iban - An IBAN as typed or printed.
 * @returns The IBAN without spaces, in upper case. It is not validated.
 * @example
 * ```ts
 * normalizeIBAN('ch44 3199 9123 0008 8901 2'); // 'CH4431999123000889012'
 * ```
 */
export function normalizeIBAN(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

/**
 * Formats an IBAN for printing on the payment part and the receipt: groups of four characters.
 *
 * @param iban - An IBAN, with or without spaces.
 * @returns The IBAN in groups of four, the last group being shorter.
 * @example
 * ```ts
 * formatIBAN('CH4431999123000889012'); // 'CH44 3199 9123 0008 8901 2'
 * ```
 */
export function formatIBAN(iban: string): string {
  return normalizeIBAN(iban).replace(/(.{4})(?=.)/g, '$1 ');
}
