/**
 * Validators of the creditor account: IBAN and QR-IBAN (SIX IG QR-bill v2.4, chapters 2.7 to 2.10).
 *
 * The account must be a 21-character IBAN from Switzerland (CH) or Liechtenstein (LI). It is a QR-IBAN when its
 * institution identification (IID, positions 5 to 9) lies between 30000 and 31999 (the QR-IID range).
 *
 * @module
 */

import { mod97 } from '../checksum/mod97.js';
import type { AccountStatus } from './account.types.js';
import { normalizeIBAN } from './iban.js';

const CH_LI_IBAN = /^(CH|LI)\d{2}\d{5}[0-9A-Z]{12}$/;
const QR_IID_FIRST = 30000;
const QR_IID_LAST = 31999;

/**
 * Tells whether an account is a valid IBAN for a QR-bill: Swiss or Liechtenstein, 21 characters, correct check
 * digits (ISO 7064 MOD 97-10).
 *
 * @param iban - The IBAN as typed. Spaces and case are ignored.
 * @returns `true` when the IBAN is valid, whether it is a QR-IBAN or not.
 * @example
 * ```ts
 * isValidIBAN('CH44 3199 9123 0008 8901 2'); // true
 * isValidIBAN('DE89 3704 0044 0532 0130 00'); // false: not CH or LI
 * ```
 */
export function isValidIBAN(iban: string): boolean {
  const normalized = normalizeIBAN(iban);
  if (!CH_LI_IBAN.test(normalized)) return false;
  return mod97(normalized.slice(4) + normalized.slice(0, 4)) === 1;
}

/**
 * Tells whether an IBAN is a QR-IBAN, i.e. whether its IID lies in the QR-IID range 30000–31999. Does not check
 * that the IBAN is valid: combine with {@link isValidIBAN}, or use {@link validateAccount}.
 *
 * @param iban - The IBAN as typed. Spaces and case are ignored.
 * @returns `true` for a QR-IBAN.
 * @example
 * ```ts
 * isQRIBAN('CH44 3199 9123 0008 8901 2'); // true: IID 31999
 * isQRIBAN('CH58 0079 1123 0008 8901 2'); // false: IID 00791
 * ```
 */
export function isQRIBAN(iban: string): boolean {
  const iid = Number(normalizeIBAN(iban).slice(4, 9));
  return iid >= QR_IID_FIRST && iid <= QR_IID_LAST;
}

/**
 * Validates the account of the creditor and tells which kind it is, which decides the reference to use (see
 * {@link validateReferenceForAccount}).
 *
 * @param value - The account as typed. Spaces and case are ignored; blank counts as empty.
 * @returns `iban` or `qr_iban` when valid, otherwise `required` or `invalid_iban` (see {@link AccountStatus}).
 * @example
 * ```ts
 * validateAccount('CH44 3199 9123 0008 8901 2'); // 'qr_iban'
 * validateAccount('CH58 0079 1123 0008 8901 2'); // 'iban'
 * validateAccount('CH58 0079 1123 0008 8901 3'); // 'invalid_iban': wrong check digits
 * ```
 */
export function validateAccount(value: string | null | undefined): AccountStatus {
  const iban = normalizeIBAN(value ?? '');
  if (iban === '') return 'required';
  if (!isValidIBAN(iban)) return 'invalid_iban';
  return isQRIBAN(iban) ? 'qr_iban' : 'iban';
}
