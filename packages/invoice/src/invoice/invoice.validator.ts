/**
 * Validation of an invoice. Only the form is checked: types, lengths, numbers, dates, UID, e-mail, and the QR-bill
 * of the payment part, which must be valid. What the invoice says is the issuer's business: no legal mention is
 * required. Every problem is reported at once, with a stable code and the path of the field.
 *
 * @module
 */

import {
  type Address,
  type Currency,
  type IssuePath,
  LABELS,
  type Language,
  MAX_AMOUNT,
  type QRBill,
  type QRBillInput,
  isValidCurrency,
  validateQRBill,
} from '@qr-bill/core';
import type { InvoiceTotals } from '../amounts/amounts.types.js';
import { toDecimal } from '../amounts/money.js';
import { AMOUNT_DECIMALS, MAX_CENTIMES, computeTotals, totalsToDecimals } from '../amounts/totals.js';
import { readProvidedTotals } from '../amounts/totals.validator.js';
import {
  IssueList,
  deepFreeze,
  isAbsent,
  isRecord,
  readBoolean,
  readDate,
  readLine,
  readList,
  readOption,
  readParagraph,
} from '../fields/fields.js';
import { readItems } from '../items/items.validator.js';
import { INVOICE_LABELS } from '../labels/labels.js';
import { readIssuer, readRecipient } from '../parties/parties.validator.js';
import { readTheme } from '../themes/themes.validator.js';
import type {
  AddressWindow,
  AmountFormat,
  Invoice,
  InvoiceField,
  InvoiceMentions,
  InvoiceResult,
} from './invoice.types.js';
import { INVOICE_LIMITS } from './limits.js';

/**
 * Validates and normalizes an invoice without throwing.
 *
 * Accepts `unknown`, so that a request body can be passed as is. The issuer and the recipient are checked with the
 * validators of the QR-bill, since they are also the creditor and the debtor of the payment part; the payment part
 * is checked by `validateQRBill` of `@qr-bill/core`, with the total of the invoice as its amount. Its codes are
 * reused for these fields.
 *
 * @param input - The invoice to check, normally an {@link InvoiceInput}.
 * @returns Either `{ success: true, data }`, where `data` is the normalized, frozen {@link Invoice} with its totals
 *   and its QR-bill, or `{ success: false, issues }` listing every problem found.
 * @example
 * ```ts
 * const result = validateInvoice(requestBody);
 * if (!result.success) {
 *   result.issues; // [{ code: 'invalid_uid', path: ['issuer', 'uid'], message: '…' }, …]
 * }
 * ```
 */
export function validateInvoice(input: unknown): InvoiceResult {
  if (!isRecord(input)) {
    return { success: false, issues: [{ code: 'invalid_type', path: [], message: 'Expected an invoice object' }] };
  }
  const issues = new IssueList();
  const L = INVOICE_LIMITS;

  const language = readLanguage(input['language'], issues);
  const currency = readCurrency(input['currency'], issues);
  const title = readLine(input['title'], ['title'], L.title, issues);
  const number = readLine(input['number'], ['number'], L.number, issues);
  const date = readDate(input['date'], ['date'], true, issues);
  const dueDate = readDate(input['dueDate'], ['dueDate'], false, issues);
  const servicePeriod = readLine(input['servicePeriod'], ['servicePeriod'], L.servicePeriod, issues);
  const customerReference = readLine(input['customerReference'], ['customerReference'], L.customerReference, issues);
  const extraFields = readExtraFields(input['extraFields'], issues);
  const subject = readLine(input['subject'], ['subject'], L.subject, issues);
  const introduction = readParagraph(
    input['introduction'],
    ['introduction'],
    L.introduction,
    L.introductionLines,
    issues,
  );
  const closing = readParagraph(input['closing'], ['closing'], L.closing, L.closingLines, issues);
  const issuer = readIssuer(input['issuer'], issues);
  const recipient = readRecipient(input['recipient'], issues);
  const items = readItems(input['items'], issues);
  const pricesIncludeVAT = readBoolean(input['pricesIncludeVAT'], ['pricesIncludeVAT'], issues);
  const roundTo5Centimes = readBoolean(input['roundTo5Centimes'], ['roundTo5Centimes'], issues);
  const providedTotals = readProvidedTotals(input['totals'], issues);
  const mentions = readMentions(input['mentions'], issues);
  const notes = readNotes(input['notes'], issues);
  const amountFormat = readOption<AmountFormat>(
    input['amountFormat'],
    ['amountFormat'],
    ['space', 'apostrophe'],
    issues,
  );
  const addressWindow = readOption<AddressWindow>(input['addressWindow'], ['addressWindow'], ['left', 'right'], issues);
  const theme = readTheme(input['theme'], issues);

  // The amounts: given, or computed from the lines.
  let totals: InvoiceTotals | undefined;
  let total: bigint | undefined;
  if (items !== undefined) {
    const computed = computeTotals(items.parsed, { pricesIncludeVAT, roundTo5Centimes });
    if (providedTotals === undefined) {
      totals = totalsToDecimals(computed);
      total = computed.total;
    } else {
      totals = { lines: totalsToDecimals(computed).lines, ...providedTotals.totals };
      total = providedTotals.total;
    }
    if (total < -MAX_CENTIMES || total > MAX_CENTIMES) {
      issues.add('out_of_range', ['items'], `The total must stay within ±${MAX_AMOUNT}`);
    }
  }

  // The payment part, whose amount is the total of the invoice.
  const bill = readPayment(input, { language, currency, title, number, total }, issues);

  if (
    issues.list.length > 0 ||
    language === undefined ||
    date === undefined ||
    issuer === undefined ||
    recipient === undefined ||
    items === undefined ||
    totals === undefined
  ) {
    return { success: false, issues: issues.list };
  }
  const invoice: Invoice = {
    language,
    currency: currency ?? 'CHF',
    title: title ?? INVOICE_LABELS[language].invoice,
    ...(number !== undefined && { number }),
    date,
    ...(dueDate !== undefined && { dueDate }),
    ...(servicePeriod !== undefined && { servicePeriod }),
    ...(customerReference !== undefined && { customerReference }),
    extraFields,
    ...(subject !== undefined && { subject }),
    ...(introduction !== undefined && { introduction }),
    ...(closing !== undefined && { closing }),
    issuer,
    recipient,
    lines: items.lines,
    pricesIncludeVAT: pricesIncludeVAT ?? false,
    totals,
    totalsProvided: providedTotals !== undefined,
    mentions,
    notes,
    amountFormat: amountFormat ?? 'space',
    addressWindow: addressWindow ?? 'left',
    theme,
    ...(bill !== undefined && { bill }),
  };
  return { success: true, data: deepFreeze(invoice) };
}

function readLanguage(value: unknown, issues: IssueList): Language | undefined {
  if (typeof value === 'string' && Object.hasOwn(LABELS, value)) return value as Language;
  issues.add('invalid_language', ['language'], 'Expected "de", "fr", "it", "rm" or "en"');
  return undefined;
}

function readCurrency(value: unknown, issues: IssueList): Currency | undefined {
  if (isAbsent(value)) return undefined;
  if (isValidCurrency(value)) return value;
  issues.add('invalid_currency', ['currency'], 'Currency must be "CHF" or "EUR"');
  return undefined;
}

function readExtraFields(value: unknown, issues: IssueList): InvoiceField[] {
  const L = INVOICE_LIMITS;
  return readList(value, ['extraFields'], L.extraFields, issues).flatMap((entry, index) => {
    const path = ['extraFields', index];
    if (!isRecord(entry)) {
      issues.add('invalid_type', path, 'Expected an object with a label and a value');
      return [];
    }
    const label = readLine(entry['label'], [...path, 'label'], L.extraFieldLabel, issues, true);
    const fieldValue = readLine(entry['value'], [...path, 'value'], L.extraFieldValue, issues, true);
    return label === undefined || fieldValue === undefined ? [] : [{ label, value: fieldValue }];
  });
}

function readMentions(value: unknown, issues: IssueList): InvoiceMentions {
  if (isAbsent(value)) return {};
  if (!isRecord(value)) {
    issues.add('invalid_type', ['mentions'], 'Expected an object');
    return {};
  }
  const notVatRegistered = readBoolean(value['notVatRegistered'], ['mentions', 'notVatRegistered'], issues);
  const vatExcluded = readBoolean(value['vatExcluded'], ['mentions', 'vatExcluded'], issues);
  const thanks = readBoolean(value['thanks'], ['mentions', 'thanks'], issues);
  const days = value['paymentDays'];
  let paymentDays: number | undefined;
  if (!isAbsent(days)) {
    if (typeof days === 'number' && Number.isInteger(days) && days >= 1 && days <= 365) paymentDays = days;
    else issues.add('invalid_number', ['mentions', 'paymentDays'], 'Expected a whole number of days from 1 to 365');
  }
  return {
    ...(notVatRegistered !== undefined && { notVatRegistered }),
    ...(vatExcluded !== undefined && { vatExcluded }),
    ...(paymentDays !== undefined && { paymentDays }),
    ...(thanks !== undefined && { thanks }),
  };
}

/** The free remarks, blank ones being left out. */
function readNotes(value: unknown, issues: IssueList): string[] {
  const path = ['notes'];
  const L = INVOICE_LIMITS;
  return readList(value, path, L.notes, issues).flatMap((entry, index) => {
    const note = readParagraph(entry, [...path, index], L.note, L.noteLines, issues);
    return note === undefined ? [] : [note];
  });
}

// ---- The payment part ----

/** What the payment part needs from the rest of the invoice. */
interface PaymentContext {
  readonly language: Language | undefined;
  readonly currency: Currency | undefined;
  readonly title: string | undefined;
  readonly number: string | undefined;
  readonly total: bigint | undefined;
}

/**
 * Checks the payment part with `validateQRBill`, the issuer and the recipient being the creditor and the debtor,
 * and the total the amount. A total of 0.00 is a notification (chapter 4.4): its message becomes "DO NOT USE FOR
 * PAYMENT" in the language of the invoice. A negative total (a credit note) has no payment part.
 */
function readPayment(input: Record<string, unknown>, context: PaymentContext, issues: IssueList): QRBill | undefined {
  const value = input['payment'];
  if (isAbsent(value)) return undefined;
  if (!isRecord(value)) {
    issues.add('invalid_type', ['payment'], 'Expected an object with at least an account');
    return undefined;
  }
  const issuer = isRecord(input['issuer']) ? input['issuer'] : {};
  const recipient = isRecord(input['recipient']) ? input['recipient'] : undefined;
  const { language, total } = context;
  // The amount is checked with the lines; the payment part only receives a valid one. A total of 0.00 needs the
  // language of the notification text.
  const notification = total === 0n && language !== undefined;
  const payable = total !== undefined && total > 0n && total <= MAX_CENTIMES;
  const defaultMessage =
    context.number === undefined
      ? undefined
      : `${context.title ?? INVOICE_LABELS[language ?? 'en'].invoice} ${context.number}`;
  const qrInput: Record<keyof QRBillInput, unknown> = {
    currency: context.currency ?? 'CHF',
    creditor: { ...addressFields(issuer), account: value['account'] },
    debtor: recipient === undefined ? undefined : addressFields(recipient),
    amount: total !== undefined && (payable || notification) ? toDecimal(total, AMOUNT_DECIMALS) : undefined,
    reference: value['reference'],
    message: notification ? LABELS[language].doNotUseForPayment : (value['message'] ?? defaultMessage),
    billingInformation: value['billingInformation'],
    alternativeProcedures: undefined,
  };
  const result = validateQRBill(qrInput);
  if (result.success) return total !== undefined && total < 0n ? undefined : result.data;
  for (const issue of result.issues) {
    const path = paymentPath(issue.path);
    // The addresses are checked, and reported, with the issuer and the recipient.
    if (path !== undefined) issues.add(issue.code, path, issue.message);
  }
  return undefined;
}

/** The fields of an address, as given, for the QR-bill. */
function addressFields(record: Record<string, unknown>): Record<keyof Address, unknown> {
  return {
    name: record['name'],
    street: record['street'],
    buildingNumber: record['buildingNumber'],
    postalCode: record['postalCode'],
    town: record['town'],
    country: record['country'],
  };
}

/** Where a problem of the QR-bill is in the invoice; `undefined` for the addresses, reported elsewhere. */
function paymentPath(path: IssuePath): IssuePath | undefined {
  const [first, second] = path;
  if (first === 'creditor') return second === 'account' ? ['payment', 'account'] : undefined;
  if (first === 'debtor') return undefined;
  if (first === 'currency') return ['currency'];
  return ['payment', ...path];
}
