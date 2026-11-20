/**
 * Types of the limits of the fields of an invoice.
 *
 * @module
 */

/** Limits of the issuer's fields. */
export interface IssuerLimits {
  /** Name, as on the payment part. */
  readonly name: number;
  /** Street, as on the payment part. */
  readonly street: number;
  /** Building number, as on the payment part. */
  readonly buildingNumber: number;
  /** Postal code, as on the payment part. */
  readonly postalCode: number;
  /** Town, as on the payment part. */
  readonly town: number;
  /** Number of lines under the name. */
  readonly extraLines: number;
  /** One line under the name. */
  readonly extraLine: number;
  /** Number of phone numbers. */
  readonly phones: number;
  /** One phone number. */
  readonly phone: number;
  /** E-mail address. */
  readonly email: number;
  /** Free contact line. */
  readonly contact: number;
}

/** Limits of the recipient's fields. */
export interface RecipientLimits {
  /** Line above the name. */
  readonly salutation: number;
  /** Name, as on the payment part. */
  readonly name: number;
  /** Street, as on the payment part. */
  readonly street: number;
  /** Building number, as on the payment part. */
  readonly buildingNumber: number;
  /** Postal code, as on the payment part. */
  readonly postalCode: number;
  /** Town, as on the payment part. */
  readonly town: number;
  /** Number of lines under the name. */
  readonly extraLines: number;
  /** One line under the name. */
  readonly extraLine: number;
}

/** Maximum lengths, in characters (Unicode code points), and maximum numbers of lines or entries. */
export interface InvoiceLimits {
  /** Title of the document. */
  readonly title: number;
  /** Number of the invoice. */
  readonly number: number;
  /** Period of the supply. */
  readonly servicePeriod: number;
  /** Reference of the recipient. */
  readonly customerReference: number;
  /** Number of extra details. */
  readonly extraFields: number;
  /** Label of an extra detail. */
  readonly extraFieldLabel: number;
  /** Value of an extra detail. */
  readonly extraFieldValue: number;
  /** Subject. */
  readonly subject: number;
  /** Text before the lines. */
  readonly introduction: number;
  /** Lines of the text before the lines. */
  readonly introductionLines: number;
  /** Text after the totals. */
  readonly closing: number;
  /** Lines of the text after the totals. */
  readonly closingLines: number;
  /** The issuer's fields. */
  readonly issuer: IssuerLimits;
  /** The recipient's fields. */
  readonly recipient: RecipientLimits;
  /** Number of lines of the invoice. */
  readonly items: number;
  /** Description of a line. */
  readonly description: number;
  /** Lines of the description of a line. */
  readonly descriptionLines: number;
  /** Unit of a line. */
  readonly unit: number;
  /** Number of free remarks. */
  readonly notes: number;
  /** A free remark. */
  readonly note: number;
  /** Lines of a free remark. */
  readonly noteLines: number;
  /** Size of the logo file, in bytes. */
  readonly logoBytes: number;
}
