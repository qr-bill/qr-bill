/**
 * Validator of the Swiss business identification number (UID).
 *
 * @module
 */

import { hasValidCheckDigit, uidDigits } from './uid.js';
import type { UIDStatus } from './uid.types.js';

/**
 * Validates a Swiss business identification number (UID): its shape and its check digit. Separators, spaces, lower
 * case and a VAT suffix (`MWST`, `TVA`, `IVA`) are accepted. Blank counts as missing.
 *
 * @param value - The UID as typed.
 * @returns `'valid'`, `'required'` when blank, or `'invalid_uid'`.
 * @example
 * ```ts
 * validateUID('CHE-123.456.788'); // 'valid'
 * validateUID('che 123 456 788 tva'); // 'valid'
 * validateUID('CHE-123.456.789'); // 'invalid_uid': wrong check digit
 * validateUID('  '); // 'required'
 * ```
 */
export function validateUID(value: string | null | undefined): UIDStatus {
  const text = (value ?? '').trim();
  if (text === '') return 'required';
  const digits = uidDigits(text);
  return digits !== undefined && hasValidCheckDigit(digits) ? 'valid' : 'invalid_uid';
}
