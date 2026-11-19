import { describe, expect, it } from 'vitest';
import { QRMatrix, alignmentPatternPositions, formatBits, versionBits } from '../../src/qr-code/matrix.js';

describe('format information of level M (ISO/IEC 18004, chapter 7.9)', () => {
  it.each([
    [0, '101010000010010'],
    [1, '101000100100101'],
    [2, '101111001111100'],
    [3, '101101101001011'],
    [4, '100010111111001'],
    [5, '100000011001110'],
    [6, '100111110010111'],
    [7, '100101010100000'],
  ])('mask %i → %s', (mask, bits) => {
    expect(formatBits(mask).toString(2).padStart(15, '0')).toBe(bits);
  });
});

describe('version information (ISO/IEC 18004, chapter 7.10)', () => {
  it('reproduces the value of the standard for version 7', () => {
    expect(versionBits(7)).toBe(0x07c94);
  });
});

describe('alignment patterns (ISO/IEC 18004, annex E)', () => {
  it.each([
    [1, []],
    [2, [6, 18]],
    [7, [6, 22, 38]],
    [25, [6, 32, 58, 84, 110]],
  ])('version %i → %j', (version, positions) => {
    expect(alignmentPatternPositions(version)).toEqual(positions);
  });
});

describe('function patterns', () => {
  it('draws the finder patterns, the timing patterns and the dark module', () => {
    const matrix = new QRMatrix(1);
    expect(matrix.size).toBe(21);
    // Top left, top right and bottom left finder patterns: dark border, light ring, dark center.
    for (const [x, y] of [
      [3, 3],
      [17, 3],
      [3, 17],
    ] as const) {
      expect(matrix.isDark(x - 3, y)).toBe(true);
      expect(matrix.isDark(x - 2, y)).toBe(false);
      expect(matrix.isDark(x, y)).toBe(true);
    }
    // Timing patterns: alternating, starting dark.
    expect([8, 9, 10, 11, 12].map((i) => matrix.isDark(i, 6))).toEqual([true, false, true, false, true]);
    expect([8, 9, 10, 11, 12].map((i) => matrix.isDark(6, i))).toEqual([true, false, true, false, true]);
    // The dark module next to the bottom left finder pattern.
    expect(matrix.isDark(8, 13)).toBe(true);
  });
});
