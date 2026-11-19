/**
 * Content of the Swiss QR Code (SIX IG QR-bill v2.4, chapter 4.2.2, table 8).
 *
 * 31 mandatory lines, then the additional elements (billing information and up to two alternative procedures),
 * left out when unused (chapter 4.1.4). No line break after the last element.
 *
 * @module
 */

import type { Address } from '../address/address.types.js';
import type { PayloadOptions, QRBill } from './bill.types.js';

/**
 * Maximum size of the content, in bytes: the capacity of a version 25 QR code at error correction level M, the
 * largest allowed (chapter 6.2).
 */
export const MAX_PAYLOAD_BYTES = 997;

/** Seven empty lines: an address that is not filled in. */
const EMPTY_ADDRESS = ['', '', '', '', '', '', ''] as const;

/** The seven lines of a structured address: type "S", name, street, building number, postal code, town, country. */
function addressLines(address: Address | undefined): readonly string[] {
  if (address === undefined) return EMPTY_ADDRESS;
  return [
    'S',
    address.name,
    address.street ?? '',
    address.buildingNumber ?? '',
    address.postalCode,
    address.town,
    address.country,
  ];
}

/**
 * Writes the content of the Swiss QR Code of a validated bill.
 *
 * @param bill - A bill already validated and normalized by {@link validateQRBill}.
 * @param options - Line separator.
 * @returns The content, one element per line.
 */
export function encodePayload(bill: Omit<QRBill, 'payload'>, options: PayloadOptions = {}): string {
  const lines: string[] = [
    'SPC', // QR type
    '0200', // version 2.0 of the data structure
    '1', // coding type: UTF-8 restricted to the Latin character set
    bill.creditor.account,
    ...addressLines(bill.creditor),
    ...EMPTY_ADDRESS, // ultimate creditor: reserved for future use, must stay empty
    bill.amount ?? '',
    bill.currency,
    ...addressLines(bill.debtor),
    bill.referenceType,
    bill.reference ?? '',
    bill.message ?? '',
    'EPD', // trailer: end of payment data
  ];

  const alternatives = bill.alternativeProcedures;
  if (bill.billingInformation !== undefined || alternatives.length > 0) {
    lines.push(bill.billingInformation ?? '', ...alternatives);
  }

  return lines.join(options.lineEnding ?? '\n');
}
