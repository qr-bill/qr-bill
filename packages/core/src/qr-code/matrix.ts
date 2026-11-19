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
 * The grid of modules of a QR code (ISO/IEC 18004, chapters 6.3 and 7.7 to 7.10): the function patterns (finder,
 * timing and alignment patterns, format and version information), the placement of the codewords, the masks and
 * the penalty that decides which mask to keep.
 *
 * @module
 */

/** A mask: the modules of the data area for which it returns `true` are inverted (ISO/IEC 18004, table 10). */
export type MaskCondition = (x: number, y: number) => boolean;

/** The eight masks, by mask number. `x` is the column, `y` the row, from the top left corner. */
export const MASKS: readonly MaskCondition[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Format bits of error correction level M, 00 (ISO/IEC 18004, table 12). */
const LEVEL_M_FORMAT_BITS = 0b00;

// Weights of the four penalty rules (ISO/IEC 18004, chapter 7.8.3.1).
/** Five or more modules of the same color in a row or column; one more point per module beyond five. */
const PENALTY_RUN = 3;
/** A 2 × 2 block of modules of the same color. */
const PENALTY_BLOCK = 3;
/** A pattern like a finder, dark-light-dark-light-dark in the proportions 1:1:3:1:1, with light space on one side. */
const PENALTY_FINDER_LIKE = 40;
/** Each 5 % of deviation from an equal number of dark and light modules. */
const PENALTY_BALANCE = 10;

/** Bit positions of a codeword, from the most significant to the least. */
const BIT_POSITIONS = [7, 6, 5, 4, 3, 2, 1, 0] as const;

/**
 * Computes the format information for level M and a mask: 5 data bits followed by 10 BCH error correction bits,
 * XORed with 101010000010010 so that it never consists of light modules only (ISO/IEC 18004, chapter 7.9).
 *
 * @param mask - Mask number, from 0 to 7.
 * @returns The 15 bits of the format information.
 * @example
 * ```ts
 * formatBits(0).toString(2); // '101010000010010'
 * ```
 */
export function formatBits(mask: number): number {
  const data = (LEVEL_M_FORMAT_BITS << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  return ((data << 10) | remainder) ^ 0x5412;
}

/**
 * Computes the version information, present from version 7: 6 bits of version followed by 12 BCH error correction
 * bits (ISO/IEC 18004, chapter 7.10).
 *
 * @param version - From 7 to 25.
 * @returns The 18 bits of the version information.
 * @example
 * ```ts
 * versionBits(7).toString(16); // '7c94'
 * ```
 */
export function versionBits(version: number): number {
  let remainder = version;
  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  return (version << 12) | remainder;
}

/**
 * Gives the positions of the centers of the alignment patterns, the same on both axes (ISO/IEC 18004, annex E).
 *
 * @param version - From 1 to 25.
 * @returns The positions in ascending order; empty for version 1, which has no alignment pattern.
 * @example
 * ```ts
 * alignmentPatternPositions(7); // [6, 22, 38]
 * ```
 */
export function alignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];
  const size = version * 4 + 17;
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const positions = [6];
  for (let position = size - 7; positions.length < count; position -= step) positions.splice(1, 0, position);
  return positions;
}

/**
 * The modules of a QR code being built. The constructor draws the function patterns; then the encoder draws the
 * codewords, tries the masks, and keeps the one with the lowest penalty.
 */
export class QRMatrix {
  /** Version, from 1 to 25. */
  readonly version: number;

  /** Number of modules on each side: 4 × version + 17. */
  readonly size: number;

  /** 1 for a dark module, row after row. */
  private readonly dark: Uint8Array;

  /** 1 for a module of a function pattern, which the data and the masks leave untouched. */
  private readonly reserved: Uint8Array;

  /**
   * @param version - From 1 to 25.
   */
  constructor(version: number) {
    this.version = version;
    this.size = version * 4 + 17;
    this.dark = new Uint8Array(this.size * this.size);
    this.reserved = new Uint8Array(this.size * this.size);
    this.drawFunctionPatterns();
  }

  /**
   * Tells the color of a module.
   *
   * @param x - Column, from 0 at the left.
   * @param y - Row, from 0 at the top.
   * @returns `true` for a dark module.
   */
  isDark(x: number, y: number): boolean {
    return this.dark[y * this.size + x] === 1;
  }

  /**
   * Draws the codewords in the data area, in the zigzag order of ISO/IEC 18004, chapter 7.7.3: pairs of columns
   * from the right, upwards then downwards, skipping the vertical timing pattern. Modules left over at the end (the
   * remainder bits) stay light.
   *
   * @param codewords - All the codewords, see {@link interleavedCodewords}.
   */
  drawCodewords(codewords: readonly number[]): void {
    const bits = codewords.flatMap((codeword) => BIT_POSITIONS.map((position) => (codeword >>> position) & 1));
    let index = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const upward = ((right + 1) & 2) === 0;
      for (let step = 0; step < this.size; step++) {
        const y = upward ? this.size - 1 - step : step;
        for (const x of [right, right - 1]) {
          if (!this.isReserved(x, y) && index < bits.length) {
            this.setDark(x, y, bits[index] === 1);
            index++;
          }
        }
      }
    }
  }

  /**
   * Inverts the modules of the data area for which the mask is true. Applying the same mask again undoes it.
   *
   * @param mask - One of {@link MASKS}.
   */
  applyMask(mask: MaskCondition): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.isReserved(x, y) && mask(x, y)) this.setDark(x, y, !this.isDark(x, y));
      }
    }
  }

  /**
   * Draws the two copies of the format information (ISO/IEC 18004, chapter 7.9.1), and the dark module that always
   * sits next to the bottom left finder pattern.
   *
   * @param mask - Number of the mask applied, from 0 to 7.
   */
  drawFormatBits(mask: number): void {
    const bits = formatBits(mask);
    const bit = (i: number): boolean => ((bits >>> i) & 1) === 1;
    // First copy, around the top left finder pattern.
    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, bit(i));
    this.setFunctionModule(8, 7, bit(6));
    this.setFunctionModule(8, 8, bit(7));
    this.setFunctionModule(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, bit(i));
    // Second copy, split between the top right and bottom left finder patterns.
    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, bit(i));
    this.setFunctionModule(8, this.size - 8, true);
  }

  /**
   * Computes the penalty of the current modules (ISO/IEC 18004, chapter 7.8.3): runs of the same color, 2 × 2
   * blocks, patterns like a finder, and the balance of dark and light modules. The mask with the lowest penalty is
   * kept.
   *
   * @returns The penalty, in points.
   */
  penaltyScore(): number {
    let penalty = 0;
    for (let y = 0; y < this.size; y++) penalty += this.linePenalty((x) => this.isDark(x, y));
    for (let x = 0; x < this.size; x++) penalty += this.linePenalty((y) => this.isDark(x, y));

    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const color = this.isDark(x, y);
        if (color === this.isDark(x + 1, y) && color === this.isDark(x, y + 1) && color === this.isDark(x + 1, y + 1)) {
          penalty += PENALTY_BLOCK;
        }
      }
    }

    const darkCount = this.dark.reduce((sum, value) => sum + value, 0);
    const total = this.size * this.size;
    // The smallest k ≥ 0 such that (45 − 5k) % ≤ dark / total ≤ (55 + 5k) %.
    const k = Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1;
    return penalty + k * PENALTY_BALANCE;
  }

  /**
   * Gives the modules as rows of booleans.
   *
   * @returns One row per line from the top, each from the left; `true` for a dark module.
   */
  toRows(): boolean[][] {
    return Array.from({ length: this.size }, (_row, y) =>
      Array.from({ length: this.size }, (_column, x) => this.isDark(x, y)),
    );
  }

  /** Whether a module belongs to a function pattern. */
  private isReserved(x: number, y: number): boolean {
    return this.reserved[y * this.size + x] === 1;
  }

  /** Sets the color of a module. */
  private setDark(x: number, y: number, dark: boolean): void {
    this.dark[y * this.size + x] = dark ? 1 : 0;
  }

  /** Sets the color of a module of a function pattern, and reserves it. */
  private setFunctionModule(x: number, y: number, dark: boolean): void {
    this.setDark(x, y, dark);
    this.reserved[y * this.size + x] = 1;
  }

  /** Draws the timing, finder and alignment patterns, the format information (mask 0 for now) and the version. */
  private drawFunctionPatterns(): void {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    const positions = alignmentPatternPositions(this.version);
    const last = positions.length - 1;
    for (const [i, x] of positions.entries()) {
      for (const [j, y] of positions.entries()) {
        // No alignment pattern over the three finder patterns.
        const overFinder = (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
        if (!overFinder) this.drawAlignmentPattern(x, y);
      }
    }

    this.drawFormatBits(0);
    this.drawVersion();
  }

  /** Draws a finder pattern, 7 × 7 modules, with its light separator, around the module (cx, cy). */
  private drawFinderPattern(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
          this.setFunctionModule(x, y, distance !== 2 && distance !== 4);
        }
      }
    }
  }

  /** Draws an alignment pattern, 5 × 5 modules, around the module (cx, cy). */
  private drawAlignmentPattern(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  /** Draws the two copies of the version information, from version 7 (ISO/IEC 18004, chapter 7.10). */
  private drawVersion(): void {
    if (this.version < 7) return;
    const bits = versionBits(this.version);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, dark);
      this.setFunctionModule(b, a, dark);
    }
  }

  /**
   * Penalty of one row or column: N1 for runs of five or more modules of the same color, N3 for patterns like a
   * finder. The run history keeps the lengths of the last seven runs, the most recent first; the line is considered
   * surrounded by light modules, as the quiet zone is.
   */
  private linePenalty(isDarkAt: (index: number) => boolean): number {
    let penalty = 0;
    let runColor = false;
    let runLength = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < this.size; i++) {
      if (isDarkAt(i) === runColor) {
        runLength++;
        if (runLength === 5) penalty += PENALTY_RUN;
        else if (runLength > 5) penalty++;
      } else {
        this.addRun(runLength, runHistory);
        if (!runColor) penalty += this.countFinderLikePatterns(runHistory) * PENALTY_FINDER_LIKE;
        runColor = isDarkAt(i);
        runLength = 1;
      }
    }
    // End of the line: close the last run, then the light border after it.
    if (runColor) {
      this.addRun(runLength, runHistory);
      runLength = 0;
    }
    this.addRun(runLength + this.size, runHistory);
    return penalty + this.countFinderLikePatterns(runHistory) * PENALTY_FINDER_LIKE;
  }

  /** Adds a run to the history, the light border before the line counted in the first run. */
  private addRun(runLength: number, runHistory: number[]): void {
    const length = runHistory[0] === 0 ? runLength + this.size : runLength;
    runHistory.pop();
    runHistory.unshift(length);
  }

  /**
   * Counts the patterns like a finder that end with the light run just added: dark-light-dark-light-dark in the
   * proportions 1:1:3:1:1, with a light run of at least 4 on one side and 1 on the other. Returns 0, 1 or 2.
   */
  private countFinderLikePatterns(runHistory: readonly number[]): number {
    const [after = 0, n = 0, second = 0, center = 0, fourth = 0, fifth = 0, before = 0] = runHistory;
    const core = n > 0 && second === n && center === n * 3 && fourth === n && fifth === n;
    return (core && after >= n * 4 && before >= n ? 1 : 0) + (core && before >= n * 4 && after >= n ? 1 : 0);
  }
}
