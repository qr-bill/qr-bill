import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MINIMUM_CONTRAST, contrastRatio, luminance, mix, readableOn } from '../../src/themes/color.js';

/** Any colour written #RRGGBB. */
const color = fc
  .tuple(fc.nat(255), fc.nat(255), fc.nat(255))
  .map((channels) => `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase());

describe('luminance and contrastRatio (WCAG 2)', () => {
  it('goes from 0 for black to 1 for white, and from 1:1 to 21:1', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#FFFFFF')).toBe(1);
    expect(contrastRatio('#000000', '#FFFFFF')).toBe(21);
    expect(contrastRatio('#FFFFFF', '#000000')).toBe(21);
    expect(contrastRatio('#1F3A5F', '#1F3A5F')).toBe(1);
    // A grey just below and one just above the level AA on white.
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(MINIMUM_CONTRAST);
    expect(contrastRatio('#757575', '#FFFFFF')).toBeGreaterThan(MINIMUM_CONTRAST);
  });
});

describe('mix', () => {
  it('goes from the background (share 0) to the colour (share 1)', () => {
    expect(mix('#1F3A5F', '#FFFFFF', 0)).toBe('#FFFFFF');
    expect(mix('#1F3A5F', '#FFFFFF', 1)).toBe('#1F3A5F');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });
});

describe('readableOn', () => {
  it('keeps a colour readable already, and darkens one that is not', () => {
    expect(readableOn('#1F3A5F', '#FFFFFF')).toBe('#1F3A5F');
    expect(readableOn('#FFFFFF', '#FFFFFF')).not.toBe('#FFFFFF');
  });

  it('always gives a colour readable on white and on any light tint', () => {
    fc.assert(
      fc.property(color, color, fc.double({ min: 0, max: 0.2, noNaN: true }), (text, tinted, share) => {
        expect(contrastRatio(readableOn(text, '#FFFFFF'), '#FFFFFF')).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
        const background = mix(tinted, '#FFFFFF', share);
        expect(contrastRatio(readableOn(text, background), background)).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
      }),
    );
  });
});
