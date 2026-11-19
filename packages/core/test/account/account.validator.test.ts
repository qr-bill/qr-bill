import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isQRIBAN, isValidIBAN, validateAccount } from '../../src/index.js';
import { mod97 } from '../../src/checksum/mod97.js';

/** Builds a valid CH/LI IBAN from a country, a 5-digit IID and a 12-character account number. */
function makeIBAN(country: 'CH' | 'LI', iid: string, account: string): string {
  const bban = iid + account;
  const checkDigits = 98 - mod97(`${bban}${country}00`);
  return `${country}${String(checkDigits).padStart(2, '0')}${bban}`;
}

const digits = (n: number) => fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: n, maxLength: n });
const alphanumerics = (n: number) =>
  fc.string({ unit: fc.constantFrom(...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'), minLength: n, maxLength: n });

describe('isValidIBAN (chapters 2.9 and 4.2.2)', () => {
  it.each([
    'CH4431999123000889012',
    'CH6431961000004421557',
    'CH5204835012345671000',
    'CH5800791123000889012',
    'ch44 3199 9123 0008 8901 2',
  ])('accepts %s', (iban) => {
    expect(isValidIBAN(iban)).toBe(true);
  });

  it.each([
    ['wrong check digits', 'CH4531999123000889012'],
    ['country other than CH or LI', 'DE89370400440532013000'],
    ['too short', 'CH443199912300088901'],
    ['too long', 'CH44319991230008890123'],
    ['letters in the IID', 'CH44A1999123000889012'],
    ['empty', ''],
  ])('rejects an IBAN with %s', (_, iban) => {
    expect(isValidIBAN(iban)).toBe(false);
  });

  it('accepts every well-formed CH/LI IBAN and detects any substitution of a digit', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('CH' as const, 'LI' as const),
        digits(5),
        alphanumerics(12),
        fc.nat(16),
        (country, iid, account, position) => {
          const iban = makeIBAN(country, iid, account);
          expect(isValidIBAN(iban)).toBe(true);
          const index = 4 + position;
          const original = iban[index] ?? '0';
          // MOD 97-10 guarantees the detection of a digit replaced by another digit.
          fc.pre(/\d/.test(original));
          const replacement = original === '7' ? '8' : '7';
          expect(isValidIBAN(iban.slice(0, index) + replacement + iban.slice(index + 1))).toBe(false);
        },
      ),
    );
  });
});

describe('isQRIBAN (chapters 2.8 and 2.10)', () => {
  it.each([
    ['CH4431999123000889012', true],
    ['CH6431961000004421557', true],
    ['CH5204835012345671000', false],
    ['CH5800791123000889012', false],
  ])('%s → %s', (iban, expected) => {
    expect(isQRIBAN(iban)).toBe(expected);
  });

  it('uses exactly the QR-IID range 30000–31999', () => {
    expect(isQRIBAN(makeIBAN('CH', '29999', '000000000001'))).toBe(false);
    expect(isQRIBAN(makeIBAN('CH', '30000', '000000000001'))).toBe(true);
    expect(isQRIBAN(makeIBAN('CH', '31999', '000000000001'))).toBe(true);
    expect(isQRIBAN(makeIBAN('CH', '32000', '000000000001'))).toBe(false);
  });
});

describe('validateAccount', () => {
  it.each([
    ['a QR-IBAN', 'CH44 3199 9123 0008 8901 2', 'qr_iban'],
    ['an IBAN', 'ch58 0079 1123 0008 8901 2', 'iban'],
    ['a Liechtenstein IBAN', makeIBAN('LI', '08800', '000000000001'), 'iban'],
    ['wrong check digits', 'CH58 0079 1123 0008 8901 3', 'invalid_iban'],
    ['a German IBAN', 'DE89 3704 0044 0532 0130 00', 'invalid_iban'],
    ['an empty value', '', 'required'],
    ['a blank value', '   ', 'required'],
    ['null', null, 'required'],
    ['undefined', undefined, 'required'],
  ] as const)('%s → %s', (_, value, expected) => {
    expect(validateAccount(value)).toBe(expected);
  });
});
