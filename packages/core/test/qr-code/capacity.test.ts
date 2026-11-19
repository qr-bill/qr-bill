import { describe, expect, it } from 'vitest';
import {
  byteCapacity,
  characterCountBits,
  rawDataModuleCount,
  smallestVersion,
  totalCodewordCount,
} from '../../src/qr-code/capacity.js';

describe('capacity at level M, byte mode (chapters 6.1 and 6.2)', () => {
  it.each([
    [1, 14],
    [9, 180],
    [10, 213],
    [25, 997],
  ])('version %i holds %i bytes', (version, bytes) => {
    expect(byteCapacity(version)).toBe(bytes);
  });

  it('only knows the versions a Swiss QR Code may use', () => {
    expect(() => byteCapacity(0)).toThrow(RangeError);
    expect(() => byteCapacity(26)).toThrow('A Swiss QR Code has a version from 1 to 25, received 26');
  });

  it('counts the modules and codewords of a version', () => {
    expect(rawDataModuleCount(1)).toBe(208);
    expect(totalCodewordCount(1)).toBe(26);
    expect(totalCodewordCount(7)).toBe(196);
    expect(totalCodewordCount(25)).toBe(1588);
  });

  it('writes the character count on 8 bits up to version 9, on 16 bits above', () => {
    expect(characterCountBits(9)).toBe(8);
    expect(characterCountBits(10)).toBe(16);
  });

  it('chooses the smallest version that fits, and refuses more than 997 bytes', () => {
    expect(smallestVersion(0).version).toBe(1);
    expect(smallestVersion(14).version).toBe(1);
    expect(smallestVersion(15).version).toBe(2);
    expect(smallestVersion(997).version).toBe(25);
    expect(() => smallestVersion(998)).toThrow(RangeError);
  });
});
