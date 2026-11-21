/**
 * Types of the texts printed on the invoice.
 *
 * @module
 */

/**
 * The texts of an invoice in one language. Templates contain placeholders in braces, replaced when printed:
 * `{rate}`, `{base}`, `{days}`, `{page}`, `{pages}`.
 */
export interface InvoiceLabels {
  /** Default title of the document: "Invoice". */
  readonly invoice: string;
  /** Label of the number of the invoice. */
  readonly number: string;
  /** Label of the date. */
  readonly date: string;
  /** Label of the due date. */
  readonly dueDate: string;
  /** Label of the period of the supply. */
  readonly servicePeriod: string;
  /** Label of the reference of the recipient. */
  readonly customerReference: string;
  /** Before the subject, with its punctuation: "Subject: ". */
  readonly subject: string;
  /** Column of the descriptions. */
  readonly description: string;
  /** Column of the quantities. */
  readonly quantity: string;
  /** Column of the units. */
  readonly unit: string;
  /** Column of the unit prices. */
  readonly unitPrice: string;
  /** Column of the VAT rates, and the name of the VAT. */
  readonly vat: string;
  /** Column of the amounts. */
  readonly amount: string;
  /** Sum of the lines. */
  readonly subtotal: string;
  /** VAT added: "VAT {rate} % on {base}". */
  readonly vatOn: string;
  /** VAT included: "incl. VAT {rate} % on {base}". */
  readonly vatIncluded: string;
  /** VAT given without its base: "VAT {rate} %". */
  readonly vatRate: string;
  /** The rounding to 5 centimes. */
  readonly rounding: string;
  /** The total. */
  readonly total: string;
  /** Number of the page: "Page {page}/{pages}". */
  readonly page: string;
  /** Suffix of the UID used as VAT number: MWST, TVA or IVA. */
  readonly vatNumberSuffix: string;
  /** Mention for an issuer below the VAT threshold. */
  readonly notVatRegistered: string;
  /** Mention for a supply excluded from VAT. */
  readonly vatExcluded: string;
  /** Mention of the payment term: "Payable within {days} days." */
  readonly paymentDays: string;
  /** Mention of thanks. */
  readonly thanks: string;
}
