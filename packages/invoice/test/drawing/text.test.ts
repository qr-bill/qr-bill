import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ELLIPSIS, shorten, wrap } from '../../src/drawing/text.js';

/** One millimetre per character: the width of a text is its length. */
const length = (text: string): number => [...text].length;

describe('shorten', () => {
  it('keeps a text that fits', () => {
    expect(shorten('Seldwyla', 8, length)).toBe('Seldwyla');
  });

  it('shortens a text with "…", without a space before it', () => {
    expect(shorten('Seldwyla', 5, length)).toBe('Seld…');
    expect(shorten('Max Muster', 5, length)).toBe('Max…');
  });

  it('gives "…" alone when nothing else fits', () => {
    expect(shorten('Seldwyla', 1, length)).toBe(ELLIPSIS);
    expect(shorten('Seldwyla', 0, length)).toBe(ELLIPSIS);
  });

  it('counts characters as code points', () => {
    expect(shorten('😀😀😀😀', 3, length)).toBe('😀😀…');
  });
});

describe('wrap', () => {
  it('breaks between words', () => {
    expect(wrap('Max Muster & Söhne', 10, length)).toEqual(['Max Muster', '& Söhne']);
  });

  it('keeps the line feeds, empty lines included, and ignores repeated spaces', () => {
    expect(wrap('Madame,\n\nVoici  notre facture.', 30, length)).toEqual(['Madame,', '', 'Voici notre facture.']);
  });

  it('breaks a word longer than the width where it must', () => {
    expect(wrap('Rechnungsnummer 42', 6, length)).toEqual(['Rechnu', 'ngsnum', 'mer 42']);
  });

  it('puts one character per line when even one is wider than the width', () => {
    expect(wrap('abc', 0.5, length)).toEqual(['a', 'b', 'c']);
  });

  it('shortens the last line with "…" beyond the maximum number of lines', () => {
    expect(wrap('Max Muster & Söhne', 10, length, 1)).toEqual(['Max Muste…']);
    expect(wrap('a b c d', 1, length, 2)).toEqual(['a', '…']);
    expect(wrap('a b', 1, length, 2)).toEqual(['a', 'b']);
  });

  it('gives lines that fit and keep every character but the spaces, whatever the text', () => {
    const text = fc.string({ unit: fc.constantFrom('a', 'W', 'é', ' ', '\n'), maxLength: 200 });
    fc.assert(
      fc.property(text, fc.integer({ min: 1, max: 40 }), (value, width) => {
        const lines = wrap(value, width, length);
        expect(lines.every((line) => length(line) <= width)).toBe(true);
        expect(lines.join('').replace(/\s/g, '')).toBe(value.replace(/\s/g, ''));
        expect(lines.length).toBeGreaterThanOrEqual(value.split('\n').length);
      }),
    );
  });

  it('never gives more lines than the maximum, each fitting', () => {
    const text = fc.string({ unit: fc.constantFrom('a', 'W', ' ', '\n'), maxLength: 200 });
    fc.assert(
      fc.property(text, fc.integer({ min: 2, max: 40 }), fc.integer({ min: 1, max: 5 }), (value, width, maxLines) => {
        const lines = wrap(value, width, length, maxLines);
        expect(lines.length).toBeLessThanOrEqual(maxLines);
        expect(lines.every((line) => length(line) <= width)).toBe(true);
      }),
    );
  });
});
