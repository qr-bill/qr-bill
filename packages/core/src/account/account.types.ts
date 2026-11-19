/**
 * Types of the creditor account.
 *
 * @module
 */

/**
 * The two kinds of account of a QR-bill (SIX IG QR-bill v2.4, chapters 2.9, 2.10 and 4.3.2).
 *
 * - `iban`: a regular IBAN, used with a Creditor Reference (SCOR) or without reference, in CHF or EUR.
 * - `qr_iban`: a QR-IBAN, used with a QR reference (QRR) only, in CHF only.
 */
export type AccountType = 'iban' | 'qr_iban';

/**
 * Result of the validation of an account: its {@link AccountType} when it is valid, otherwise the problem.
 *
 * - `required`: empty or blank.
 * - `invalid_iban`: not a 21-character IBAN from Switzerland (CH) or Liechtenstein (LI) with correct check digits.
 */
export type AccountStatus = AccountType | 'required' | 'invalid_iban';
