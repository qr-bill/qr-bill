/**
 * UTF-8 encoding, the encoding of the Swiss QR Code (coding type 1, chapter 4.2.2). Written by hand because
 * `TextEncoder` is not part of the ECMAScript standard library and the core must not depend on a browser or Node.
 *
 * @module
 */

import { codePoints } from './charset.js';

/** Number of bytes a code point takes in UTF-8: 1 for ASCII, 2 up to U+07FF, 3 up to U+FFFF, 4 beyond. */
function byteLength(codePoint: number): number {
  return codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
}

/**
 * Measures a text in UTF-8 bytes, the unit of the capacity of a QR code.
 *
 * @param text - Any string.
 * @returns The number of bytes of `text` once UTF-8 encoded.
 * @example
 * ```ts
 * utf8Length('Zürich'); // 7: "ü" takes two bytes
 * ```
 */
export function utf8Length(text: string): number {
  return codePoints(text).reduce((total, codePoint) => total + byteLength(codePoint), 0);
}

/**
 * Encodes a text in UTF-8, exactly like `TextEncoder` does.
 *
 * @param text - Any string. A lone surrogate (invalid UTF-16) is encoded as U+FFFD, the replacement character.
 * @returns The UTF-8 bytes of `text`.
 */
export function encodeUTF8(text: string): Uint8Array {
  const points = codePoints(text).map((codePoint) => (codePoint >= 0xd800 && codePoint <= 0xdfff ? 0xfffd : codePoint));
  const bytes = new Uint8Array(points.reduce((total, codePoint) => total + byteLength(codePoint), 0));
  let offset = 0;
  for (const codePoint of points) {
    if (codePoint < 0x80) {
      bytes[offset++] = codePoint;
    } else if (codePoint < 0x800) {
      bytes[offset++] = 0xc0 | (codePoint >> 6);
      bytes[offset++] = 0x80 | (codePoint & 0x3f);
    } else if (codePoint < 0x10000) {
      bytes[offset++] = 0xe0 | (codePoint >> 12);
      bytes[offset++] = 0x80 | ((codePoint >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (codePoint & 0x3f);
    } else {
      bytes[offset++] = 0xf0 | (codePoint >> 18);
      bytes[offset++] = 0x80 | ((codePoint >> 12) & 0x3f);
      bytes[offset++] = 0x80 | ((codePoint >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (codePoint & 0x3f);
    }
  }
  return bytes;
}
