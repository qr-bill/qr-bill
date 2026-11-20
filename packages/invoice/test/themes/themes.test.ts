import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MINIMUM_CONTRAST, contrastRatio } from '../../src/themes/color.js';
import { INVOICE_THEMES, THEMES, resolveTheme } from '../../src/themes/themes.js';
import type { ThemeColors } from '../../src/themes/themes.types.js';

const accent = fc
  .tuple(fc.nat(255), fc.nat(255), fc.nat(255))
  .map((channels) => `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase());

/** Each text of an invoice with its background. */
function textsOnBackgrounds(colors: ThemeColors): [string, string][] {
  return [
    [colors.text, '#FFFFFF'],
    [colors.muted, '#FFFFFF'],
    [colors.title, '#FFFFFF'],
    [colors.total, '#FFFFFF'],
    [colors.tableHeaderText, colors.tableHeaderBackground ?? '#FFFFFF'],
    [colors.text, colors.stripe ?? '#FFFFFF'],
  ];
}

describe('themes', () => {
  it('lists the three themes, each defined in its own file', () => {
    expect(INVOICE_THEMES).toEqual(['standard', 'business', 'modern']);
    expect(Object.keys(THEMES)).toEqual(INVOICE_THEMES);
    for (const name of INVOICE_THEMES) expect(THEMES[name].name).toBe(name);
  });

  it('standard: black text, the accent on the rules only', () => {
    expect(resolveTheme({ name: 'standard' })).toEqual({
      text: '#000000',
      muted: '#595959',
      line: '#DDDDDD',
      title: '#000000',
      tableHeaderRule: '#555555',
      tableHeaderText: '#000000',
      total: '#000000',
      totalRule: '#555555',
    });
  });

  it('business: a band of the accent with white text, the title and the total in the accent', () => {
    expect(resolveTheme({ name: 'business' })).toEqual({
      text: '#000000',
      muted: '#595959',
      line: '#DDDDDD',
      title: '#1F3A5F',
      tableHeaderBackground: '#1F3A5F',
      tableHeaderText: '#FFFFFF',
      total: '#1F3A5F',
      totalRule: '#1F3A5F',
    });
    // Too light for white text: black on the band, the title and total darkened.
    const yellow = resolveTheme({ name: 'business', accent: '#FDE047' });
    expect(yellow.tableHeaderText).toBe('#000000');
    expect(yellow.title).not.toBe('#FDE047');
  });

  it('modern: a bar along the top, a tinted header, striped rows', () => {
    const colors = resolveTheme({ name: 'modern' });
    expect(colors.topBar).toBe('#0F766E');
    expect(colors.tableHeaderBackground).not.toBe('#0F766E');
    expect(colors.stripe).toBeDefined();
    expect(colors.tableHeaderRule).toBeUndefined();
  });

  it('keeps every text readable, whatever the theme and the accent', () => {
    fc.assert(
      fc.property(fc.constantFrom(...INVOICE_THEMES), accent, (name, color) => {
        for (const [text, background] of textsOnBackgrounds(resolveTheme({ name, accent: color }))) {
          expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
        }
      }),
    );
  });
});
