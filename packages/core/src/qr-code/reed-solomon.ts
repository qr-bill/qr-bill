/*
 * Adapted from the QR Code generator library of Project Nayuki (TypeScript, commit 9a217d4,
 * https://github.com/nayuki/QR-Code-generator), reduced to what the Swiss QR Code needs.
 *
 * Copyright (c) Project Nayuki. (MIT License)
 * https://www.nayuki.io/page/qr-code-generator-library
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */

/**
 * Reed-Solomon error correction of the QR code (ISO/IEC 18004, chapter 7.5): arithmetic in the Galois field
 * GF(2^8) built on the polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D), generator polynomials and error correction
 * codewords. Thanks to them, a QR code at level M can be read with about 15 % of its codewords damaged.
 *
 * @module
 */

/** x^8 + x^4 + x^3 + x^2 + 1, the polynomial that defines GF(2^8) for QR codes. */
const FIELD_POLYNOMIAL = 0x11d;

/**
 * Multiplies two elements of GF(2^8), i.e. two bytes, modulo the field polynomial.
 *
 * @param x - A byte.
 * @param y - A byte.
 * @returns Their product, a byte.
 * @example
 * ```ts
 * multiply(0x02, 0x80); // 0x1d: x times x^7 is x^8, which reduces to x^4 + x^3 + x^2 + 1
 * ```
 */
export function multiply(x: number, y: number): number {
  // Russian peasant multiplication, from the highest bit of y down.
  let product = 0;
  for (let bit = 7; bit >= 0; bit--) {
    product = (product << 1) ^ ((product >>> 7) * FIELD_POLYNOMIAL);
    product ^= ((y >>> bit) & 1) * x;
  }
  return product;
}

/**
 * Computes the generator polynomial of the given degree: (x − r^0)(x − r^1)…(x − r^(degree − 1)), where r = 0x02
 * generates the field.
 *
 * @param degree - The number of error correction codewords per block.
 * @returns The coefficients, from the highest power to the lowest, without the leading 1.
 * @example
 * ```ts
 * generatorPolynomial(2); // [3, 2]: (x − 1)(x − 2) is x^2 + 3x + 2
 * ```
 */
export function generatorPolynomial(degree: number): number[] {
  let coefficients = [...Array.from({ length: degree - 1 }, () => 0), 1];
  let root = 1;
  for (let i = 0; i < degree; i++) {
    // Multiply the product so far by (x − root); in GF(2^8), subtraction is XOR.
    const previous = coefficients;
    coefficients = previous.map((coefficient, j) => multiply(coefficient, root) ^ (previous[j + 1] ?? 0));
    root = multiply(root, 0x02);
  }
  return coefficients;
}

/**
 * Computes the error correction codewords of a block: the remainder of the division of the data by the generator
 * polynomial.
 *
 * @param data - The data codewords of the block.
 * @param generator - The generator polynomial, see {@link generatorPolynomial}.
 * @returns As many error correction codewords as the degree of the generator.
 */
export function errorCorrectionCodewords(data: readonly number[], generator: readonly number[]): number[] {
  return data.reduce<number[]>(
    (remainder, codeword) => {
      const [head = 0, ...tail] = remainder;
      const factor = codeword ^ head;
      return generator.map((coefficient, i) => multiply(coefficient, factor) ^ (tail[i] ?? 0));
    },
    generator.map(() => 0),
  );
}
