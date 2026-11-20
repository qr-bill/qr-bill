import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatMoney, parseDecimal, roundDiv, toDecimal, toShortDecimal } from '../../src/amounts/money.js';

describe('parseDecimal', () => {
  it('reads strings and numbers into integers of the unit asked', () => {
    expect(parseDecimal('12.5', 2)).toBe(1250n);
    expect(parseDecimal(' -12.50 ', 2)).toBe(-1250n);
    expect(parseDecimal('7', 3)).toBe(7000n);
    expect(parseDecimal(0.125, 4)).toBe(1250n);
    expect(parseDecimal(-3, 0)).toBe(-3n);
    expect(parseDecimal('0', 2)).toBe(0n);
  });

  it('refuses too many decimals, other forms and other types', () => {
    expect(parseDecimal('12.505', 2)).toBeUndefined();
    expect(parseDecimal(0.1 + 0.2, 2)).toBeUndefined();
    expect(parseDecimal(1e21, 2)).toBeUndefined();
    expect(parseDecimal(Number.NaN, 2)).toBeUndefined();
    expect(parseDecimal(Number.POSITIVE_INFINITY, 2)).toBeUndefined();
    for (const text of ['', '12,50', '1 000', '+5', '.5', '5.', '1e3', 'abc', '--1']) {
      expect(parseDecimal(text, 2)).toBeUndefined();
    }
    expect(parseDecimal(null, 2)).toBeUndefined();
    expect(parseDecimal(12n, 2)).toBeUndefined();
  });

  it('reads back what toDecimal writes', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -(10n ** 15n), max: 10n ** 15n }),
        fc.integer({ min: 0, max: 4 }),
        (units, scale) => {
          expect(parseDecimal(toDecimal(units, scale), scale)).toBe(units);
        },
      ),
    );
  });
});

describe('roundDiv', () => {
  it('rounds half away from zero', () => {
    expect(roundDiv(5n, 2n)).toBe(3n);
    expect(roundDiv(-5n, 2n)).toBe(-3n);
    expect(roundDiv(5n, -2n)).toBe(-3n);
    expect(roundDiv(-5n, -2n)).toBe(3n);
    expect(roundDiv(7n, 3n)).toBe(2n);
    expect(roundDiv(-7n, 3n)).toBe(-2n);
    expect(roundDiv(8n, 3n)).toBe(3n);
    expect(roundDiv(6n, 3n)).toBe(2n);
  });

  it('is within half a unit of the exact quotient', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        fc.boolean(),
        (numerator, magnitude, negative) => {
          const denominator = negative ? -magnitude : magnitude;
          const rounded = roundDiv(numerator, denominator);
          // |rounded × d − n| ≤ |d| / 2
          const error = rounded * denominator - numerator;
          expect(2n * (error < 0n ? -error : error) <= magnitude).toBe(true);
        },
      ),
    );
  });
});

describe('toDecimal and toShortDecimal', () => {
  it('writes integers with their decimals', () => {
    expect(toDecimal(-9000n, 2)).toBe('-90.00');
    expect(toDecimal(5n, 2)).toBe('0.05');
    expect(toDecimal(-5n, 2)).toBe('-0.05');
    expect(toDecimal(42n, 0)).toBe('42');
    expect(toShortDecimal(810n, 2)).toBe('8.1');
    expect(toShortDecimal(800n, 2)).toBe('8');
    expect(toShortDecimal(1500n, 3)).toBe('1.5');
    expect(toShortDecimal(1250000n, 4, 2)).toBe('125.00');
    expect(toShortDecimal(1250n, 4, 2)).toBe('0.125');
    expect(toShortDecimal(7n, 0)).toBe('7');
  });
});

describe('formatMoney', () => {
  it('groups thousands with a space or an apostrophe', () => {
    expect(formatMoney('1234.50', 'space')).toBe('1 234.50');
    expect(formatMoney('-1234.50', 'space')).toBe('-1 234.50');
    expect(formatMoney('1234567.00', 'apostrophe')).toBe("1'234'567.00");
    expect(formatMoney('999.99', 'apostrophe')).toBe('999.99');
    expect(formatMoney('0.00', 'space')).toBe('0.00');
    expect(formatMoney('-999999999.99', 'space')).toBe('-999 999 999.99');
  });
});
