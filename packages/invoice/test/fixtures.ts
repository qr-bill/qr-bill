// Fictional data of the tests: the names and accounts of the examples of the SIX Implementation Guidelines, and a UID
// whose check digit was computed (CHE-123.456.788).

/** The issuer, as creditor of the payment part. */
export const ISSUER = {
  name: 'Max Muster & Söhne',
  street: 'Musterstrasse',
  buildingNumber: '123',
  postalCode: '8000',
  town: 'Seldwyla',
  country: 'CH',
} as const;

/** The recipient, as debtor of the payment part. */
export const RECIPIENT = {
  name: 'Pia-Maria Rutschmann-Schnyder',
  street: 'Grosse Marktgasse',
  buildingNumber: '28',
  postalCode: '9400',
  town: 'Rorschach',
  country: 'CH',
} as const;

/** A QR-IBAN and a regular IBAN of the SIX examples, and a QR reference. */
export const QR_IBAN = 'CH44 3199 9123 0008 8901 2';
export const IBAN = 'CH58 0079 1123 0008 8901 2';
export const QR_REFERENCE = '210000000003139471430009017';

/** A valid UID: its check digit is 8. */
export const UID = 'CHE-123.456.788';

/** The first bytes of a PNG and of a JPEG file, followed by nothing useful: enough to recognize the format. */
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);

/** A minimal valid invoice, with the given fields changed. */
export function invoiceInput(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    language: 'fr',
    date: '2026-11-20',
    issuer: ISSUER,
    recipient: RECIPIENT,
    items: [{ description: 'Conseil', quantity: 6, unitPrice: '150', vatRate: '8.1' }],
    ...changes,
  };
}

/** A string of a given number of characters. */
export function text(length: number, character = 'a'): string {
  return character.repeat(length);
}
