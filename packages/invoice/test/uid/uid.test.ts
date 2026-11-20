import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatUID, hasValidCheckDigit, uidDigits } from '../../src/uid/uid.js';
import { validateUID } from '../../src/uid/uid.validator.js';

/** The check digit of eight digits with the weights 5, 4, 3, 2, 7, 6, 5, 4 (eCH-0097); 10 means no UID. */
function checkDigit(digits: string): number {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4];
  const sum = weights.reduce((total, weight, index) => total + weight * Number(digits[index]), 0);
  return (11 - (sum % 11)) % 11;
}

/** Eight digits whose check digit exists, with it: a valid UID. */
const validDigits = fc
  .stringMatching(/^\d{8}$/)
  .filter((digits) => checkDigit(digits) !== 10)
  .map((digits) => `${digits}${checkDigit(digits)}`);

describe('validateUID', () => {
  it('accepts a UID with its check digit, written in the usual ways', () => {
    expect(validateUID('CHE-123.456.788')).toBe('valid');
    expect(validateUID('CHE123456788')).toBe('valid');
    expect(validateUID('che 123 456 788')).toBe('valid');
    expect(validateUID(' CHE-123.456.788 MWST ')).toBe('valid');
    expect(validateUID('CHE-123.456.788 TVA')).toBe('valid');
    expect(validateUID('CHE-123.456.788 IVA')).toBe('valid');
  });

  it('reports a blank value as required', () => {
    expect(validateUID(undefined)).toBe('required');
    expect(validateUID(null)).toBe('required');
    expect(validateUID('   ')).toBe('required');
  });

  it('rejects a wrong check digit, a wrong prefix or a wrong number of digits', () => {
    expect(validateUID('CHE-123.456.789')).toBe('invalid_uid');
    expect(validateUID('CHF-123.456.788')).toBe('invalid_uid');
    expect(validateUID('CHE-123.456.78')).toBe('invalid_uid');
    expect(validateUID('CHE-123.456.7888')).toBe('invalid_uid');
    expect(validateUID('123.456.788')).toBe('invalid_uid');
  });

  it('rejects eight digits whose remainder gives 10: no UID uses them', () => {
    const digits = '00000003'; // weighted sum 12: 11 − (12 mod 11) = 10
    expect(checkDigit(digits)).toBe(10);
    for (let last = 0; last <= 9; last++) expect(validateUID(`CHE${digits}${last}`)).toBe('invalid_uid');
  });

  it('accepts every UID built with its check digit, and detects any change of a single digit', () => {
    fc.assert(
      fc.property(validDigits, fc.nat(8), fc.integer({ min: 1, max: 9 }), (digits, position, change) => {
        expect(validateUID(`CHE${digits}`)).toBe('valid');
        const changed = (Number(digits[position]) + change) % 10;
        const altered = `${digits.slice(0, position)}${changed}${digits.slice(position + 1)}`;
        expect(validateUID(`CHE${altered}`)).toBe('invalid_uid');
      }),
    );
  });
});

describe('uidDigits, hasValidCheckDigit and formatUID', () => {
  it('reads the nine digits of a UID', () => {
    expect(uidDigits('che-123.456.788 TVA')).toBe('123456788');
    expect(uidDigits('CHE-123.456')).toBeUndefined();
    expect(hasValidCheckDigit('123456788')).toBe(true);
    expect(hasValidCheckDigit('123456789')).toBe(false);
  });

  it('writes a UID in its usual form, and refuses an invalid one', () => {
    expect(formatUID(' che 123 456 788 mwst ')).toBe('CHE-123.456.788');
    expect(() => formatUID('CHE-123.456.789')).toThrow(new RangeError('Invalid UID: "CHE-123.456.789"'));
    expect(() => formatUID('nothing')).toThrow(RangeError);
  });
});
