import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { findInvalidCharacters, sanitizeText } from '../../src/index.js';
import { isAllowedCodePoint, normalizeText } from '../../src/text/charset.js';

describe('character set (chapter 4.1.1)', () => {
  it.each([
    [0x1f, false],
    [0x20, true],
    [0x7e, true],
    [0x7f, false],
    [0x9f, false],
    [0xa0, true],
    [0xff, true],
    [0x17f, true],
    [0x180, false],
    [0x217, false],
    [0x218, true],
    [0x21b, true],
    [0x21c, false],
    [0x20ac, true],
  ])('U+%s allowed: %s', (codePoint, expected) => {
    expect(isAllowedCodePoint(codePoint)).toBe(expected);
  });

  it('lists each invalid character once', () => {
    expect(findInvalidCharacters('Zürich – “Münster” – 😀 ǎ ǎ')).toEqual(['–', '“', '”', '😀', 'ǎ']);
    expect(findInvalidCharacters('Ștefan Țepeș, Łódź, Größe, 100 €')).toEqual([]);
  });
});

describe('normalizeText', () => {
  it('composes decomposed characters (as typed on macOS) and trims', () => {
    const decomposed = `  Zu${String.fromCharCode(0x308)}rich `; // "u" + combining diaeresis
    expect(normalizeText(decomposed)).toBe('Zürich');
  });
});

describe('sanitizeText', () => {
  it.each([
    ['“Quoted” – text…', '"Quoted" - text...'],
    ['line\nbreak\ttab', 'line break tab'],
    ['ǎ ǐ ǔ', 'a i u'],
    ['emoji 😀 here', 'emoji here'],
    ['Zürich', 'Zürich'],
  ])('%j → %j', (input, expected) => {
    expect(sanitizeText(input)).toBe(expected);
  });

  it('uses the replacement for what cannot be transliterated', () => {
    expect(sanitizeText('a😀b', '?')).toBe('a?b');
  });

  it('always returns valid text and never changes valid text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (text) => {
        expect(findInvalidCharacters(sanitizeText(text))).toEqual([]);
      }),
    );
    fc.assert(
      fc.property(
        fc.string({
          unit: fc
            .integer({ min: 0x21, max: 0x17f })
            .filter(isAllowedCodePoint)
            .map((cp) => String.fromCodePoint(cp)),
        }),
        (text) => {
          expect(sanitizeText(text)).toBe(text.normalize('NFC').replace(/ {2,}/g, ' ').trim());
        },
      ),
    );
  });
});
