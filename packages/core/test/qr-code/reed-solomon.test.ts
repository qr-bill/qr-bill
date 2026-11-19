import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { errorCorrectionCodewords, generatorPolynomial, multiply } from '../../src/qr-code/reed-solomon.js';

const byte = fc.integer({ min: 0, max: 255 });

describe('GF(2^8) multiplication', () => {
  it('has 1 as identity and 0 as absorbing element', () => {
    fc.assert(
      fc.property(byte, (x) => {
        expect(multiply(x, 1)).toBe(x);
        expect(multiply(x, 0)).toBe(0);
      }),
    );
  });

  it('is commutative and associative, and stays within a byte', () => {
    fc.assert(
      fc.property(byte, byte, byte, (x, y, z) => {
        expect(multiply(x, y)).toBe(multiply(y, x));
        expect(multiply(multiply(x, y), z)).toBe(multiply(x, multiply(y, z)));
        expect(multiply(x, y)).toBeLessThan(256);
      }),
    );
  });

  it('has 0x02 as a generator: its 255th power is 1, and no lower power is', () => {
    let power = 1;
    for (let exponent = 1; exponent <= 255; exponent++) {
      power = multiply(power, 0x02);
      expect(power === 1).toBe(exponent === 255);
    }
  });
});

describe('Reed-Solomon error correction (ISO/IEC 18004, chapter 7.5)', () => {
  it('reproduces the example of the standard: "01234567" in version 1-M', () => {
    const data = [0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
    expect(errorCorrectionCodewords(data, generatorPolynomial(10))).toEqual([
      0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55,
    ]);
  });

  it('builds generator polynomials whose roots are the powers of 0x02', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), (degree) => {
        const coefficients = [1, ...generatorPolynomial(degree)];
        let root = 1;
        for (let i = 0; i < degree; i++) {
          // Horner's method: the polynomial evaluated at the root is 0.
          expect(coefficients.reduce((value, coefficient) => multiply(value, root) ^ coefficient, 0)).toBe(0);
          root = multiply(root, 0x02);
        }
      }),
    );
  });
});
