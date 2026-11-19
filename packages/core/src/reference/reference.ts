/**
 * Normalizing and printing a payment reference (SIX IG QR-bill v2.4, chapters 2.12 and 3.5.4).
 *
 * @module
 */

/**
 * Normalizes a reference the way it is written in the Swiss QR Code: without spaces, in upper case (banks ignore
 * the case of a Creditor Reference).
 *
 * @param reference - A reference as typed or printed.
 * @returns The reference without spaces, in upper case. It is not validated.
 */
export function normalizeReference(reference: string): string {
  return reference.replace(/\s+/g, '').toUpperCase();
}

/**
 * Tells the type of a reference from its shape only, without checking it: digits only for a QR reference, "RF"
 * prefix for a Creditor Reference.
 *
 * @param reference - A reference as typed. Spaces and case are ignored.
 * @returns `QRR`, `SCOR`, or `undefined` when it looks like neither.
 */
export function detectReferenceType(reference: string): 'QRR' | 'SCOR' | undefined {
  const normalized = normalizeReference(reference);
  if (normalized.startsWith('RF')) return 'SCOR';
  if (/^\d+$/.test(normalized)) return 'QRR';
  return undefined;
}

/**
 * Formats a QR reference for printing: the first 2 digits, then groups of 5.
 *
 * @param reference - A QR reference, with or without spaces.
 * @returns The formatted reference.
 * @example
 * ```ts
 * formatQRReference('210000000003139471430009017'); // '21 00000 00003 13947 14300 09017'
 * ```
 */
export function formatQRReference(reference: string): string {
  const normalized = normalizeReference(reference);
  return `${normalized.slice(0, 2)} ${normalized.slice(2).replace(/(.{5})(?=.)/g, '$1 ')}`.trim();
}

/**
 * Formats a Creditor Reference for printing: groups of 4 characters.
 *
 * @param reference - A Creditor Reference, with or without spaces.
 * @returns The formatted reference.
 * @example
 * ```ts
 * formatCreditorReference('RF18539007547034'); // 'RF18 5390 0754 7034'
 * ```
 */
export function formatCreditorReference(reference: string): string {
  return normalizeReference(reference).replace(/(.{4})(?=.)/g, '$1 ');
}

/**
 * Formats a reference for printing on the payment part and the receipt, according to its type.
 *
 * @param reference - A QR reference or a Creditor Reference, with or without spaces.
 * @returns The formatted reference.
 * @example
 * ```ts
 * formatReference('210000000003139471430009017'); // '21 00000 00003 13947 14300 09017'
 * formatReference('RF18539007547034'); // 'RF18 5390 0754 7034'
 * ```
 */
export function formatReference(reference: string): string {
  return detectReferenceType(reference) === 'QRR' ? formatQRReference(reference) : formatCreditorReference(reference);
}
