import { describe, expect, it } from 'vitest';
import { formatIBAN, normalizeIBAN } from '../../src/index.js';

describe('normalizeIBAN', () => {
  it('removes spaces and upper-cases', () => {
    expect(normalizeIBAN(' ch44 3199 9123 0008 8901 2 ')).toBe('CH4431999123000889012');
  });
});

describe('formatIBAN (chapter 3.5.4)', () => {
  it('prints groups of four, the last character alone', () => {
    expect(formatIBAN('CH4431999123000889012')).toBe('CH44 3199 9123 0008 8901 2');
  });
});
