import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createQRReference, isValidCreditorReference, isValidQRReference, validateReference } from '../../src/index.js';

describe('isValidQRReference (chapter 2.12.1, Annex B)', () => {
  it.each(['210000000003139471430009017', '000008207791225857421286694', '21 00000 00003 13947 14300 09017'])(
    'accepts %s',
    (reference) => {
      expect(isValidQRReference(reference)).toBe(true);
    },
  );

  it.each([
    ['a wrong check digit', '210000000003139471430009018'],
    ['only zeros', '000000000000000000000000000'],
    ['26 digits', '21000000000313947143000901'],
    ['a letter', '21000000000313947143000901A'],
  ])('rejects a reference with %s', (_, reference) => {
    expect(isValidQRReference(reference)).toBe(false);
  });

  it('detects any single-digit error', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 26n - 1n }),
        fc.nat(26),
        fc.integer({ min: 1, max: 9 }),
        (value, position, shift) => {
          const reference = createQRReference(value);
          const digit = (Number(reference[position]) + shift) % 10;
          const altered = reference.slice(0, position) + String(digit) + reference.slice(position + 1);
          expect(isValidQRReference(altered)).toBe(false);
        },
      ),
    );
  });
});

describe('isValidCreditorReference (chapter 2.12.2, ISO 11649)', () => {
  it.each(['RF18539007547034', 'RF240191230100405JSH0438', 'rf18 5390 0754 7034', 'RF18 5390 0754 7034'])(
    'accepts %s',
    (reference) => {
      expect(isValidCreditorReference(reference)).toBe(true);
    },
  );

  it.each([
    ['wrong check digits', 'RF19539007547034'],
    ['no body', 'RF18'],
    ['a body over 21 characters', `RF18${'1'.repeat(22)}`],
    ['a forbidden character', 'RF18-539007547034'],
    ['another prefix', 'XX18539007547034'],
    // Example 4 of the standard prints this reference; its check digits are wrong (see the conformance file).
    ['the check digits printed in example 4', 'RF720191230100405JSH0438'],
  ])('rejects a reference with %s', (_, reference) => {
    expect(isValidCreditorReference(reference)).toBe(false);
  });
});

describe('validateReference', () => {
  it.each([
    ['a QR reference', '21 00000 00003 13947 14300 09017', 'QRR'],
    ['a Creditor Reference', 'rf18 5390 0754 7034', 'SCOR'],
    ['an empty value', '', 'NON'],
    ['a blank value', '  ', 'NON'],
    ['null', null, 'NON'],
    ['undefined', undefined, 'NON'],
    ['too few digits', '123', 'invalid_reference'],
    ['a wrong Creditor Reference', 'RF00539007547034', 'invalid_reference'],
    ['an invoice number', 'INV-2026-11', 'invalid_reference'],
  ] as const)('%s → %s', (_, value, expected) => {
    expect(validateReference(value)).toBe(expected);
  });
});
