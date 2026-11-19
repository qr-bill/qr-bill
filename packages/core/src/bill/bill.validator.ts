/**
 * Validation of a whole QR-bill: every field with the validator of its domain, then the rules that involve several
 * fields, then the size of the Swiss QR Code. Every problem is reported at once, with a stable code and the path
 * of the field.
 *
 * @module
 */

import type { AccountType } from '../account/account.types.js';
import { validateAccount } from '../account/account.validator.js';
import { normalizeIBAN } from '../account/iban.js';
import type { BillingInformationStatus } from '../additional-information/additional-information.types.js';
import {
  ADDITIONAL_INFORMATION_MAX_LENGTH,
  ALTERNATIVE_PROCEDURE_MAX_LENGTH,
  MAX_ALTERNATIVE_PROCEDURES,
  validateAlternativeProcedure,
  validateBillingInformation,
  validateMessage,
} from '../additional-information/additional-information.validator.js';
import type { Address } from '../address/address.types.js';
import {
  ADDRESS_MAX_LENGTH,
  validateBuildingNumber,
  validateCountry,
  validateName,
  validatePostalCode,
  validateStreet,
  validateTown,
} from '../address/address.validator.js';
import { normalizeCountry } from '../address/countries.js';
import { MAX_AMOUNT, normalizeAmount } from '../amount/amount.js';
import type { Currency } from '../amount/amount.types.js';
import { isValidCurrency, validateAmount } from '../amount/amount.validator.js';
import { normalizeReference } from '../reference/reference.js';
import type { ReferenceType } from '../reference/reference.types.js';
import { validateReference } from '../reference/reference.validator.js';
import { findInvalidCharacters, normalizeText } from '../text/charset.js';
import type { TextStatus } from '../text/text.types.js';
import { characterCount } from '../text/text.validator.js';
import { utf8Length } from '../text/utf8.js';
import type { IssueCode, IssuePath, PayloadOptions, QRBill, QRBillIssue, QRBillResult } from './bill.types.js';
import {
  isAdditionalInformationWithinLimit,
  isCurrencyAllowedForAccount,
  isZeroAmountAllowed,
  validateReferenceForAccount,
} from './cross-field.validator.js';
import { MAX_PAYLOAD_BYTES, encodePayload } from './payload.js';

/**
 * Validates and normalizes a QR-bill without throwing.
 *
 * Accepts `unknown`, so that a request body can be passed as is. Each field is checked by the validator of its
 * domain ({@link validateName}, {@link validateAccount}, {@link validateAmount}…), so a form validated field by
 * field with those functions is accepted here.
 *
 * @param input - The bill to check, normally a {@link QRBillInput}.
 * @param options - How to write the content of the Swiss QR Code.
 * @returns Either `{ success: true, data }`, where `data` is the normalized, frozen {@link QRBill}, or
 *   `{ success: false, issues }` listing every problem found.
 * @example
 * ```ts
 * const result = validateQRBill(requestBody);
 * if (!result.success) {
 *   result.issues; // [{ code: 'qr_iban_requires_chf', path: ['currency'], message: '…' }, …]
 * }
 * ```
 */
export function validateQRBill(input: unknown, options: PayloadOptions = {}): QRBillResult {
  if (!isRecord(input)) {
    return { success: false, issues: [{ code: 'invalid_type', path: [], message: 'Expected a QR-bill object' }] };
  }
  const issues = new IssueList();

  // Each field, with the validator of its domain.
  const currency = readCurrency(input['currency'], issues);
  const creditor = readCreditor(input['creditor'], issues);
  const account = readAccount(input['creditor'], issues);
  const debtor = readDebtor(input['debtor'], issues);
  const amount = readAmount(input['amount'], issues);
  const reference = readReference(input['reference'], issues);
  const message = readText(input['message'], ['message'], MESSAGE, issues);
  const billingInformation = readText(input['billingInformation'], ['billingInformation'], BILLING_INFORMATION, issues);
  const alternativeProcedures = readAlternativeProcedures(input['alternativeProcedures'], issues);

  // The rules that involve several fields.
  if (account !== undefined && reference !== undefined) {
    const status = validateReferenceForAccount(account.type, reference.type);
    if (status !== 'valid') issues.add(status, ['reference'], MESSAGES[status]);
  }
  if (account !== undefined && currency !== undefined && !isCurrencyAllowedForAccount(account.type, currency)) {
    issues.add('qr_iban_requires_chf', ['currency'], MESSAGES.qr_iban_requires_chf);
  }
  if (amount === '0.00' && !isZeroAmountAllowed(message)) {
    issues.add('amount_out_of_range', ['amount'], MESSAGES.zero_amount);
  }
  if (!isAdditionalInformationWithinLimit(message, billingInformation)) {
    issues.add('additional_information_too_long', [], MESSAGES.additional_information_too_long);
  }

  if (
    issues.list.length > 0 ||
    currency === undefined ||
    creditor === undefined ||
    account === undefined ||
    reference === undefined
  ) {
    return { success: false, issues: issues.list };
  }

  // The content of the Swiss QR Code, which must fit in the largest QR code allowed.
  const fields: Omit<QRBill, 'payload'> = {
    currency,
    creditor: { ...creditor, account: account.iban },
    ...(amount !== undefined && { amount }),
    ...(debtor !== undefined && { debtor }),
    referenceType: reference.type,
    ...(reference.value !== '' && { reference: reference.value }),
    ...(message !== undefined && { message }),
    ...(billingInformation !== undefined && { billingInformation }),
    alternativeProcedures,
  };
  const payload = encodePayload(fields, options);
  if (utf8Length(payload) > MAX_PAYLOAD_BYTES) {
    issues.add('payload_too_long', [], MESSAGES.payload_too_long);
    return { success: false, issues: issues.list };
  }
  return { success: true, data: deepFreeze({ ...fields, payload }) };
}

/** English messages of the issues whose text does not depend on the value. */
const MESSAGES = {
  required: 'Required',
  invalid_currency: 'Currency must be "CHF" or "EUR"',
  invalid_iban: 'Expected a valid CH or LI IBAN (21 characters, correct check digits)',
  invalid_amount: 'Expected an amount with at most two decimals, "." as separator, e.g. "1949.75"',
  amount_out_of_range: `Amount must be between 0.01 and ${MAX_AMOUNT}`,
  zero_amount:
    'An amount of 0.00 is only allowed for a notification whose message is "DO NOT USE FOR PAYMENT" in one of the five languages',
  invalid_reference:
    'Expected a QR reference (27 digits) or a Creditor Reference ("RF" + 2 check digits + up to 21 characters) with correct check digits',
  qr_iban_requires_qr_reference: 'A QR-IBAN requires a QR reference',
  qr_reference_requires_qr_iban: 'A QR reference can only be used with a QR-IBAN',
  qr_iban_requires_chf:
    'Since v2.4, QR-IBAN and QR reference are reserved for CHF; use an IBAN with a Creditor Reference for EUR',
  additional_information_too_long: `Message and billing information together must not exceed ${ADDITIONAL_INFORMATION_MAX_LENGTH} characters`,
  invalid_billing_information:
    'Billing information must start with "//" followed by the two-character code of its syntax (e.g. "//S1/")',
  too_many_alternative_procedures: `At most ${MAX_ALTERNATIVE_PROCEDURES} alternative procedures`,
  payload_too_long: `The Swiss QR Code content must not exceed ${MAX_PAYLOAD_BYTES} bytes`,
} as const;

/** The problems found so far, in the order of the fields. */
class IssueList {
  readonly list: QRBillIssue[] = [];

  add(code: IssueCode, path: IssuePath, message: string): void {
    this.list.push({ code, path, message });
  }
}

// Each read* function below checks one part of the input. It reports the problems it finds and returns the
// normalized value, or undefined when the part is absent or invalid.

/** A text field: the validator of its domain and its maximum length, for the message of a too_long issue. */
interface TextField {
  readonly validate: (text: string) => TextStatus | BillingInformationStatus;
  readonly maxLength: number;
}

const NAME: TextField = { validate: validateName, maxLength: ADDRESS_MAX_LENGTH.name };
const STREET: TextField = { validate: validateStreet, maxLength: ADDRESS_MAX_LENGTH.street };
const BUILDING_NUMBER: TextField = { validate: validateBuildingNumber, maxLength: ADDRESS_MAX_LENGTH.buildingNumber };
const POSTAL_CODE: TextField = { validate: validatePostalCode, maxLength: ADDRESS_MAX_LENGTH.postalCode };
const TOWN: TextField = { validate: validateTown, maxLength: ADDRESS_MAX_LENGTH.town };
const MESSAGE: TextField = { validate: validateMessage, maxLength: ADDITIONAL_INFORMATION_MAX_LENGTH };
const BILLING_INFORMATION: TextField = {
  validate: validateBillingInformation,
  maxLength: ADDITIONAL_INFORMATION_MAX_LENGTH,
};
const ALTERNATIVE_PROCEDURE: TextField = {
  validate: validateAlternativeProcedure,
  maxLength: ALTERNATIVE_PROCEDURE_MAX_LENGTH,
};

function readText(value: unknown, path: IssuePath, field: TextField, issues: IssueList): string | undefined {
  if (!isStringOrAbsent(value)) {
    issues.add('invalid_type', path, `Expected a string, received ${typeof value}`);
    return undefined;
  }
  const text = normalizeText(value ?? '');
  const status = field.validate(text);
  switch (status) {
    case 'valid':
      return text === '' ? undefined : text;
    case 'invalid_characters': {
      const characters = findInvalidCharacters(text).map((char) => JSON.stringify(char));
      issues.add(status, path, `Characters not allowed in the Swiss QR Code: ${characters.join(', ')}`);
      return undefined;
    }
    case 'too_long':
      issues.add(status, path, `At most ${field.maxLength} characters, received ${characterCount(text)}`);
      return undefined;
    default:
      issues.add(status, path, MESSAGES[status]);
      return undefined;
  }
}

function readCurrency(value: unknown, issues: IssueList): Currency | undefined {
  if (isValidCurrency(value)) return value;
  issues.add('invalid_currency', ['currency'], MESSAGES.invalid_currency);
  return undefined;
}

function readCreditor(value: unknown, issues: IssueList): Address | undefined {
  if (value === undefined || value === null) {
    issues.add('required', ['creditor'], MESSAGES.required);
    return undefined;
  }
  return readAddress(value, ['creditor'], issues);
}

function readDebtor(value: unknown, issues: IssueList): Address | undefined {
  return value === undefined || value === null ? undefined : readAddress(value, ['debtor'], issues);
}

function readAddress(value: unknown, path: IssuePath, issues: IssueList): Address | undefined {
  if (!isRecord(value)) {
    issues.add('invalid_type', path, 'Expected an address object');
    return undefined;
  }
  const name = readText(value['name'], [...path, 'name'], NAME, issues);
  const street = readText(value['street'], [...path, 'street'], STREET, issues);
  const buildingNumber = readText(value['buildingNumber'], [...path, 'buildingNumber'], BUILDING_NUMBER, issues);
  const postalCode = readText(value['postalCode'], [...path, 'postalCode'], POSTAL_CODE, issues);
  const town = readText(value['town'], [...path, 'town'], TOWN, issues);
  const country = readCountry(value['country'], [...path, 'country'], issues);
  if (name === undefined || postalCode === undefined || town === undefined || country === undefined) {
    return undefined;
  }
  return {
    name,
    ...(street !== undefined && { street }),
    ...(buildingNumber !== undefined && { buildingNumber }),
    postalCode,
    town,
    country,
  };
}

function readCountry(value: unknown, path: IssuePath, issues: IssueList): string | undefined {
  if (!isStringOrAbsent(value)) {
    issues.add('invalid_type', path, `Expected a string, received ${typeof value}`);
    return undefined;
  }
  const text = value ?? '';
  switch (validateCountry(text)) {
    case 'valid':
      return normalizeCountry(text);
    case 'required':
      issues.add('required', path, MESSAGES.required);
      return undefined;
    case 'invalid_country':
      issues.add(
        'invalid_country',
        path,
        `Expected a two-letter ISO 3166-1 country code, received ${JSON.stringify(text.trim())}`,
      );
      return undefined;
  }
}

/** Reads the account from the creditor object; a creditor that is not an object is reported by readCreditor. */
function readAccount(creditor: unknown, issues: IssueList): { iban: string; type: AccountType } | undefined {
  if (!isRecord(creditor)) return undefined;
  const value = creditor['account'];
  const path = ['creditor', 'account'];
  if (!isStringOrAbsent(value)) {
    issues.add('invalid_type', path, `Expected a string, received ${typeof value}`);
    return undefined;
  }
  const iban = normalizeIBAN(value ?? '');
  const status = validateAccount(iban);
  if (status === 'required' || status === 'invalid_iban') {
    issues.add(status, path, MESSAGES[status]);
    return undefined;
  }
  return { iban, type: status };
}

function readAmount(value: unknown, issues: IssueList): string | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string' && typeof value !== 'number') {
    issues.add('invalid_type', ['amount'], `Expected a string or a number, received ${typeof value}`);
    return undefined;
  }
  const status = validateAmount(value);
  if (status === 'invalid_amount' || status === 'amount_out_of_range') {
    issues.add(status, ['amount'], MESSAGES[status]);
    return undefined;
  }
  // valid or zero; undefined when empty (the debtor writes the amount by hand)
  return value === undefined || value === null ? undefined : normalizeAmount(value);
}

function readReference(value: unknown, issues: IssueList): { type: ReferenceType; value: string } | undefined {
  if (!isStringOrAbsent(value)) {
    issues.add('invalid_type', ['reference'], `Expected a string, received ${typeof value}`);
    return undefined;
  }
  const reference = normalizeReference(value ?? '');
  const status = validateReference(reference);
  if (status === 'invalid_reference') {
    issues.add(status, ['reference'], MESSAGES.invalid_reference);
    return undefined;
  }
  return { type: status, value: reference };
}

function readAlternativeProcedures(value: unknown, issues: IssueList): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.add('invalid_type', ['alternativeProcedures'], 'Expected an array of strings');
    return [];
  }
  const procedures: string[] = [];
  value.forEach((item: unknown, index) => {
    const text = readText(item, ['alternativeProcedures', index], ALTERNATIVE_PROCEDURE, issues);
    if (text !== undefined) procedures.push(text);
  });
  if (procedures.length > MAX_ALTERNATIVE_PROCEDURES) {
    issues.add('too_many_alternative_procedures', ['alternativeProcedures'], MESSAGES.too_many_alternative_procedures);
  }
  return procedures;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringOrAbsent(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

/** Freezes an object and every object it contains, so that a validated bill cannot be altered afterwards. */
function deepFreeze<T extends object>(value: T): T {
  for (const nested of Object.values(value)) {
    if (typeof nested === 'object' && nested !== null) deepFreeze(nested as object);
  }
  return Object.freeze(value);
}
