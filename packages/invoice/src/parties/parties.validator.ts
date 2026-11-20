/**
 * Validation of the issuer and the recipient. Their names and structured addresses are checked with the validators
 * of the QR-bill, since they are also the creditor and the debtor of the payment part.
 *
 * @module
 */

import {
  type Address,
  type IssuePath,
  type TextStatus,
  validateBuildingNumber,
  validateCountry,
  validateName,
  validatePostalCode,
  validateStreet,
  validateTown,
} from '@qr-bill/core';
import {
  type IssueList,
  isAbsent,
  readBoolean,
  readLine,
  readLines,
  readRecord,
  readString,
} from '../fields/fields.js';
import { INVOICE_LIMITS } from '../invoice/limits.js';
import { formatUID } from '../uid/uid.js';
import { validateUID } from '../uid/uid.validator.js';
import type { InvoiceIssuerData, InvoiceLogo, InvoiceRecipientData } from './parties.types.js';

/** A field of an address, checked by the validator of the QR-bill. */
function readAddressField(
  value: unknown,
  path: IssuePath,
  validate: (text: string) => TextStatus,
  max: number,
  issues: IssueList,
): string | undefined {
  if (!isAbsent(value) && typeof value !== 'string') {
    issues.add('invalid_type', path, `Expected a string, received ${typeof value}`);
    return undefined;
  }
  const text = (value ?? '').normalize('NFC').trim();
  const status = validate(text);
  if (status === 'valid') return text === '' ? undefined : text;
  const messages = {
    required: 'Required',
    invalid_characters: 'Characters not allowed on the payment part of a QR-bill',
    too_long: `At most ${max} characters, received ${[...text].length}`,
  };
  issues.add(status, path, messages[status]);
  return undefined;
}

/** The structured address of the issuer or the recipient, with the rules of the QR-bill. */
function readAddress(value: Record<string, unknown>, path: IssuePath, issues: IssueList): Address | undefined {
  const L = INVOICE_LIMITS.recipient;
  const name = readAddressField(value['name'], [...path, 'name'], validateName, L.name, issues);
  const street = readAddressField(value['street'], [...path, 'street'], validateStreet, L.street, issues);
  const buildingNumber = readAddressField(
    value['buildingNumber'],
    [...path, 'buildingNumber'],
    validateBuildingNumber,
    L.buildingNumber,
    issues,
  );
  const postalCode = readAddressField(
    value['postalCode'],
    [...path, 'postalCode'],
    validatePostalCode,
    L.postalCode,
    issues,
  );
  const town = readAddressField(value['town'], [...path, 'town'], validateTown, L.town, issues);
  const country = readCountry(value['country'], [...path, 'country'], issues);
  if (name === undefined || postalCode === undefined || town === undefined || country === undefined) return undefined;
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
  if (!isAbsent(value) && typeof value !== 'string') {
    issues.add('invalid_type', path, `Expected a string, received ${typeof value}`);
    return undefined;
  }
  const text = value ?? '';
  const status = validateCountry(text);
  if (status === 'valid') return text.trim().toUpperCase();
  issues.add(status, path, status === 'required' ? 'Required' : 'Expected a two-letter ISO 3166-1 country code');
  return undefined;
}

/**
 * Reads the issuer: its name and address with the rules of the QR-bill, its logo, its contacts and its UID.
 *
 * @param value - The issuer, as given.
 * @param issues - Where problems are reported.
 * @returns The issuer, normalized, or `undefined` when its name or address is invalid.
 */
export function readIssuer(value: unknown, issues: IssueList): InvoiceIssuerData | undefined {
  const record = readRecord(value, ['issuer'], issues);
  if (record === undefined) return undefined;
  const L = INVOICE_LIMITS.issuer;
  const address = readAddress(record, ['issuer'], issues);
  const logo = readLogo(record['logo'], issues);
  const extraLines = readLines(record['extraLines'], ['issuer', 'extraLines'], L.extraLines, L.extraLine, issues);
  const phones = readLines(record['phones'], ['issuer', 'phones'], L.phones, L.phone, issues);
  const email = readEmail(record['email'], issues);
  const contact = readLine(record['contact'], ['issuer', 'contact'], L.contact, issues);
  const uid = readUID(record['uid'], issues);
  const vatRegistered = readBoolean(record['vatRegistered'], ['issuer', 'vatRegistered'], issues);
  if (address === undefined) return undefined;
  return {
    ...address,
    ...(logo !== undefined && { logo }),
    extraLines,
    phones,
    ...(email !== undefined && { email }),
    ...(contact !== undefined && { contact }),
    ...(uid !== undefined && { uid }),
    vatRegistered: vatRegistered ?? false,
  };
}

/**
 * Reads the recipient: its name and address with the rules of the QR-bill, its salutation and its extra lines.
 *
 * @param value - The recipient, as given.
 * @param issues - Where problems are reported.
 * @returns The recipient, normalized, or `undefined` when its name or address is invalid.
 */
export function readRecipient(value: unknown, issues: IssueList): InvoiceRecipientData | undefined {
  const record = readRecord(value, ['recipient'], issues);
  if (record === undefined) return undefined;
  const L = INVOICE_LIMITS.recipient;
  const salutation = readLine(record['salutation'], ['recipient', 'salutation'], L.salutation, issues);
  const address = readAddress(record, ['recipient'], issues);
  const extraLines = readLines(record['extraLines'], ['recipient', 'extraLines'], L.extraLines, L.extraLine, issues);
  if (address === undefined) return undefined;
  return { ...(salutation !== undefined && { salutation }), ...address, extraLines };
}

/** The first bytes of a PNG file. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** The first bytes of a JPEG file. */
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;

/** A logo: the bytes of a PNG or JPEG file, recognized from their first bytes. */
function readLogo(value: unknown, issues: IssueList): InvoiceLogo | undefined {
  if (isAbsent(value)) return undefined;
  const path = ['issuer', 'logo'];
  if (!(value instanceof Uint8Array)) {
    issues.add('invalid_type', path, 'Expected the bytes of a PNG or JPEG file (a Uint8Array or a Buffer)');
    return undefined;
  }
  if (value.length > INVOICE_LIMITS.logoBytes) {
    issues.add('logo_too_large', path, `At most ${INVOICE_LIMITS.logoBytes} bytes, received ${value.length}`);
    return undefined;
  }
  const starts = (signature: readonly number[]): boolean => signature.every((byte, index) => value[index] === byte);
  const format = starts(PNG_SIGNATURE) ? 'png' : starts(JPEG_SIGNATURE) ? 'jpeg' : undefined;
  if (format === undefined) {
    issues.add('unsupported_logo', path, 'Expected a PNG or JPEG file');
    return undefined;
  }
  return { format, bytes: value };
}

function readEmail(value: unknown, issues: IssueList): string | undefined {
  const path = ['issuer', 'email'];
  const email = readLine(value, path, INVOICE_LIMITS.issuer.email, issues);
  if (email === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return email;
  issues.add('invalid_email', path, `Expected an e-mail address, received ${JSON.stringify(email)}`);
  return undefined;
}

function readUID(value: unknown, issues: IssueList): string | undefined {
  const path = ['issuer', 'uid'];
  const text = readString(value, path, issues);
  if (text === undefined) return undefined;
  if (validateUID(text) === 'valid') return formatUID(text);
  issues.add('invalid_uid', path, `Expected a UID such as "CHE-123.456.788" with its check digit`);
  return undefined;
}
