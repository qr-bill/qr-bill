import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createQRReference, isValidQRReference } from '../../src/index.js';

describe('createQRReference (chapter 2.12.1, Annex B)', () => {
  it('reproduces the worked example of Annex B', () => {
    expect(createQRReference('21 00000 00003 13947 14300 0901')).toBe('210000000003139471430009017');
  });

  it('pads with zeros and accepts numbers and bigints', () => {
    expect(createQRReference(42)).toBe('000000000000000000000000420');
    expect(createQRReference(123)).toBe(createQRReference('00000000000000000000000123'));
    expect(createQRReference(123n)).toBe(createQRReference('123'));
  });

  it.each(['', '0', '000', 'A12', '1'.repeat(27)])('refuses to build from "%s"', (input) => {
    expect(() => createQRReference(input)).toThrow(RangeError);
  });

  it('always builds a valid 27-digit reference', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10n ** 26n - 1n }), (value) => {
        const reference = createQRReference(value);
        expect(reference).toHaveLength(27);
        expect(isValidQRReference(reference)).toBe(true);
      }),
    );
  });
});
