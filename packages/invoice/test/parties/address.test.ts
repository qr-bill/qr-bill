import type { Language } from '@qr-bill/core';
import { describe, expect, it } from 'vitest';
import { countryName, streetLine, townLine } from '../../src/parties/address.js';
import { ISSUER } from '../fixtures.js';

describe('streetLine', () => {
  it('joins the street and the building number', () => {
    expect(streetLine(ISSUER)).toBe('Musterstrasse 123');
    expect(streetLine({ ...ISSUER, buildingNumber: undefined })).toBe('Musterstrasse');
    expect(streetLine({ ...ISSUER, street: undefined })).toBe('123');
  });

  it('gives nothing without street nor number', () => {
    expect(streetLine({ ...ISSUER, street: undefined, buildingNumber: undefined })).toBeUndefined();
  });
});

describe('townLine', () => {
  it('joins the postal code and the town', () => {
    expect(townLine(ISSUER)).toBe('8000 Seldwyla');
  });
});

describe('countryName', () => {
  it.each<[Language, string, string]>([
    ['de', 'Deutschland', 'Schweiz'],
    ['fr', 'Allemagne', 'Suisse'],
    ['it', 'Germania', 'Svizzera'],
    ['en', 'Germany', 'Switzerland'],
    ['rm', 'Germania', 'Svizra'],
  ])('names the countries in %s', (language, germany, switzerland) => {
    expect(countryName('DE', language)).toBe(germany);
    expect(countryName('CH', language)).toBe(switzerland);
  });
});
