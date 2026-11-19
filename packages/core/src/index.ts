/**
 * Public API of `@qr-bill/core`: the Swiss QR-bill following the SIX Implementation Guidelines v2.4.
 *
 * - The QR-bill as a whole: {@link createQRBill}, {@link validateQRBill}, {@link parseQRBill}.
 * - One validator per field, for forms: {@link validateName}, {@link validateAccount}, {@link validateAmount}…
 * - Helpers to build references and convert amounts: {@link createQRReference}, {@link fromCents}…
 *
 * @module
 */

// The QR-bill as a whole
export { createQRBill } from './bill/create.js';
export { validateQRBill } from './bill/bill.validator.js';
export { parseQRBill, safeParseQRBill } from './bill/parse.js';
export { QRBillValidationError } from './bill/errors.js';
export {
  qrBillSchema,
  type StandardSchemaV1,
  type StandardSchemaV1Issue,
  type StandardSchemaV1PathSegment,
  type StandardSchemaV1Props,
  type StandardSchemaV1Result,
} from './bill/standard-schema.js';
export { MAX_PAYLOAD_BYTES } from './bill/payload.js';
export type {
  IssueCode,
  IssuePath,
  PayloadOptions,
  QRBill,
  QRBillInput,
  QRBillIssue,
  QRBillResult,
  ReferenceForAccountStatus,
} from './bill/bill.types.js';

// Rules that involve several fields
export {
  isAdditionalInformationWithinLimit,
  isCurrencyAllowedForAccount,
  isZeroAmountAllowed,
  validateReferenceForAccount,
} from './bill/cross-field.validator.js';

// Account: IBAN and QR-IBAN
export { isQRIBAN, isValidIBAN, validateAccount } from './account/account.validator.js';
export { formatIBAN, normalizeIBAN } from './account/iban.js';
export type { AccountStatus, AccountType } from './account/account.types.js';

// Creditor and debtor addresses
export {
  ADDRESS_MAX_LENGTH,
  validateBuildingNumber,
  validateCountry,
  validateName,
  validatePostalCode,
  validateStreet,
  validateTown,
} from './address/address.validator.js';
export { listCountryCodes } from './address/countries.js';
export type { Address, CountryStatus, Creditor } from './address/address.types.js';

// Amount and currency
export { MAX_AMOUNT, formatAmount, fromCents, normalizeAmount } from './amount/amount.js';
export { isValidCurrency, validateAmount } from './amount/amount.validator.js';
export type { AmountStatus, Currency } from './amount/amount.types.js';

// Reference: QR reference and Creditor Reference
export { createQRReference } from './reference/qr-reference.js';
export { createCreditorReference } from './reference/creditor-reference.js';
export { formatReference } from './reference/reference.js';
export { isValidCreditorReference, isValidQRReference, validateReference } from './reference/reference.validator.js';
export type { ReferenceStatus, ReferenceType } from './reference/reference.types.js';

// Additional information: message, billing information, alternative procedures
export {
  ADDITIONAL_INFORMATION_MAX_LENGTH,
  ALTERNATIVE_PROCEDURE_MAX_LENGTH,
  MAX_ALTERNATIVE_PROCEDURES,
  validateAlternativeProcedure,
  validateBillingInformation,
  validateMessage,
} from './additional-information/additional-information.validator.js';
export type { BillingInformationStatus } from './additional-information/additional-information.types.js';

// Text: character set of the Swiss QR Code
export { findInvalidCharacters, sanitizeText } from './text/charset.js';
export type { OptionalTextStatus, TextStatus } from './text/text.types.js';

// Texts printed on the payment part and the receipt
export { DO_NOT_USE_FOR_PAYMENT, LABELS } from './labels/labels.js';
export type { Labels, Language } from './labels/labels.types.js';
