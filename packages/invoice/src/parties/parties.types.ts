/**
 * Types of the issuer and the recipient of an invoice: as given, and normalized by the validation.
 *
 * @module
 */

import type { Address } from '@qr-bill/core';

/**
 * The issuer of the invoice, who receives the payment. Its name and address are also the creditor of the payment
 * part: they follow the rules of the QR-bill (structured address, character set).
 */
export interface InvoiceIssuer extends Address {
  /**
   * The logo, as the bytes of a PNG or JPEG file, max. 2 MB. It is fitted in a box of 50 × 18 mm and embedded as it
   * is: about 591 × 213 pixels (300 dpi) is the best size, a larger image only makes the PDF heavier.
   */
  readonly logo?: Uint8Array | undefined;
  /** Up to 2 lines printed under the name on the invoice only, e.g. a department; max. 70 characters each. */
  readonly extraLines?: readonly string[] | undefined;
  /** Up to 2 phone numbers, as they should be printed; max. 30 characters each. */
  readonly phones?: readonly string[] | undefined;
  /** E-mail address, max. 70 characters. */
  readonly email?: string | undefined;
  /** A free line for another contact, e.g. a website; max. 70 characters. */
  readonly contact?: string | undefined;
  /** The Swiss business identification number (UID), e.g. `CHE-123.456.788`; its check digit is verified. */
  readonly uid?: string | undefined;
  /** Whether the issuer is registered for VAT: the UID is then printed as its VAT number (`CHE-123.456.788 TVA`). */
  readonly vatRegistered?: boolean | undefined;
}

/**
 * The recipient of the invoice, who pays. Its name and address are also the debtor of the payment part: they follow
 * the rules of the QR-bill (structured address, character set).
 */
export interface InvoiceRecipient extends Address {
  /** A line above the name, e.g. "Madame"; max. 35 characters. */
  readonly salutation?: string | undefined;
  /** Up to 2 lines under the name on the invoice only, e.g. a department or "c/o"; max. 70 characters each. */
  readonly extraLines?: readonly string[] | undefined;
}

/** A logo, with its format recognized from its first bytes. */
export interface InvoiceLogo {
  /** The format of the file. */
  readonly format: 'png' | 'jpeg';
  /** The bytes of the file. */
  readonly bytes: Uint8Array;
}

/** The issuer of a valid invoice, normalized. */
export interface InvoiceIssuerData extends Address {
  /** The logo. */
  readonly logo?: InvoiceLogo;
  /** Lines under the name. */
  readonly extraLines: readonly string[];
  /** Phone numbers. */
  readonly phones: readonly string[];
  /** E-mail address. */
  readonly email?: string;
  /** Free contact line. */
  readonly contact?: string;
  /** UID, formatted as `CHE-123.456.788`. */
  readonly uid?: string;
  /** Whether the issuer is registered for VAT. */
  readonly vatRegistered: boolean;
}

/** The recipient of a valid invoice, normalized. */
export interface InvoiceRecipientData extends Address {
  /** Line above the name. */
  readonly salutation?: string;
  /** Lines under the name. */
  readonly extraLines: readonly string[];
}
