/**
 * Validators of the additional information (SIX IG QR-bill v2.4, chapters 4.2.2 and 4.3.3): the unstructured
 * message, the billing information and the alternative procedures.
 *
 * The message and the billing information together must not exceed 140 characters, a rule on two fields checked
 * by {@link isAdditionalInformationWithinLimit}.
 *
 * @module
 */

import { normalizeText } from '../text/charset.js';
import type { OptionalTextStatus } from '../text/text.types.js';
import { validateOptionalText } from '../text/text.validator.js';
import type { BillingInformationStatus } from './additional-information.types.js';

/** Maximum length of the message, of the billing information, and of both together, in characters. */
export const ADDITIONAL_INFORMATION_MAX_LENGTH = 140;

/** Maximum length of one alternative procedure, in characters. */
export const ALTERNATIVE_PROCEDURE_MAX_LENGTH = 100;

/** Maximum number of alternative procedures. */
export const MAX_ALTERNATIVE_PROCEDURES = 2;

/**
 * Validates the unstructured message, printed under "Additional information". Optional, max. 140 characters.
 *
 * @param value - The message as typed. Surrounding spaces are ignored.
 * @returns `valid` (also when empty), or the first problem found (see {@link OptionalTextStatus}).
 * @example
 * ```ts
 * validateMessage('Order of 15 October 2026'); // 'valid'
 * validateMessage('Order – October'); // 'invalid_characters': "–" (en dash) is not allowed
 * ```
 */
export function validateMessage(value: string | null | undefined): OptionalTextStatus {
  return validateOptionalText(value, ADDITIONAL_INFORMATION_MAX_LENGTH);
}

/**
 * Validates the billing information: coded information for the debtor's accounting, starting with "//" and the
 * two-character code of its syntax, e.g. "//S1/10/10201409/11/190512" for Swico (chapter 4.3.3, Annex D).
 * Optional, max. 140 characters.
 *
 * @param value - The billing information. Surrounding spaces are ignored.
 * @returns `valid` (also when empty), or the first problem found, in this order: `invalid_billing_information`,
 *   `invalid_characters`, `too_long` (see {@link BillingInformationStatus}).
 */
export function validateBillingInformation(value: string | null | undefined): BillingInformationStatus {
  const text = normalizeText(value ?? '');
  if (text !== '' && !/^\/\/[0-9A-Za-z]{2}/.test(text)) return 'invalid_billing_information';
  return validateOptionalText(text, ADDITIONAL_INFORMATION_MAX_LENGTH);
}

/**
 * Validates one alternative procedure, e.g. "eBill/B/peter@sample.ch". Max. 100 characters. A bill carries at
 * most {@link MAX_ALTERNATIVE_PROCEDURES} of them.
 *
 * @param value - The alternative procedure. Surrounding spaces are ignored; empty means none.
 * @returns `valid` (also when empty), or the first problem found (see {@link OptionalTextStatus}).
 */
export function validateAlternativeProcedure(value: string | null | undefined): OptionalTextStatus {
  return validateOptionalText(value, ALTERNATIVE_PROCEDURE_MAX_LENGTH);
}
