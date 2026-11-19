/**
 * Validators of the payment reference (SIX IG QR-bill v2.4, chapters 2.12 and 4.3.2, Annex B).
 *
 * Whether a reference fits the account is a separate rule, {@link validateReferenceForAccount}.
 *
 * @module
 */

import { mod10Recursive } from '../checksum/mod10-recursive.js';
import { mod97 } from '../checksum/mod97.js';
import { normalizeReference } from './reference.js';
import type { ReferenceStatus } from './reference.types.js';

const QR_REFERENCE = /^\d{27}$/;
const CREDITOR_REFERENCE = /^RF\d{2}[0-9A-Z]{1,21}$/;

/**
 * Tells whether a QR reference is valid: 27 digits, not all zeros, correct modulo 10 recursive check digit.
 *
 * @param reference - The reference as typed. Spaces are ignored.
 * @returns `true` for a valid QR reference.
 * @example
 * ```ts
 * isValidQRReference('21 00000 00003 13947 14300 09017'); // true
 * isValidQRReference('21 00000 00003 13947 14300 09018'); // false: wrong check digit
 * ```
 */
export function isValidQRReference(reference: string): boolean {
  const normalized = normalizeReference(reference);
  if (!QR_REFERENCE.test(normalized) || /^0+$/.test(normalized)) return false;
  return mod10Recursive(normalized.slice(0, 26)) === Number(normalized[26]);
}

/**
 * Tells whether a Creditor Reference (ISO 11649) is valid: "RF", 2 check digits, 1 to 21 letters or digits,
 * correct MOD 97-10 check digits.
 *
 * @param reference - The reference as typed. Spaces and case are ignored.
 * @returns `true` for a valid Creditor Reference.
 * @example
 * ```ts
 * isValidCreditorReference('RF18 5390 0754 7034'); // true
 * isValidCreditorReference('RF19 5390 0754 7034'); // false: wrong check digits
 * ```
 */
export function isValidCreditorReference(reference: string): boolean {
  const normalized = normalizeReference(reference);
  if (!CREDITOR_REFERENCE.test(normalized)) return false;
  return mod97(normalized.slice(4) + normalized.slice(0, 4)) === 1;
}

/**
 * Validates a payment reference and tells its type.
 *
 * @param value - The reference as typed. Spaces and case are ignored; blank counts as empty.
 * @returns `QRR` or `SCOR` for a valid reference, `NON` when empty, otherwise `invalid_reference` (see
 *   {@link ReferenceStatus}).
 * @example
 * ```ts
 * validateReference('21 00000 00003 13947 14300 09017'); // 'QRR'
 * validateReference('RF18 5390 0754 7034'); // 'SCOR'
 * validateReference(''); // 'NON'
 * validateReference('INV-2026-11'); // 'invalid_reference'
 * ```
 */
export function validateReference(value: string | null | undefined): ReferenceStatus {
  const reference = normalizeReference(value ?? '');
  if (reference === '') return 'NON';
  if (isValidQRReference(reference)) return 'QRR';
  if (isValidCreditorReference(reference)) return 'SCOR';
  return 'invalid_reference';
}
