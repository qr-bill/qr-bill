import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fromCents, isValidCurrency, validateAmount } from '../../src/index.js';
import { isAmountInRange } from '../../src/amount/amount.validator.js';

describe('isValidCurrency', () => {
  it.each([
    ['CHF', true],
    ['EUR', true],
    ['chf', false],
    ['USD', false],
    [undefined, false],
  ])('%j → %s', (value, expected) => {
    expect(isValidCurrency(value)).toBe(expected);
  });
});

describe('isAmountInRange', () => {
  it.each([
    ['0.01', true],
    ['999999999.99', true],
    ['0.00', false],
    ['1000000000.00', false],
  ])('%s → %s', (amount, expected) => {
    expect(isAmountInRange(amount)).toBe(expected);
  });
});

describe('validateAmount (chapters 3.5.3, 4.2.2 and 4.4)', () => {
  it.each([
    ['1949.75', 'valid'],
    [1949.75, 'valid'],
    ['0.01', 'valid'],
    ['999999999.99', 'valid'],
    ['', 'valid'],
    ['  ', 'valid'],
    [null, 'valid'],
    [undefined, 'valid'],
    ['0', 'zero'],
    ['0.00', 'zero'],
    [0, 'zero'],
    ['1,50', 'invalid_amount'],
    ['-1', 'invalid_amount'],
    [0.1 + 0.2, 'invalid_amount'],
    ['1000000000', 'amount_out_of_range'],
  ] as const)('%j → %s', (value, expected) => {
    expect(validateAmount(value)).toBe(expected);
  });

  it('accepts every number of cents in range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99_999_999_999 }), (cents) => {
        expect(validateAmount(fromCents(cents))).toBe('valid');
      }),
    );
  });
});
