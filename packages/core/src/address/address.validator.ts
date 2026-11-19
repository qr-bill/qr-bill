/**
 * Validators of the address fields of the creditor and the debtor (SIX IG QR-bill v2.4, chapter 4.2.2, table 8).
 * Each one checks a single field, as typed in a form, with the same rules as {@link validateQRBill}.
 *
 * @module
 */

import type { OptionalTextStatus, TextStatus } from '../text/text.types.js';
import { validateOptionalText, validateRequiredText } from '../text/text.validator.js';
import type { CountryStatus } from './address.types.js';
import { isCountryCode } from './countries.js';

/** Maximum lengths of the address fields, in characters (table 8). Useful for the `maxlength` of form inputs. */
export const ADDRESS_MAX_LENGTH: {
  /** Name: 70 characters. */
  readonly name: 70;
  /** Street or P.O. box: 70 characters. */
  readonly street: 70;
  /** Building number: 16 characters. */
  readonly buildingNumber: 16;
  /** Postal code: 16 characters. */
  readonly postalCode: 16;
  /** Town: 35 characters. */
  readonly town: 35;
} = { name: 70, street: 70, buildingNumber: 16, postalCode: 16, town: 35 };

/**
 * Validates the name of the creditor or the debtor: first name (optional, recommended) and last name, or company
 * name. Mandatory, max. 70 characters.
 *
 * @param value - The name as typed. Surrounding spaces are ignored.
 * @returns `valid`, or the first problem found (see {@link TextStatus}).
 * @example
 * ```ts
 * validateName('Max Muster & Söhne'); // 'valid'
 * validateName('  '); // 'required'
 * ```
 */
export function validateName(value: string | null | undefined): TextStatus {
  return validateRequiredText(value, ADDRESS_MAX_LENGTH.name);
}

/**
 * Validates the street or P.O. box. Optional, max. 70 characters.
 *
 * @param value - The street as typed. Surrounding spaces are ignored.
 * @returns `valid` (also when empty), or the first problem found (see {@link OptionalTextStatus}).
 */
export function validateStreet(value: string | null | undefined): OptionalTextStatus {
  return validateOptionalText(value, ADDRESS_MAX_LENGTH.street);
}

/**
 * Validates the building number. Optional, max. 16 characters.
 *
 * @param value - The building number as typed. Surrounding spaces are ignored.
 * @returns `valid` (also when empty), or the first problem found (see {@link OptionalTextStatus}).
 */
export function validateBuildingNumber(value: string | null | undefined): OptionalTextStatus {
  return validateOptionalText(value, ADDRESS_MAX_LENGTH.buildingNumber);
}

/**
 * Validates the postal code, given without country prefix ("8000", not "CH-8000"). Mandatory, max. 16
 * characters.
 *
 * @param value - The postal code as typed. Surrounding spaces are ignored.
 * @returns `valid`, or the first problem found (see {@link TextStatus}).
 */
export function validatePostalCode(value: string | null | undefined): TextStatus {
  return validateRequiredText(value, ADDRESS_MAX_LENGTH.postalCode);
}

/**
 * Validates the town. Mandatory, max. 35 characters.
 *
 * @param value - The town as typed. Surrounding spaces are ignored.
 * @returns `valid`, or the first problem found (see {@link TextStatus}).
 */
export function validateTown(value: string | null | undefined): TextStatus {
  return validateRequiredText(value, ADDRESS_MAX_LENGTH.town);
}

/**
 * Validates the country: a two-letter ISO 3166-1 code. Mandatory.
 *
 * The two letters are checked before upper-casing, which can change the length and the letters: "ß" would become
 * "SS" (South Sudan) and "ŉa" would become "ʼNA", whose "ʼ" is not even allowed in the Swiss QR Code.
 *
 * @param value - The country as typed. Case and surrounding spaces are ignored.
 * @returns `valid`, `required` or `invalid_country` (see {@link CountryStatus}).
 * @example
 * ```ts
 * validateCountry(' ch '); // 'valid'
 * validateCountry('CHE'); // 'invalid_country'
 * validateCountry('ß'); // 'invalid_country'
 * ```
 */
export function validateCountry(value: string | null | undefined): CountryStatus {
  const text = (value ?? '').trim();
  if (text === '') return 'required';
  if (!/^[A-Za-z]{2}$/.test(text)) return 'invalid_country';
  return isCountryCode(text.toUpperCase()) ? 'valid' : 'invalid_country';
}
