/**
 * Country codes of the addresses (SIX IG QR-bill v2.4, chapter 4.2.2, table 8): the 249 officially assigned
 * ISO 3166-1 alpha-2 codes, plus XK (Kosovo), a user-assigned code that banks and SWIFT use in practice.
 *
 * @module
 */

const CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ ' +
  'BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
  'DE DJ DK DM DO DZ ' +
  'EC EE EG EH ER ES ET ' +
  'FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY ' +
  'HK HM HN HR HT HU ' +
  'ID IE IL IM IN IO IQ IR IS IT ' +
  'JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ ' +
  'LA LB LC LI LK LR LS LT LU LV LY ' +
  'MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ ' +
  'OM ' +
  'PA PE PF PG PH PK PL PM PN PR PS PT PW PY ' +
  'QA ' +
  'RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ ' +
  'TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
  'UA UG UM US UY UZ ' +
  'VA VC VE VG VI VN VU ' +
  'WF WS ' +
  'XK ' +
  'YE YT ' +
  'ZA ZM ZW';

let codeSet: ReadonlySet<string> | undefined;

/**
 * The set of codes, built on first use rather than when the module loads, so that a bundle which never checks a
 * country (an app that only imports `isValidIBAN`, say) does not carry the list.
 */
function countryCodeSet(): ReadonlySet<string> {
  codeSet ??= new Set(CODES.split(' '));
  return codeSet;
}

/**
 * Tells whether a code is an accepted country code.
 *
 * @param code - Two upper-case letters. Use {@link validateCountry} for raw input.
 * @returns `true` for an ISO 3166-1 alpha-2 code or XK.
 */
export function isCountryCode(code: string): boolean {
  return countryCodeSet().has(code);
}

/**
 * Lists the accepted country codes, for instance to fill a select box.
 *
 * @returns The 250 codes, in alphabetical order.
 */
export function listCountryCodes(): string[] {
  return [...countryCodeSet()];
}

/**
 * Normalizes a country code the way it is written in the Swiss QR Code: trimmed and upper-cased.
 *
 * @param country - A country code that {@link validateCountry} accepts, e.g. " ch ".
 * @returns The code in upper case, e.g. "CH".
 */
export function normalizeCountry(country: string): string {
  return country.trim().toUpperCase();
}
