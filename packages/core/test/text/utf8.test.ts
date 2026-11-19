import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { codePoints } from '../../src/text/charset.js';
import { encodeUTF8, utf8Length } from '../../src/text/utf8.js';

describe('UTF-8 without TextEncoder', () => {
  it('encodes exactly like TextEncoder, lone surrogates included', () => {
    const encoder = new TextEncoder();
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (text) => {
        expect(encodeUTF8(text)).toEqual(encoder.encode(text));
      }),
    );
    // One character of each byte length, deterministically.
    expect(encodeUTF8('aé€😀')).toEqual(encoder.encode('aé€😀'));
    expect(encodeUTF8('a\uD800b')).toEqual(encoder.encode('a\uD800b'));
  });

  it('measures the byte length of valid text', () => {
    expect(utf8Length('aé€😀')).toBe(1 + 2 + 3 + 4);
  });

  it('splits code points, keeping surrogate pairs together', () => {
    expect(codePoints('a😀\uD800')).toEqual([0x61, 0x1f600, 0xd800]);
  });
});
