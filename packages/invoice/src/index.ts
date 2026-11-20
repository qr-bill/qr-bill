/**
 * Public API of `@qr-bill/invoice`: a Swiss invoice with its QR-bill.
 *
 * - {@link validateInvoice}: checks and normalizes the data of an invoice, computes its totals and its QR-bill.
 * - {@link computeInvoiceTotals}: the amounts alone, for a form.
 * - {@link validateUID}: the Swiss business identification number.
 * - {@link INVOICE_LIMITS}, {@link INVOICE_THEMES}: the limits of each field and the themes, for a form.
 *
 * @module
 */

export { validateInvoice } from './invoice/invoice.validator.js';
export { INVOICE_LIMITS } from './invoice/limits.js';
export type { InvoiceLimits, IssuerLimits, RecipientLimits } from './invoice/limits.types.js';
export type {
  AddressWindow,
  AmountFormat,
  Invoice,
  InvoiceField,
  InvoiceInput,
  InvoiceIssue,
  InvoiceIssueCode,
  InvoiceMentions,
  InvoicePayment,
  InvoiceResult,
} from './invoice/invoice.types.js';
export type {
  InvoiceIssuer,
  InvoiceIssuerData,
  InvoiceLogo,
  InvoiceRecipient,
  InvoiceRecipientData,
} from './parties/parties.types.js';
export type { InvoiceItem, InvoiceLine } from './items/items.types.js';
export { computeInvoiceTotals } from './amounts/totals.js';
export type {
  InvoiceProvidedTotals,
  InvoiceProvidedVAT,
  InvoiceTotals,
  InvoiceVAT,
  TotalsOptions,
} from './amounts/amounts.types.js';
export { validateUID } from './uid/uid.validator.js';
export type { UIDStatus } from './uid/uid.types.js';
export { INVOICE_THEMES } from './themes/themes.js';
export type { InvoiceTheme, InvoiceThemeData, ThemeName } from './themes/themes.types.js';
