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
 * Codewords of the Swiss QR Code (ISO/IEC 18004, chapters 7.4 to 7.6): the content as a bit stream in byte mode,
 * padded to the capacity of the version, then split into blocks, each completed with its error correction
 * codewords, and interleaved.
 *
 * @module
 */

import { type VersionParameters, characterCountBits, dataCodewordCount, totalCodewordCount } from './capacity.js';
import { errorCorrectionCodewords, generatorPolynomial } from './reed-solomon.js';

/** Mode indicator of the byte mode, 0100 (ISO/IEC 18004, table 2). */
const BYTE_MODE = 0b0100;

/** The two pad codewords, 11101100 and 00010001, used alternately to fill the capacity (ISO/IEC 18004, 7.4.10). */
const FIRST_PAD_CODEWORD = 0xec;
const SECOND_PAD_CODEWORD = 0x11;

/** Appends the `length` lowest bits of `value` to `bits`, the most significant first. */
function appendBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

/**
 * Encodes the content into the data codewords of a version: mode indicator, character count, the bytes, a
 * terminator of up to four 0 bits, 0 bits up to the next byte, then pad codewords up to the capacity.
 *
 * @param content - The bytes to encode (the UTF-8 encoding of the Swiss QR Code content).
 * @param parameters - The version, which must hold the content (see {@link smallestVersion}).
 * @returns Exactly as many codewords as the version holds data codewords.
 */
export function dataCodewords(content: Uint8Array, parameters: VersionParameters): number[] {
  const capacity = dataCodewordCount(parameters);
  const bits: number[] = [];
  appendBits(bits, BYTE_MODE, 4);
  appendBits(bits, content.length, characterCountBits(parameters.version));
  for (const byte of content) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, capacity * 8 - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((codeword, bit) => (codeword << 1) | bit, 0));
  }
  for (let i = 0; codewords.length < capacity; i++) {
    codewords.push(i % 2 === 0 ? FIRST_PAD_CODEWORD : SECOND_PAD_CODEWORD);
  }
  return codewords;
}

/**
 * Splits the data codewords into the blocks of the version, computes the error correction codewords of each block,
 * and interleaves them: the first data codeword of each block, then the second… then the error correction
 * codewords the same way (ISO/IEC 18004, chapter 7.6). The last blocks hold one more data codeword when the total
 * does not divide evenly.
 *
 * @param data - The data codewords, see {@link dataCodewords}.
 * @param parameters - The version.
 * @returns All the codewords, in the order they are placed in the QR code.
 */
export function interleavedCodewords(data: readonly number[], parameters: VersionParameters): number[] {
  const { version, eccCodewordsPerBlock, blockCount } = parameters;
  const total = totalCodewordCount(version);
  const shortBlockCount = blockCount - (total % blockCount);
  const shortBlockDataLength = Math.floor(total / blockCount) - eccCodewordsPerBlock;

  const dataBlocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < blockCount; i++) {
    const length = shortBlockDataLength + (i < shortBlockCount ? 0 : 1);
    dataBlocks.push(data.slice(offset, offset + length));
    offset += length;
  }
  const generator = generatorPolynomial(eccCodewordsPerBlock);
  const eccBlocks = dataBlocks.map((block) => errorCorrectionCodewords(block, generator));
  return [...interleave(dataBlocks), ...interleave(eccBlocks)];
}

/** Takes the first codeword of every block, then the second of every block, and so on; short blocks end first. */
function interleave(blocks: readonly (readonly number[])[]): number[] {
  const longest = Math.max(...blocks.map((block) => block.length));
  const result: number[] = [];
  for (let i = 0; i < longest; i++) {
    for (const block of blocks) {
      const codeword = block[i];
      if (codeword !== undefined) result.push(codeword);
    }
  }
  return result;
}
