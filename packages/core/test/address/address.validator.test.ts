import { describe, expect, it } from 'vitest';
import {
  ADDRESS_MAX_LENGTH,
  listCountryCodes,
  validateBuildingNumber,
  validateCountry,
  validateName,
  validatePostalCode,
  validateStreet,
  validateTown,
} from '../../src/index.js';
import { isCountryCode, normalizeCountry } from '../../src/address/countries.js';

describe('address fields (chapter 4.2.2, table 8)', () => {
  it.each([
    ['validateName', validateName, ADDRESS_MAX_LENGTH.name, 70, 'required'],
    ['validateStreet', validateStreet, ADDRESS_MAX_LENGTH.street, 70, 'valid'],
    ['validateBuildingNumber', validateBuildingNumber, ADDRESS_MAX_LENGTH.buildingNumber, 16, 'valid'],
    ['validatePostalCode', validatePostalCode, ADDRESS_MAX_LENGTH.postalCode, 16, 'required'],
    ['validateTown', validateTown, ADDRESS_MAX_LENGTH.town, 35, 'required'],
  ] as const)('%s: max. %i characters, blank is %s', (_, validate, maxLength, expectedMax, blank) => {
    expect(maxLength).toBe(expectedMax);
    expect(validate('x'.repeat(maxLength))).toBe('valid');
    expect(validate('x'.repeat(maxLength + 1))).toBe('too_long');
    expect(validate('  ')).toBe(blank);
    expect(validate(undefined)).toBe(blank);
    expect(validate('Zürich – Nord')).toBe('invalid_characters');
  });
});

describe('validateCountry', () => {
  it.each(['CH', 'li', ' ch ', 'XK'])('accepts %j', (country) => {
    expect(validateCountry(country)).toBe('valid');
  });

  // Upper-casing first would turn "ß" into "SS" (South Sudan), "ßa" into "SSA" and "ŉa" into "ʼNA".
  it.each(['ß', 'ßa', 'ŉa', 'CHE', 'C1', 'XX', 'C H'])('rejects %j as invalid_country', (country) => {
    expect(validateCountry(country)).toBe('invalid_country');
  });

  it.each([undefined, null, '', '  '])('reports %j as required', (country) => {
    expect(validateCountry(country)).toBe('required');
  });
});

describe('country codes', () => {
  it('lists the 249 ISO 3166-1 codes plus XK, once each, in alphabetical order', () => {
    const codes = listCountryCodes();
    expect(codes).toHaveLength(250);
    expect(new Set(codes).size).toBe(250);
    expect(codes).toEqual([...codes].sort());
  });

  it('expects upper-case codes', () => {
    expect(isCountryCode('CH')).toBe(true);
    expect(isCountryCode('ch')).toBe(false);
    expect(normalizeCountry(' ch ')).toBe('CH');
  });
});
