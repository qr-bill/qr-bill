/**
 * How the addresses are written on the invoice: the line of the street, the line of the town, and the name of the
 * country, printed when the issuer and the recipient are in different countries.
 *
 * @module
 */

import type { Address, Language } from '@qr-bill/core';

/**
 * The name of a country in a language, from the data of the JavaScript runtime (`Intl.DisplayNames`); the code
 * itself when the runtime does not know it.
 *
 * @param code - A two-letter ISO 3166-1 code, in upper case.
 * @param language - The language of the name.
 * @returns The name of the country.
 * @example
 * ```ts
 * countryName('DE', 'fr'); // 'Allemagne'
 * countryName('CH', 'rm'); // 'Svizra'
 * ```
 */
export function countryName(code: string, language: Language): string {
  // With the fallback "code", the name is never missing: String() only tells the type so.
  return String(new Intl.DisplayNames([language], { type: 'region', fallback: 'code' }).of(code));
}

/**
 * The line of the street and the building number, when there is one.
 *
 * @param address - An address.
 * @returns `"Musterstrasse 123"`, or `undefined` without street nor number.
 * @example
 * ```ts
 * streetLine({ name: 'A', street: 'Musterstrasse', buildingNumber: '123', postalCode: '8000', town: 'Seldwyla', country: 'CH' }); // 'Musterstrasse 123'
 * ```
 */
export function streetLine(address: Address): string | undefined {
  const line = [address.street, address.buildingNumber].filter((part) => part !== undefined).join(' ');
  return line === '' ? undefined : line;
}

/**
 * The line of the postal code and the town.
 *
 * @param address - An address.
 * @returns `"8000 Seldwyla"`.
 */
export function townLine(address: Address): string {
  return `${address.postalCode} ${address.town}`;
}
