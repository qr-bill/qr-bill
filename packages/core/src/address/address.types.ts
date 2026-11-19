/**
 * Types of the creditor and debtor addresses.
 *
 * @module
 */

/**
 * A structured address (address type "S"), the only kind allowed since v2.3 (SIX IG QR-bill v2.4, chapter 4.2.2,
 * table 8). The maximum lengths are those of the Swiss QR Code, in characters.
 */
export interface Address {
  /** First name (optional, recommended) and last name, or company name. Mandatory, max. 70 characters. */
  name: string;
  /** Street or P.O. box. Optional, max. 70 characters. */
  street?: string | undefined;
  /** Building number. Optional, max. 16 characters. */
  buildingNumber?: string | undefined;
  /** Postal code, without country prefix ("8000", not "CH-8000"). Mandatory, max. 16 characters. */
  postalCode: string;
  /** Town. Mandatory, max. 35 characters. */
  town: string;
  /** Country as a two-letter ISO 3166-1 code, e.g. "CH". Mandatory; case and surrounding spaces are ignored. */
  country: string;
}

/** The creditor: the holder of the account the payment goes to, and its address. */
export interface Creditor extends Address {
  /** IBAN or QR-IBAN, from Switzerland (CH) or Liechtenstein (LI) only. Spaces and lower case are accepted. */
  account: string;
}

/**
 * Result of the validation of a country code.
 *
 * - `valid`: two letters forming an ISO 3166-1 alpha-2 code.
 * - `required`: empty or blank.
 * - `invalid_country`: anything else, including three-letter codes ("CHE") and unknown codes ("XX").
 */
export type CountryStatus = 'valid' | 'required' | 'invalid_country';
