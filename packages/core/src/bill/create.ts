/**
 * Creating a QR-bill: validation, normalization and content of the Swiss QR Code in one call.
 *
 * @module
 */

import { validateQRBill } from './bill.validator.js';
import type { PayloadOptions, QRBill, QRBillInput } from './bill.types.js';
import { QRBillValidationError } from './errors.js';

/**
 * Validates, normalizes and serializes a QR-bill. Use {@link validateQRBill} instead to get the problems without
 * an exception, for instance to answer an API request.
 *
 * @param input - The bill.
 * @param options - How to write the content of the Swiss QR Code.
 * @returns The normalized, frozen bill, with the content of its Swiss QR Code in `payload`.
 * @throws {QRBillValidationError} Listing every problem found.
 * @example
 * ```ts
 * const bill = createQRBill({
 *   currency: 'CHF',
 *   amount: fromCents(194975), // '1949.75'
 *   creditor: {
 *     account: 'CH44 3199 9123 0008 8901 2', // QR-IBAN
 *     name: 'Max Muster & Söhne',
 *     street: 'Musterstrasse',
 *     buildingNumber: '123',
 *     postalCode: '8000',
 *     town: 'Seldwyla',
 *     country: 'CH',
 *   },
 *   reference: createQRReference('21000000000313947143000901'),
 * });
 * bill.payload; // 'SPC\n0200\n1\nCH4431999123000889012\nS\nMax Muster & Söhne\n…'
 * ```
 */
export function createQRBill(input: QRBillInput, options: PayloadOptions = {}): QRBill {
  const result = validateQRBill(input, options);
  if (!result.success) throw new QRBillValidationError(result.issues);
  return result.data;
}
