import { describe, expect, it } from 'vitest';
import {
  DO_NOT_USE_FOR_PAYMENT,
  isAdditionalInformationWithinLimit,
  isCurrencyAllowedForAccount,
  isZeroAmountAllowed,
  validateReferenceForAccount,
} from '../../src/index.js';

describe('validateReferenceForAccount (chapter 4.3.2)', () => {
  it.each([
    ['qr_iban', 'QRR', 'valid'],
    ['qr_iban', 'SCOR', 'qr_iban_requires_qr_reference'],
    ['qr_iban', 'NON', 'qr_iban_requires_qr_reference'],
    ['iban', 'QRR', 'qr_reference_requires_qr_iban'],
    ['iban', 'SCOR', 'valid'],
    ['iban', 'NON', 'valid'],
  ] as const)('%s + %s → %s', (account, reference, expected) => {
    expect(validateReferenceForAccount(account, reference)).toBe(expected);
  });
});

describe('isCurrencyAllowedForAccount (chapter 4.3.2, v2.4)', () => {
  it.each([
    ['qr_iban', 'CHF', true],
    ['qr_iban', 'EUR', false],
    ['iban', 'CHF', true],
    ['iban', 'EUR', true],
  ] as const)('%s in %s → %s', (account, currency, expected) => {
    expect(isCurrencyAllowedForAccount(account, currency)).toBe(expected);
  });
});

describe('isAdditionalInformationWithinLimit (chapter 4.3.3)', () => {
  it('allows 140 characters in total, surrounding spaces not counted', () => {
    expect(isAdditionalInformationWithinLimit('x'.repeat(100), `//S1/${'1'.repeat(35)}`)).toBe(true);
    expect(isAdditionalInformationWithinLimit(` ${'x'.repeat(140)} `, undefined)).toBe(true);
    expect(isAdditionalInformationWithinLimit(null, null)).toBe(true);
  });

  it('rejects 141 characters in total', () => {
    expect(isAdditionalInformationWithinLimit('x'.repeat(100), `//S1/${'1'.repeat(36)}`)).toBe(false);
  });
});

describe('isZeroAmountAllowed (chapter 4.4, table 10)', () => {
  it.each(DO_NOT_USE_FOR_PAYMENT)('allows 0.00 with "%s"', (message) => {
    expect(isZeroAmountAllowed(message)).toBe(true);
  });

  it('has the five languages', () => {
    expect(DO_NOT_USE_FOR_PAYMENT).toEqual([
      'NICHT ZUR ZAHLUNG VERWENDEN',
      'NE PAS UTILISER POUR LE PAIEMENT',
      'NON UTILIZZARE PER IL PAGAMENTO',
      'DO NOT USE FOR PAYMENT',
      'BETG DUVRAR PER IL PAJAMENT',
    ]);
  });

  it.each(['Ne pas utiliser pour le paiement', 'Do not pay', '', undefined])('refuses 0.00 with %j', (message) => {
    expect(isZeroAmountAllowed(message)).toBe(false);
  });

  it('ignores surrounding spaces', () => {
    expect(isZeroAmountAllowed('  DO NOT USE FOR PAYMENT ')).toBe(true);
  });
});
