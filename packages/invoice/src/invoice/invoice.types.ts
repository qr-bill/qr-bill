/**
 * Types of an invoice as a whole: what the caller gives ({@link InvoiceInput}), what the validation returns
 * ({@link Invoice}) and the problems it reports ({@link InvoiceIssue}).
 *
 * @module
 */

import type { Currency, IssueCode, IssuePath, Language, QRBill } from '@qr-bill/core';
import type { InvoiceProvidedTotals, InvoiceTotals } from '../amounts/amounts.types.js';
import type { InvoiceItem, InvoiceLine } from '../items/items.types.js';
import type {
  InvoiceIssuer,
  InvoiceIssuerData,
  InvoiceRecipient,
  InvoiceRecipientData,
} from '../parties/parties.types.js';
import type { InvoiceTheme, InvoiceThemeData, ThemeName } from '../themes/themes.types.js';

/** How amounts are written on the invoice: `1 234.50` (as on the payment part) or `1'234.50`. */
export type AmountFormat = 'space' | 'apostrophe';

/** Where the address of the recipient goes: in the window of the envelope on the left or on the right. */
export type AddressWindow = 'left' | 'right';

/** A label and a value printed with the details of the invoice, e.g. "Customer no." and "4711". */
export interface InvoiceField {
  /** The label, max. 25 characters. */
  readonly label: string;
  /** The value, max. 50 characters. */
  readonly value: string;
}

/** Ready-made mentions, printed in the language of the invoice. */
export interface InvoiceMentions {
  /** "Not registered for VAT", for an issuer below the VAT threshold. */
  readonly notVatRegistered?: boolean | undefined;
  /** "Supply excluded from VAT", e.g. for care, education or membership fees. */
  readonly vatExcluded?: boolean | undefined;
  /** "Payable within N days", from 1 to 365. */
  readonly paymentDays?: number | undefined;
  /** "Thank you for your trust". */
  readonly thanks?: boolean | undefined;
}

/** The payment part. Its amount is always the total of the invoice. */
export interface InvoicePayment {
  /** IBAN or QR-IBAN of the issuer, from Switzerland or Liechtenstein; spaces and lower case are accepted. */
  readonly account: string;
  /** QR reference (with a QR-IBAN) or Creditor Reference (`RF…`); optional. */
  readonly reference?: string | undefined;
  /** Message of the payment part; by default the title and the number of the invoice. Max. 140 characters. */
  readonly message?: string | undefined;
  /** Coded billing information starting with `//`, e.g. Swico; optional. */
  readonly billingInformation?: string | undefined;
}

/** The data of an invoice, as given to {@link validateInvoice}. */
export interface InvoiceInput {
  /** Language of the invoice and of its payment part. */
  readonly language: Language;
  /** `CHF` (default) or `EUR`. */
  readonly currency?: Currency | undefined;
  /** Title of the document; "Invoice" in the language of the invoice by default. Max. 35 characters. */
  readonly title?: string | undefined;
  /** Number of the invoice, max. 35 characters. */
  readonly number?: string | undefined;
  /** Date of the invoice, as `YYYY-MM-DD`. */
  readonly date: string;
  /** Due date, as `YYYY-MM-DD`. */
  readonly dueDate?: string | undefined;
  /** Period of the supply, as it should be printed, e.g. "November 2026"; max. 50 characters. */
  readonly servicePeriod?: string | undefined;
  /** The reference of the recipient, e.g. an order number; max. 35 characters. */
  readonly customerReference?: string | undefined;
  /** Up to 3 more details, e.g. a customer number. */
  readonly extraFields?: readonly InvoiceField[] | undefined;
  /** Subject, max. 140 characters. */
  readonly subject?: string | undefined;
  /** Text before the lines, max. 1000 characters and 10 lines. */
  readonly introduction?: string | undefined;
  /** Text after the totals, max. 1000 characters and 10 lines. */
  readonly closing?: string | undefined;
  /** Who issues the invoice. */
  readonly issuer: InvoiceIssuer;
  /** Who receives it. */
  readonly recipient: InvoiceRecipient;
  /** The lines, from 1 to 1000. */
  readonly items: readonly InvoiceItem[];
  /** Whether the prices include VAT; by default they do not, and the VAT is added. */
  readonly pricesIncludeVAT?: boolean | undefined;
  /** Whether the total is rounded to 5 centimes, with a rounding line. */
  readonly roundTo5Centimes?: boolean | undefined;
  /** Totals computed elsewhere, printed as they are instead of being computed. */
  readonly totals?: InvoiceProvidedTotals | undefined;
  /** Ready-made mentions. */
  readonly mentions?: InvoiceMentions | undefined;
  /** Up to 3 free remarks, max. 300 characters and 4 lines each. */
  readonly notes?: readonly string[] | undefined;
  /** The payment part; without it, the invoice has none. */
  readonly payment?: InvoicePayment | undefined;
  /** How amounts are written; `space` by default. */
  readonly amountFormat?: AmountFormat | undefined;
  /** Where the address of the recipient goes; `left` by default. */
  readonly addressWindow?: AddressWindow | undefined;
  /** The look of the invoice, or the name of a theme. */
  readonly theme?: InvoiceTheme | ThemeName | undefined;
}

/** A valid invoice, normalized and frozen, with its totals and its QR-bill: what is printed. */
export interface Invoice {
  /** Language. */
  readonly language: Language;
  /** Currency. */
  readonly currency: Currency;
  /** Title, the default one if none was given. */
  readonly title: string;
  /** Number. */
  readonly number?: string;
  /** Date, `YYYY-MM-DD`. */
  readonly date: string;
  /** Due date, `YYYY-MM-DD`. */
  readonly dueDate?: string;
  /** Period of the supply. */
  readonly servicePeriod?: string;
  /** Reference of the recipient. */
  readonly customerReference?: string;
  /** More details. */
  readonly extraFields: readonly InvoiceField[];
  /** Subject. */
  readonly subject?: string;
  /** Text before the lines. */
  readonly introduction?: string;
  /** Text after the totals. */
  readonly closing?: string;
  /** Issuer. */
  readonly issuer: InvoiceIssuerData;
  /** Recipient. */
  readonly recipient: InvoiceRecipientData;
  /** Lines. */
  readonly lines: readonly InvoiceLine[];
  /** Whether the prices include VAT. */
  readonly pricesIncludeVAT: boolean;
  /** Amounts, computed or given. */
  readonly totals: InvoiceTotals;
  /** Whether the totals were given rather than computed. */
  readonly totalsProvided: boolean;
  /** Ready-made mentions. */
  readonly mentions: InvoiceMentions;
  /** Free remarks. */
  readonly notes: readonly string[];
  /** How amounts are written. */
  readonly amountFormat: AmountFormat;
  /** Where the address of the recipient goes. */
  readonly addressWindow: AddressWindow;
  /** The theme, and its accent colour if one was given. */
  readonly theme: InvoiceThemeData;
  /** The QR-bill of the payment part: absent without payment, or when the total is negative (a credit note). */
  readonly bill?: QRBill;
}

/**
 * What a problem is. The codes of the QR-bill ({@link IssueCode}) are reused for the fields of the payment part
 * and of the addresses; the others are specific to the invoice. Stable: clients may translate them.
 */
export type InvoiceIssueCode =
  | IssueCode
  | 'too_many'
  | 'too_many_lines'
  | 'invalid_language'
  | 'invalid_date'
  | 'invalid_number'
  | 'out_of_range'
  | 'invalid_uid'
  | 'invalid_email'
  | 'invalid_option'
  | 'invalid_color'
  | 'unsupported_logo'
  | 'logo_too_large';

/** A problem found in an invoice. */
export interface InvoiceIssue {
  /** What the problem is; stable (see {@link InvoiceIssueCode}). */
  readonly code: InvoiceIssueCode;
  /** Where the problem is, e.g. `["items", 2, "unitPrice"]`; empty for the invoice as a whole. */
  readonly path: IssuePath;
  /** Explanation in English, for logs and developers. */
  readonly message: string;
}

/** Result of {@link validateInvoice}: the invoice, or every problem found. */
export type InvoiceResult =
  | {
      /** The invoice is valid. */
      readonly success: true;
      /** The normalized, frozen invoice. */
      readonly data: Invoice;
    }
  | {
      /** The invoice is not valid. */
      readonly success: false;
      /** Every problem found. */
      readonly issues: readonly InvoiceIssue[];
    };
