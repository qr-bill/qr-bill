import { describe, expect, it } from 'vitest';
import { validateQRBill } from '../../src/index.js';
import { CREDITOR_REFERENCE, IBAN, QR_IBAN, QR_REFERENCE, base, codes, issueAt } from '../fixtures.js';

// The rules of each field are tested with its validator. These tests check that validateQRBill applies them to
// the right field, reports them with the right path and message, and checks the bill as a whole.

describe('validateQRBill: types and required fields', () => {
  it.each([null, 'bill', 42, []])('rejects %j as a whole', (input) => {
    expect(codes(input)).toEqual(['invalid_type']);
  });

  it('requires the creditor, its account and its address', () => {
    expect(codes({ currency: 'CHF' })).toEqual(['required']);
    expect(issueAt({ ...base, creditor: 'Muster Krankenkasse' }, 'creditor')).toEqual(['invalid_type']);
    for (const account of ['', '   ', null, undefined]) {
      expect(issueAt({ ...base, creditor: { ...base.creditor, account } }, 'creditor.account')).toEqual(['required']);
    }
    for (const field of ['name', 'postalCode', 'town', 'country'] as const) {
      expect(issueAt({ ...base, creditor: { ...base.creditor, [field]: undefined } }, `creditor.${field}`)).toEqual([
        'required',
      ]);
    }
  });

  it('requires name, postal code, town and country of a debtor, not street nor building number', () => {
    expect(codes({ ...base, debtor: { name: 'A', postalCode: '8000', town: 'Seldwyla', country: 'CH' } })).toEqual([]);
    expect(issueAt({ ...base, debtor: { ...base.debtor, town: ' ' } }, 'debtor.town')).toEqual(['required']);
  });

  it('reports wrong types per field', () => {
    expect(issueAt({ ...base, amount: true }, 'amount')).toEqual(['invalid_type']);
    expect(issueAt({ ...base, reference: 12 }, 'reference')).toEqual(['invalid_type']);
    expect(issueAt({ ...base, message: 12 }, 'message')).toEqual(['invalid_type']);
    expect(issueAt({ ...base, creditor: { ...base.creditor, account: 12 } }, 'creditor.account')).toEqual([
      'invalid_type',
    ]);
    expect(issueAt({ ...base, creditor: { ...base.creditor, country: 41 } }, 'creditor.country')).toEqual([
      'invalid_type',
    ]);
    expect(issueAt({ ...base, alternativeProcedures: 'eBill' }, 'alternativeProcedures')).toEqual(['invalid_type']);
    expect(issueAt({ ...base, alternativeProcedures: [42] }, 'alternativeProcedures.0')).toEqual(['invalid_type']);
  });
});

describe('validateQRBill: fields', () => {
  it('reports a too long field with its maximum length', () => {
    const result = validateQRBill({ ...base, creditor: { ...base.creditor, town: 'x'.repeat(36) } });
    expect(result.success ? [] : result.issues).toEqual([
      { code: 'too_long', path: ['creditor', 'town'], message: 'At most 35 characters, received 36' },
    ]);
  });

  it('lists the characters that are not allowed', () => {
    const result = validateQRBill({ ...base, message: 'Facture – novembre' });
    expect(result.success ? [] : result.issues).toEqual([
      { code: 'invalid_characters', path: ['message'], message: 'Characters not allowed in the Swiss QR Code: "–"' },
    ]);
  });

  it('validates country codes before upper-casing them', () => {
    expect(validateQRBill({ ...base, creditor: { ...base.creditor, country: ' li ' } })).toMatchObject({
      success: true,
      data: { creditor: { country: 'LI' } },
    });
    for (const country of ['ß', 'ßa', 'ŉa', 'CHE']) {
      expect(codes({ ...base, creditor: { ...base.creditor, country } })).toEqual(['invalid_country']);
      expect(issueAt({ ...base, debtor: { ...base.debtor, country } }, 'debtor.country')).toEqual(['invalid_country']);
    }
  });

  it('reports an invalid IBAN', () => {
    expect(
      issueAt({ ...base, creditor: { ...base.creditor, account: 'DE89370400440532013000' } }, 'creditor.account'),
    ).toEqual(['invalid_iban']);
  });

  it('reports invalid and out-of-range amounts', () => {
    expect(codes({ ...base, amount: '1,50' })).toEqual(['invalid_amount']);
    expect(codes({ ...base, amount: '1000000000' })).toEqual(['amount_out_of_range']);
  });

  it('allows 0.00 only for a "DO NOT USE FOR PAYMENT" notification (chapter 4.4)', () => {
    expect(codes({ ...base, amount: '0.00', message: 'NE PAS UTILISER POUR LE PAIEMENT' })).toEqual([]);
    expect(codes({ ...base, amount: '0.00', message: 'Ne pas utiliser' })).toEqual(['amount_out_of_range']);
    expect(codes({ ...base, amount: '0.00' })).toEqual(['amount_out_of_range']);
  });

  it('limits message and billing information to 140 characters together (chapter 4.3.3)', () => {
    expect(codes({ ...base, message: 'x'.repeat(100), billingInformation: `//S1/${'1'.repeat(35)}` })).toEqual([]);
    expect(codes({ ...base, message: 'x'.repeat(100), billingInformation: `//S1/${'1'.repeat(36)}` })).toEqual([
      'additional_information_too_long',
    ]);
  });

  it('requires billing information to start with "//" and a syntax code', () => {
    expect(issueAt({ ...base, billingInformation: 'S1/10/1234' }, 'billingInformation')).toEqual([
      'invalid_billing_information',
    ]);
  });

  it('accepts at most two alternative procedures and ignores blank entries', () => {
    expect(codes({ ...base, alternativeProcedures: ['a', 'b', 'c'] })).toEqual(['too_many_alternative_procedures']);
    expect(validateQRBill({ ...base, alternativeProcedures: ['eBill/B/a@b.ch', '  ', 'XY/1'] })).toMatchObject({
      success: true,
      data: { alternativeProcedures: ['eBill/B/a@b.ch', 'XY/1'] },
    });
    expect(issueAt({ ...base, alternativeProcedures: ['x'.repeat(101)] }, 'alternativeProcedures.0')).toEqual([
      'too_long',
    ]);
  });

  it('rejects a Swiss QR Code content over 997 bytes', () => {
    const wide = 'ő'.repeat(70);
    const address = {
      name: wide,
      street: wide,
      buildingNumber: 'ő'.repeat(16),
      postalCode: 'ő'.repeat(16),
      town: 'ő'.repeat(35),
      country: 'CH',
    };
    expect(
      codes({
        ...base,
        creditor: { ...address, account: IBAN },
        debtor: address,
        message: 'ő'.repeat(140),
        alternativeProcedures: ['ő'.repeat(100), 'ő'.repeat(100)],
      }),
    ).toEqual(['payload_too_long']);
  });
});

describe('validateQRBill: account, reference and currency (chapter 4.3.2)', () => {
  it.each([
    ['IBAN without reference', { account: IBAN }, []],
    ['IBAN + Creditor Reference', { account: IBAN, reference: CREDITOR_REFERENCE }, []],
    ['QR-IBAN + QR reference', { account: QR_IBAN, reference: QR_REFERENCE }, []],
    ['IBAN + QR reference', { account: IBAN, reference: QR_REFERENCE }, ['qr_reference_requires_qr_iban']],
    ['QR-IBAN without reference', { account: QR_IBAN }, ['qr_iban_requires_qr_reference']],
    [
      'QR-IBAN + Creditor Reference',
      { account: QR_IBAN, reference: CREDITOR_REFERENCE },
      ['qr_iban_requires_qr_reference'],
    ],
    ['QR-IBAN + invalid reference', { account: QR_IBAN, reference: '123' }, ['invalid_reference']],
    ['IBAN + invalid Creditor Reference', { account: IBAN, reference: 'RF00539007547034' }, ['invalid_reference']],
  ] as const)('%s', (_, { account, ...rest }, expected) => {
    expect(codes({ ...base, creditor: { ...base.creditor, account }, ...rest })).toEqual(expected);
  });

  it('reserves QR-IBAN and QR reference for CHF since v2.4', () => {
    expect(
      codes({ ...base, currency: 'EUR', creditor: { ...base.creditor, account: QR_IBAN }, reference: QR_REFERENCE }),
    ).toEqual(['qr_iban_requires_chf']);
    expect(codes({ ...base, currency: 'EUR', reference: CREDITOR_REFERENCE })).toEqual([]);
  });

  it('rejects any other currency', () => {
    expect(issueAt({ ...base, currency: 'USD' }, 'currency')).toEqual(['invalid_currency']);
  });
});
