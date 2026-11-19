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
 * Capacity of the Swiss QR Code: the versions it may use, 1 to 25 (SIX IG QR-bill v2.4, chapter 6.2), and how much
 * each one holds at error correction level M (chapter 6.1) in byte mode.
 *
 * @module
 */

/** The parameters of one version at error correction level M (ISO/IEC 18004, table 9). */
export interface VersionParameters {
  /** Version, from 1 to 25: the QR code has 4 × version + 17 modules on each side. */
  readonly version: number;
  /** Number of error correction codewords appended to each block. */
  readonly eccCodewordsPerBlock: number;
  /** Number of blocks the codewords are split into. */
  readonly blockCount: number;
}

/** The versions a Swiss QR Code may use, at level M. Version 25 is the largest allowed (chapter 6.2). */
const LEVEL_M: readonly VersionParameters[] = [
  { version: 1, eccCodewordsPerBlock: 10, blockCount: 1 },
  { version: 2, eccCodewordsPerBlock: 16, blockCount: 1 },
  { version: 3, eccCodewordsPerBlock: 26, blockCount: 1 },
  { version: 4, eccCodewordsPerBlock: 18, blockCount: 2 },
  { version: 5, eccCodewordsPerBlock: 24, blockCount: 2 },
  { version: 6, eccCodewordsPerBlock: 16, blockCount: 4 },
  { version: 7, eccCodewordsPerBlock: 18, blockCount: 4 },
  { version: 8, eccCodewordsPerBlock: 22, blockCount: 4 },
  { version: 9, eccCodewordsPerBlock: 22, blockCount: 5 },
  { version: 10, eccCodewordsPerBlock: 26, blockCount: 5 },
  { version: 11, eccCodewordsPerBlock: 30, blockCount: 5 },
  { version: 12, eccCodewordsPerBlock: 22, blockCount: 8 },
  { version: 13, eccCodewordsPerBlock: 22, blockCount: 9 },
  { version: 14, eccCodewordsPerBlock: 24, blockCount: 9 },
  { version: 15, eccCodewordsPerBlock: 24, blockCount: 10 },
  { version: 16, eccCodewordsPerBlock: 28, blockCount: 10 },
  { version: 17, eccCodewordsPerBlock: 28, blockCount: 11 },
  { version: 18, eccCodewordsPerBlock: 26, blockCount: 13 },
  { version: 19, eccCodewordsPerBlock: 26, blockCount: 14 },
  { version: 20, eccCodewordsPerBlock: 26, blockCount: 16 },
  { version: 21, eccCodewordsPerBlock: 26, blockCount: 17 },
  { version: 22, eccCodewordsPerBlock: 28, blockCount: 17 },
  { version: 23, eccCodewordsPerBlock: 28, blockCount: 18 },
  { version: 24, eccCodewordsPerBlock: 28, blockCount: 20 },
  { version: 25, eccCodewordsPerBlock: 28, blockCount: 21 },
];

/** Bits of the mode indicator, which says "byte mode" (ISO/IEC 18004, table 2). */
const MODE_INDICATOR_BITS = 4;

/**
 * Counts the modules of a version that carry codewords: all of them, minus the finder, timing and alignment
 * patterns, the format information and, from version 7, the version information.
 *
 * @param version - From 1 to 25.
 * @returns The number of modules, which may not be a multiple of 8: the remainder bits stay light.
 * @example
 * ```ts
 * rawDataModuleCount(1); // 208
 * ```
 */
export function rawDataModuleCount(version: number): number {
  let count = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignmentPatternsPerSide = Math.floor(version / 7) + 2;
    count -= (25 * alignmentPatternsPerSide - 10) * alignmentPatternsPerSide - 55;
    if (version >= 7) count -= 36;
  }
  return count;
}

/**
 * Counts the codewords of a version: data and error correction together.
 *
 * @param version - From 1 to 25.
 * @returns The number of 8-bit codewords.
 */
export function totalCodewordCount(version: number): number {
  return Math.floor(rawDataModuleCount(version) / 8);
}

/**
 * Counts the data codewords of a version at level M: the total minus the error correction codewords.
 *
 * @param parameters - The version and its blocks.
 * @returns The number of 8-bit data codewords.
 */
export function dataCodewordCount(parameters: VersionParameters): number {
  return totalCodewordCount(parameters.version) - parameters.eccCodewordsPerBlock * parameters.blockCount;
}

/**
 * Gives the length of the character count indicator in byte mode (ISO/IEC 18004, table 3).
 *
 * @param version - From 1 to 25.
 * @returns 8 bits up to version 9, 16 bits above.
 */
export function characterCountBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

/** Whether `byteLength` bytes, with the mode and character count indicators, fit in the data codewords. */
function fits(byteLength: number, parameters: VersionParameters): boolean {
  const requiredBits = MODE_INDICATOR_BITS + characterCountBits(parameters.version) + byteLength * 8;
  return requiredBits <= dataCodewordCount(parameters) * 8;
}

/**
 * Gives how many bytes of content a version holds at level M in byte mode.
 *
 * @param version - From 1 to 25.
 * @returns The capacity in bytes.
 * @throws {RangeError} When the version is not between 1 and 25.
 * @example
 * ```ts
 * byteCapacity(1); // 14
 * byteCapacity(25); // 997, the limit of the Swiss QR Code (chapter 6.2)
 * ```
 */
export function byteCapacity(version: number): number {
  const parameters = LEVEL_M.find((entry) => entry.version === version);
  if (parameters === undefined) {
    throw new RangeError(`A Swiss QR Code has a version from 1 to 25, received ${version}`);
  }
  const availableBits = dataCodewordCount(parameters) * 8 - MODE_INDICATOR_BITS - characterCountBits(version);
  return Math.floor(availableBits / 8);
}

/**
 * Chooses the smallest version that holds the content, as chapter 6.4 requires.
 *
 * @param byteLength - Size of the content, in bytes.
 * @returns The parameters of the version.
 * @throws {RangeError} When the content exceeds 997 bytes, the capacity of version 25.
 */
export function smallestVersion(byteLength: number): VersionParameters {
  const parameters = LEVEL_M.find((entry) => fits(byteLength, entry));
  if (parameters === undefined) {
    throw new RangeError(
      `The content of a Swiss QR Code is limited to 997 bytes (chapter 6.2), received ${byteLength}`,
    );
  }
  return parameters;
}
