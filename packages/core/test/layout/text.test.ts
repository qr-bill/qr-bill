import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ELLIPSIS, MM_PER_PT, ascent, descent, shorten, textWidth, wrap } from '../../src/layout/text.js';

const regular = { size: 10, weight: 'regular' } as const;

describe('textWidth (Liberation Sans)', () => {
  it('adds the advance widths of the characters', () => {
    // C, H and F: 722, 722 and 611 thousandths of the font size.
    expect(textWidth('CHF', 10, 'regular')).toBeCloseTo(2.055 * 10 * MM_PER_PT, 10);
    expect(textWidth('', 10, 'regular')).toBe(0);
  });

  it('measures bold wider than regular', () => {
    expect(textWidth('Zahlteil', 11, 'bold')).toBeGreaterThan(textWidth('Zahlteil', 11, 'regular'));
  });

  it('knows every character of the Swiss QR Code and the ellipsis', () => {
    expect(textWidth('ŁőȘț€…', 10, 'regular')).toBeGreaterThan(0);
  });

  it('counts a character missing from the metrics as wide as a digit', () => {
    expect(textWidth('😀', 10, 'regular')).toBeCloseTo(textWidth('0', 10, 'regular'), 10);
  });
});

describe('ascent and descent', () => {
  it('are 905 and 212 thousandths of the font size', () => {
    expect(ascent(10)).toBeCloseTo(9.05 * MM_PER_PT, 10);
    expect(descent(10)).toBeCloseTo(2.12 * MM_PER_PT, 10);
  });
});

describe('shorten', () => {
  it('leaves a text that fits', () => {
    expect(shorten('Seldwyla', 50, regular)).toBe('Seldwyla');
  });

  it('cuts a text that does not fit and ends it with an ellipsis', () => {
    const shortened = shorten('Max Muster & Söhne, Musterstrasse 123, 8000 Seldwyla', 30, regular);
    expect(shortened.endsWith(ELLIPSIS)).toBe(true);
    expect(textWidth(shortened, 10, 'regular')).toBeLessThanOrEqual(30);
  });

  it('gives the ellipsis alone when nothing fits', () => {
    expect(shorten('Seldwyla', 0, regular)).toBe(ELLIPSIS);
  });
});

describe('wrap', () => {
  it('breaks between words', () => {
    expect(wrap('Max Muster & Söhne Musterstrasse', 35, regular)).toEqual(['Max Muster & Söhne', 'Musterstrasse']);
  });

  it('keeps the line breaks of the text and ignores repeated spaces', () => {
    expect(wrap('Order  1\n//S1/10/1', 80, regular)).toEqual(['Order 1', '//S1/10/1']);
  });

  it('cuts a word longer than a line where the line is full', () => {
    const lines = wrap(`Ref ${'1'.repeat(40)}`, 30, regular);
    expect(lines[0]).toBe('Ref');
    expect(lines.join('')).toBe(`Ref${'1'.repeat(40)}`);
    expect(lines.every((line) => textWidth(line, 10, 'regular') <= 30)).toBe(true);
  });

  it('keeps a single character on a line even when it is wider than the line', () => {
    expect(wrap('WW', 1, regular)).toEqual(['W', 'W']);
  });

  it('shortens the last line with an ellipsis beyond the most lines allowed', () => {
    const lines = wrap('one two three four five six', 10, regular, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith(ELLIPSIS)).toBe(true);
  });

  it('always gives lines that fit', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: fc.constantFrom(...'abcWMli1 .-éŁ'), maxLength: 200 }),
        fc.integer({ min: 10, max: 90 }),
        (text, width) => {
          for (const line of wrap(text, width, regular)) {
            expect(textWidth(line, 10, 'regular')).toBeLessThanOrEqual(width);
          }
        },
      ),
    );
  });
});
