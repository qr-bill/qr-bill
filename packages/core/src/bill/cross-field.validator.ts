/**
 * Validators of the rules that involve several fields (SIX IG QR-bill v2.4, chapters 4.3.2, 4.3.3 and 4.4). A form
 * calls them once the fields involved are valid on their own.
 *
 * @module
 */

import type { AccountType } from '../account/account.types.js';
import { ADDITIONAL_INFORMATION_MAX_LENGTH } from '../additional-information/additional-information.validator.js';
import type { Currency } from '../amount/amount.types.js';
import { DO_NOT_USE_FOR_PAYMENT } from '../labels/labels.js';
import type { ReferenceType } from '../reference/reference.types.js';
import { normalizeText } from '../text/charset.js';
import { characterCount } from '../text/text.validator.js';
import type { ReferenceForAccountStatus } from './bill.types.js';

/**
 * Checks that the reference fits the account (chapter 4.3.2): a QR-IBAN requires a QR reference, and a QR
 * reference requires a QR-IBAN. A regular IBAN goes with a Creditor Reference or no reference.
 *
 * @param account - The kind of account, as returned by {@link validateAccount}.
 * @param reference - The type of reference, as returned by {@link validateReference}.
 * @returns `valid`, or which way the combination is wrong (see {@link ReferenceForAccountStatus}).
 * @example
 * ```ts
 * validateReferenceForAccount('qr_iban', 'QRR'); // 'valid'
 * validateReferenceForAccount('qr_iban', 'NON'); // 'qr_iban_requires_qr_reference'
 * validateReferenceForAccount('iban', 'QRR'); // 'qr_reference_requires_qr_iban'
 * ```
 */
export function validateReferenceForAccount(account: AccountType, reference: ReferenceType): ReferenceForAccountStatus {
  if (account === 'qr_iban') return reference === 'QRR' ? 'valid' : 'qr_iban_requires_qr_reference';
  return reference === 'QRR' ? 'qr_reference_requires_qr_iban' : 'valid';
}

/**
 * Checks that the currency fits the account: since v2.4, a QR-IBAN (and so a QR reference) is reserved for CHF
 * (chapter 4.3.2). A regular IBAN accepts CHF and EUR.
 *
 * @param account - The kind of account, as returned by {@link validateAccount}.
 * @param currency - "CHF" or "EUR".
 * @returns `false` for a QR-IBAN in EUR.
 */
export function isCurrencyAllowedForAccount(account: AccountType, currency: Currency): boolean {
  return account === 'iban' || currency === 'CHF';
}

/**
 * Checks that the message and the billing information together do not exceed 140 characters (chapter 4.3.3).
 *
 * @param message - The unstructured message, as typed.
 * @param billingInformation - The billing information, as typed.
 * @returns `true` when both fit together. Surrounding spaces do not count.
 */
export function isAdditionalInformationWithinLimit(
  message: string | null | undefined,
  billingInformation: string | null | undefined,
): boolean {
  const total = characterCount(normalizeText(message ?? '')) + characterCount(normalizeText(billingInformation ?? ''));
  return total <= ADDITIONAL_INFORMATION_MAX_LENGTH;
}

/**
 * Checks that the amount 0.00 is allowed: only for a notification whose message is "DO NOT USE FOR PAYMENT" in
 * one of the five languages, in capital letters (chapter 4.4, table 10).
 *
 * @param message - The unstructured message, as typed.
 * @returns `true` when the message is one of {@link DO_NOT_USE_FOR_PAYMENT}.
 * @example
 * ```ts
 * isZeroAmountAllowed('NE PAS UTILISER POUR LE PAIEMENT'); // true
 * isZeroAmountAllowed('Ne pas utiliser pour le paiement'); // false: must be in capital letters
 * ```
 */
export function isZeroAmountAllowed(message: string | null | undefined): boolean {
  return DO_NOT_USE_FOR_PAYMENT.includes(normalizeText(message ?? ''));
}
