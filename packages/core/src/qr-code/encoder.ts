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
 * The Swiss QR Code (SIX IG QR-bill v2.4, chapter 6): the content of the bill encoded as a QR code in byte mode
 * (UTF-8), at error correction level M, in the smallest version that holds it.
 *
 * @module
 */

import { encodeUTF8 } from '../text/utf8.js';
import { smallestVersion } from './capacity.js';
import { dataCodewords, interleavedCodewords } from './codewords.js';
import { MASKS, QRMatrix } from './matrix.js';
import type { QRCode } from './qr-code.types.js';

/**
 * Encodes the content of a Swiss QR Code into the modules of a QR code:
 *
 * - byte mode, the content encoded in UTF-8, without ECI;
 * - error correction level M (chapter 6.1);
 * - the smallest version that holds the content, at most 25, i.e. 997 bytes (chapters 6.2 and 6.4);
 * - the mask with the lowest penalty, the lowest mask number on a tie (ISO/IEC 18004, chapter 7.8.3).
 *
 * The quiet zone, the size of 46 × 46 mm and the Swiss cross are added when the bill is laid out.
 *
 * @param payload - The content of the Swiss QR Code, normally `QRBill.payload`.
 * @returns The QR code, frozen.
 * @throws {RangeError} When the content exceeds 997 bytes, which a bill validated by
 *   {@link validateQRBill} cannot.
 * @example
 * ```ts
 * const qrCode = encodeSwissQRCode(createQRBill(input).payload);
 * qrCode.size; // 4 × version + 17 modules, e.g. 57 for version 10
 * qrCode.modules[0][0]; // true: the top left corner of a finder pattern is always dark
 * ```
 */
export function encodeSwissQRCode(payload: string): QRCode {
  const content = encodeUTF8(payload);
  const parameters = smallestVersion(content.length);
  const matrix = new QRMatrix(parameters.version);
  matrix.drawCodewords(interleavedCodewords(dataCodewords(content, parameters), parameters));

  // Try every mask; applying a mask a second time undoes it.
  const candidates = MASKS.map((condition, mask) => {
    matrix.applyMask(condition);
    matrix.drawFormatBits(mask);
    const penalty = matrix.penaltyScore();
    matrix.applyMask(condition);
    return { condition, mask, penalty };
  });
  const best = candidates.reduce((lowest, candidate) => (candidate.penalty < lowest.penalty ? candidate : lowest));
  matrix.applyMask(best.condition);
  matrix.drawFormatBits(best.mask);

  return Object.freeze({
    version: matrix.version,
    size: matrix.size,
    modules: Object.freeze(matrix.toRows().map((row) => Object.freeze(row))),
  });
}
