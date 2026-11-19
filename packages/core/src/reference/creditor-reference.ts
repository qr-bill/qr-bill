/**
 * Building a Creditor Reference (ISO 11649, SIX IG QR-bill v2.4, chapter 2.12.2): "RF", 2 check digits
 * (ISO 7064 MOD 97-10), then 1 to 21 letters or digits of your own.
 *
 * @module
 */

import { mod97 } from '../checksum/mod97.js';
import { normalizeReference } from './reference.js';

/**
 * Builds a Creditor Reference from an identifier of your own.
 *
 * @param body - 1 to 21 letters or digits. Spaces and case are ignored in a string.
 * @returns The Creditor Reference, without spaces, in upper case.
 * @throws {RangeError} When `body` is not 1 to 21 letters or digits.
 * @example
 * ```ts
 * createCreditorReference('539007547034'); // 'RF18539007547034'
 * ```
 */
export function createCreditorReference(body: string | number | bigint): string {
  const raw = typeof body === 'string' ? normalizeReference(body) : String(body);
  if (!/^[0-9A-Z]{1,21}$/.test(raw)) {
    throw new RangeError(`A Creditor Reference is built from 1 to 21 letters or digits, received "${String(body)}"`);
  }
  const checkDigits = 98 - mod97(`${raw}RF00`);
  return `RF${String(checkDigits).padStart(2, '0')}${raw}`;
}
