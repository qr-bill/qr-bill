/**
 * Reading the content of a Swiss QR Code back into a QR-bill, e.g. after scanning an invoice received from a
 * supplier. The content goes through exactly the same validation as {@link createQRBill}, after the structural
 * checks of chapter 7.1 (SIX IG QR-bill v2.4).
 *
 * @module
 */

import type { Address } from '../address/address.types.js';
import { validateQRBill } from './bill.validator.js';
import type { QRBill, QRBillIssue, QRBillResult } from './bill.types.js';
import { QRBillValidationError } from './errors.js';

/** Number of lines up to the trailer "EPD". */
const MANDATORY_LINES = 31;
/** Mandatory lines, billing information and two alternative procedures. */
const MAX_LINES = 34;

// Line numbers (0-based) of the elements of table 8.
const LINE = {
  qrType: 0,
  version: 1,
  codingType: 2,
  account: 3,
  creditor: 4,
  ultimateCreditor: 11,
  amount: 18,
  currency: 19,
  debtor: 20,
  referenceType: 27,
  reference: 28,
  message: 29,
  trailer: 30,
  billingInformation: 31,
  alternativeProcedures: 32,
} as const;

function invalid(message: string, path: QRBillIssue['path'] = []): QRBillResult {
  return { success: false, issues: [{ code: 'invalid_payload', path, message }] };
}

/** Reads the seven lines of an address: undefined when all empty, 'invalid' when not a structured address. */
function addressFrom(lines: readonly string[], start: number): Address | undefined | 'invalid' {
  const [type = '', name = '', street = '', buildingNumber = '', postalCode = '', town = '', country = ''] =
    lines.slice(start, start + 7);
  if (type === '') {
    return [name, street, buildingNumber, postalCode, town, country].every((line) => line === '')
      ? undefined
      : 'invalid';
  }
  if (type !== 'S') return 'invalid';
  return {
    name,
    ...(street !== '' && { street }),
    ...(buildingNumber !== '' && { buildingNumber }),
    postalCode,
    town,
    country,
  };
}

/**
 * Reads the content of a Swiss QR Code without throwing.
 *
 * @param payload - The text decoded from the QR code, with LF or CR LF line endings.
 * @returns The bill, or the problems found (see {@link validateQRBill}). Structural problems (wrong QR type,
 *   number of lines, address type…) are reported with the code `invalid_payload`.
 */
export function safeParseQRBill(payload: string): QRBillResult {
  const lineEnding = payload.includes('\r\n') ? '\r\n' : '\n';
  const lines = payload.split(lineEnding);
  /** The element on a line; empty when the content ends before it, which only the optional elements can. */
  const line = (index: number): string => lines[index] ?? '';

  if (lines.length < MANDATORY_LINES || lines.length > MAX_LINES) {
    return invalid(`Expected ${MANDATORY_LINES} to ${MAX_LINES} lines, found ${lines.length}`);
  }
  if (line(LINE.qrType) !== 'SPC') return invalid('QR type must be "SPC"');
  if (line(LINE.version) !== '0200') return invalid('Version must be "0200"');
  if (line(LINE.codingType) !== '1') return invalid('Coding type must be "1"');
  if (line(LINE.trailer) !== 'EPD') return invalid('Trailer "EPD" expected on line 31');

  const creditor = addressFrom(lines, LINE.creditor);
  if (creditor === undefined || creditor === 'invalid') {
    return invalid('Creditor must be a structured address (type "S")', ['creditor']);
  }
  if (lines.slice(LINE.ultimateCreditor, LINE.amount).some((element) => element !== '')) {
    return invalid('Ultimate creditor must not be filled in');
  }
  const debtor = addressFrom(lines, LINE.debtor);
  if (debtor === 'invalid') {
    return invalid('Debtor must be a structured address (type "S") or empty', ['debtor']);
  }

  const referenceType = line(LINE.referenceType);
  if (!['QRR', 'SCOR', 'NON'].includes(referenceType)) {
    return invalid('Reference type must be QRR, SCOR or NON', ['reference']);
  }
  if ((referenceType === 'NON') !== (line(LINE.reference) === '')) {
    return invalid(`Reference does not match reference type ${referenceType}`, ['reference']);
  }

  // Empty elements count as absent in the validation.
  const result = validateQRBill(
    {
      currency: line(LINE.currency),
      creditor: { ...creditor, account: line(LINE.account) },
      amount: line(LINE.amount),
      debtor,
      reference: line(LINE.reference),
      message: line(LINE.message),
      billingInformation: line(LINE.billingInformation),
      // Some issuers leave empty lines for unused alternative procedures; blank entries are ignored.
      alternativeProcedures: lines.slice(LINE.alternativeProcedures),
    },
    { lineEnding },
  );
  if (result.success && result.data.referenceType !== referenceType) {
    return invalid(`Reference does not match reference type ${referenceType}`, ['reference']);
  }
  return result;
}

/**
 * Reads the content of a Swiss QR Code.
 *
 * @param payload - The text decoded from the QR code, with LF or CR LF line endings.
 * @returns The validated, normalized bill.
 * @throws {QRBillValidationError} When the content is not a valid QR-bill.
 * @example
 * ```ts
 * const bill = parseQRBill(scannedText);
 * bill.creditor.name; // 'Max Muster & Söhne'
 * bill.amount; // '1949.75'
 * ```
 */
export function parseQRBill(payload: string): QRBill {
  const result = safeParseQRBill(payload);
  if (!result.success) throw new QRBillValidationError(result.issues);
  return result.data;
}
