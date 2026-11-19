/**
 * Types of the payment reference.
 *
 * @module
 */

/**
 * Reference type of the Swiss QR Code (SIX IG QR-bill v2.4, chapter 4.2.2, table 8, "Reference type").
 *
 * - `QRR`: QR reference, 27 digits; requires a QR-IBAN and CHF.
 * - `SCOR`: Creditor Reference (ISO 11649), "RF" followed by 2 check digits and up to 21 letters or digits;
 *   requires a regular IBAN.
 * - `NON`: no reference.
 */
export type ReferenceType = 'QRR' | 'SCOR' | 'NON';

/**
 * Result of the validation of a reference: its {@link ReferenceType} when it is valid (`NON` when empty),
 * otherwise `invalid_reference`.
 */
export type ReferenceStatus = ReferenceType | 'invalid_reference';
