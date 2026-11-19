import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatAmount, fromCents, normalizeAmount } from '../../src/index.js';

describe('normalizeAmount', () => {
  it.each([
    ['1949.75', '1949.75'],
    ['50', '50.00'],
    ['50.5', '50.50'],
    [' 0.1 ', '0.10'],
    ['007.50', '7.50'],
    ['999999999.99', '999999999.99'],
    [1949.75, '1949.75'],
    [50, '50.00'],
    [0.1, '0.10'],
  ])('%j → %s', (input, expected) => {
    expect(normalizeAmount(input)).toBe(expected);
  });

  it.each(['', '1,50', '1.505', '-1', '1e3', '1 000', 'abc', '.5', '5.'])('rejects "%s"', (input) => {
    expect(normalizeAmount(input)).toBeUndefined();
  });

  it.each([0.1 + 0.2, Number.NaN, Number.POSITIVE_INFINITY, -1, 1.005])('rejects the number %d', (input) => {
    expect(normalizeAmount(input)).toBeUndefined();
  });

  it('agrees with fromCents for every number of cents in range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99_999_999_999 }), (cents) => {
        expect(normalizeAmount(fromCents(cents))).toBe(fromCents(cents));
      }),
    );
  });
});

describe('fromCents', () => {
  it.each([
    [194975, '1949.75'],
    [5, '0.05'],
    [0, '0.00'],
    [99_999_999_999n, '999999999.99'],
  ])('%s → %s', (cents, expected) => {
    expect(fromCents(cents)).toBe(expected);
  });

  it.each([1.5, -1, Number.MAX_SAFE_INTEGER + 2])('rejects %d', (cents) => {
    expect(() => fromCents(cents)).toThrow(RangeError);
  });

  it('rejects negative bigints', () => {
    expect(() => fromCents(-1n)).toThrow(RangeError);
  });
});

describe('formatAmount (chapter 3.5.3)', () => {
  it.each([
    ['1590', '1 590.00'],
    ['0.1', '0.10'],
    ['999999999.99', '999 999 999.99'],
    [1949.75, '1 949.75'],
  ])('%j → %s', (input, expected) => {
    expect(formatAmount(input)).toBe(expected);
  });

  it('throws on an invalid amount', () => {
    expect(() => formatAmount('1,50')).toThrow(RangeError);
  });
});
