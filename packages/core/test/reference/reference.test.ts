import { describe, expect, it } from 'vitest';
import { formatReference } from '../../src/index.js';
import { detectReferenceType, normalizeReference } from '../../src/reference/reference.js';

describe('normalizeReference', () => {
  it('removes spaces and upper-cases', () => {
    expect(normalizeReference(' rf18 5390 0754 7034 ')).toBe('RF18539007547034');
  });
});

describe('detectReferenceType', () => {
  it('tells the type from the shape only', () => {
    expect(detectReferenceType('210000000003139471430009017')).toBe('QRR');
    expect(detectReferenceType('rf18539007547034')).toBe('SCOR');
    expect(detectReferenceType('ABC')).toBeUndefined();
  });
});

describe('formatReference (chapter 3.5.4)', () => {
  it('prints a QR reference as 2 digits, then groups of 5', () => {
    expect(formatReference('210000000003139471430009017')).toBe('21 00000 00003 13947 14300 09017');
  });

  it('prints a Creditor Reference in groups of 4', () => {
    expect(formatReference('RF240191230100405JSH0438')).toBe('RF24 0191 2301 0040 5JSH 0438');
  });
});
