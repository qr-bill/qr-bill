/**
 * Types of a whole QR-bill: what you pass in, what you get back, and how problems are reported.
 *
 * @module
 */

import type { Address, Creditor } from '../address/address.types.js';
import type { Currency } from '../amount/amount.types.js';
import type { ReferenceType } from '../reference/reference.types.js';

/**
 * What you pass to {@link createQRBill} or {@link validateQRBill}. Every text is trimmed and normalized.
 */
export interface QRBillInput {
  /** "CHF" or "EUR". */
  currency: Currency;
  /** Account and address of the creditor, who receives the payment. */
  creditor: Creditor;
  /**
   * Amount to pay. A decimal string ("1949.75") is the safest; use {@link fromCents} if you store cents. A number
   * is accepted only when it has at most two decimals exactly. Leave out to let the debtor write it by hand.
   */
  amount?: string | number | undefined;
  /** Address of the debtor, who pays. Leave out to let the debtor write it by hand. */
  debtor?: Address | undefined;
  /**
   * QR reference (27 digits; requires a QR-IBAN and CHF) or Creditor Reference ("RF…"; requires a regular IBAN).
   * Spaces are accepted. Leave out for no reference.
   */
  reference?: string | undefined;
  /** Unstructured message, printed under "Additional information". Max. 140 characters. */
  message?: string | undefined;
  /** Coded billing information starting with "//", e.g. Swico "//S1/…". Max. 140 characters with the message. */
  billingInformation?: string | undefined;
  /** Up to two alternative procedures, e.g. "eBill/B/…", max. 100 characters each. Blank entries are ignored. */
  alternativeProcedures?: readonly string[] | undefined;
}

/** A validated, normalized QR-bill, ready to be printed. Immutable (deeply frozen). */
export interface QRBill {
  /** "CHF" or "EUR". */
  readonly currency: Currency;
  /** The creditor; the account is without spaces, in upper case, and the country in upper case. */
  readonly creditor: Readonly<Creditor>;
  /** Amount with two decimals ("1949.75"); absent when the debtor writes it by hand. */
  readonly amount?: string;
  /** The debtor; absent when the debtor writes it by hand. */
  readonly debtor?: Readonly<Address>;
  /** Type of the reference: QRR, SCOR or NON. */
  readonly referenceType: ReferenceType;
  /** Reference without spaces, in upper case; absent for type NON. */
  readonly reference?: string;
  /** Unstructured message. */
  readonly message?: string;
  /** Coded billing information. */
  readonly billingInformation?: string;
  /** Alternative procedures, empty when there are none. */
  readonly alternativeProcedures: readonly string[];
  /** Content of the Swiss QR Code, ready to be encoded in the QR code. */
  readonly payload: string;
}

/**
 * Stable issue codes. Clients can rely on them (to translate messages, highlight form fields, map API errors);
 * the English messages that come with them may change.
 *
 * - `invalid_type`: a value of the wrong type, e.g. a number for a name.
 * - `required`: a mandatory field is empty or blank.
 * - `too_long`: a text exceeds its maximum length.
 * - `invalid_characters`: a text contains characters outside the character set (chapter 4.1.1).
 * - `invalid_currency`: the currency is neither "CHF" nor "EUR".
 * - `invalid_country`: not a two-letter ISO 3166-1 country code.
 * - `invalid_iban`: not a valid CH or LI IBAN.
 * - `invalid_amount`: not an amount with at most two decimals and "." as separator.
 * - `amount_out_of_range`: above 999 999 999.99, or 0.00 without a "DO NOT USE FOR PAYMENT" message.
 * - `invalid_reference`: neither a valid QR reference nor a valid Creditor Reference.
 * - `qr_reference_requires_qr_iban`: a QR reference with a regular IBAN.
 * - `qr_iban_requires_qr_reference`: a QR-IBAN without a QR reference.
 * - `qr_iban_requires_chf`: a QR-IBAN with a currency other than CHF (since v2.4).
 * - `additional_information_too_long`: message and billing information together exceed 140 characters.
 * - `invalid_billing_information`: billing information that does not start with "//" and a syntax code.
 * - `too_many_alternative_procedures`: more than two alternative procedures.
 * - `payload_too_long`: the Swiss QR Code content exceeds 997 bytes.
 * - `invalid_payload`: content read by {@link parseQRBill} that is not a Swiss QR Code.
 */
export type IssueCode =
  | 'invalid_type'
  | 'required'
  | 'too_long'
  | 'invalid_characters'
  | 'invalid_currency'
  | 'invalid_country'
  | 'invalid_iban'
  | 'invalid_amount'
  | 'amount_out_of_range'
  | 'invalid_reference'
  | 'qr_reference_requires_qr_iban'
  | 'qr_iban_requires_qr_reference'
  | 'qr_iban_requires_chf'
  | 'additional_information_too_long'
  | 'invalid_billing_information'
  | 'too_many_alternative_procedures'
  | 'payload_too_long'
  | 'invalid_payload';

/** Where a problem is, as property names and array indexes, e.g. `["creditor", "account"]`. */
export type IssuePath = readonly (string | number)[];

/** A problem found in a QR-bill. */
export interface QRBillIssue {
  /** What the problem is; stable (see {@link IssueCode}). */
  readonly code: IssueCode;
  /** Where the problem is. Empty for the bill as a whole. */
  readonly path: IssuePath;
  /** Explanation in English, for logs and developers. */
  readonly message: string;
}

/** Result of {@link validateQRBill}: the bill, or every problem found. */
export type QRBillResult =
  | {
      /** The bill is valid. */
      readonly success: true;
      /** The normalized, frozen bill. */
      readonly data: QRBill;
    }
  | {
      /** The bill is invalid. */
      readonly success: false;
      /** Every problem found, in the order of the fields. */
      readonly issues: readonly QRBillIssue[];
    };

/** How to write the content of the Swiss QR Code. */
export interface PayloadOptions {
  /** Line separator: both are allowed by the standard (chapter 4.1.4); LF keeps the QR code smaller. Default: LF. */
  readonly lineEnding?: '\n' | '\r\n';
}

/**
 * Result of {@link validateReferenceForAccount}.
 *
 * - `valid`: the reference fits the account.
 * - `qr_iban_requires_qr_reference`: a QR-IBAN is used without a QR reference.
 * - `qr_reference_requires_qr_iban`: a QR reference is used with a regular IBAN.
 */
export type ReferenceForAccountStatus = 'valid' | 'qr_iban_requires_qr_reference' | 'qr_reference_requires_qr_iban';
