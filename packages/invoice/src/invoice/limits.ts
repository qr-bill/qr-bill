/**
 * Maximum lengths of the fields of an invoice. They are chosen so that each text fits in its place on the page:
 * a longer text wraps within its zone, and is shortened with "…" only as a last resort. The addresses keep the
 * limits of the QR-bill, since they are also printed on the payment part.
 *
 * @module
 */

import { ADDRESS_MAX_LENGTH } from '@qr-bill/core';
import type { InvoiceLimits } from './limits.types.js';

/**
 * The limits of each field, for the `maxlength` of a form. A longer value is reported by {@link validateInvoice}
 * as `too_long`, `too_many` or `too_many_lines`.
 *
 * @example
 * ```ts
 * INVOICE_LIMITS.issuer.phones; // 2
 * ```
 */
export const INVOICE_LIMITS: InvoiceLimits = {
  title: 35,
  number: 35,
  servicePeriod: 50,
  customerReference: 35,
  extraFields: 3,
  extraFieldLabel: 25,
  extraFieldValue: 50,
  subject: 140,
  introduction: 1000,
  introductionLines: 10,
  closing: 1000,
  closingLines: 10,
  issuer: {
    name: ADDRESS_MAX_LENGTH.name,
    street: ADDRESS_MAX_LENGTH.street,
    buildingNumber: ADDRESS_MAX_LENGTH.buildingNumber,
    postalCode: ADDRESS_MAX_LENGTH.postalCode,
    town: ADDRESS_MAX_LENGTH.town,
    extraLines: 2,
    extraLine: 70,
    phones: 2,
    phone: 30,
    email: 70,
    contact: 70,
  },
  recipient: {
    salutation: 35,
    name: ADDRESS_MAX_LENGTH.name,
    street: ADDRESS_MAX_LENGTH.street,
    buildingNumber: ADDRESS_MAX_LENGTH.buildingNumber,
    postalCode: ADDRESS_MAX_LENGTH.postalCode,
    town: ADDRESS_MAX_LENGTH.town,
    extraLines: 2,
    extraLine: 70,
  },
  items: 1000,
  description: 300,
  descriptionLines: 6,
  unit: 10,
  notes: 3,
  note: 300,
  noteLines: 4,
  logoBytes: 2_000_000,
};
