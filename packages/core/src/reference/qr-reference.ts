/**
 * Building a QR reference (SIX IG QR-bill v2.4, chapter 2.12.1 and Annex B): 26 digits of your own followed by a
 * modulo 10 recursive check digit.
 *
 * @module
 */

import { mod10Recursive } from '../checksum/mod10-recursive.js';

/** Number of digits of a QR reference, check digit included. */
export const QR_REFERENCE_LENGTH = 27;

/**
 * Builds a QR reference from a number of your own (invoice number, customer number, statement id…): left-padded
 * with zeros to 26 digits, followed by the check digit.
 *
 * @param digits - 1 to 26 digits, not all zeros. Spaces are ignored in a string.
 * @returns The 27-digit QR reference, without spaces.
 * @throws {RangeError} When `digits` is not 1 to 26 digits, or only zeros.
 * @example
 * ```ts
 * createQRReference('21 00000 00003 13947 14300 0901'); // '210000000003139471430009017'
 * createQRReference(42); // '000000000000000000000000420'
 * ```
 */
export function createQRReference(digits: string | number | bigint): string {
  const raw = typeof digits === 'string' ? digits.replace(/\s+/g, '') : String(digits);
  if (!/^\d{1,26}$/.test(raw)) {
    throw new RangeError(`A QR reference is built from 1 to 26 digits, received "${String(digits)}"`);
  }
  if (/^0+$/.test(raw)) {
    throw new RangeError('A QR reference must not consist exclusively of zeros');
  }
  const body = raw.padStart(QR_REFERENCE_LENGTH - 1, '0');
  return body + String(mod10Recursive(body));
}
