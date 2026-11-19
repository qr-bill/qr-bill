import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createCreditorReference, isValidCreditorReference } from '../../src/index.js';

describe('createCreditorReference (chapter 2.12.2, ISO 11649)', () => {
  it('reproduces the references of the SIX examples', () => {
    expect(createCreditorReference('539007547034')).toBe('RF18539007547034');
    // The standard prints RF72… for this body; its check digits are wrong (see the conformance file).
    expect(createCreditorReference('0191230100405JSH0438')).toBe('RF240191230100405JSH0438');
  });

  it('accepts numbers, bigints, spaces and lower case', () => {
    expect(createCreditorReference(539007547034)).toBe('RF18539007547034');
    expect(createCreditorReference(539007547034n)).toBe('RF18539007547034');
    expect(createCreditorReference('0191 2301 0040 5jsh 0438')).toBe('RF240191230100405JSH0438');
  });

  it.each(['', 'ABC-1', '1'.repeat(22)])('refuses to build from "%s"', (input) => {
    expect(() => createCreditorReference(input)).toThrow(RangeError);
  });

  it('always builds a valid reference', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: fc.constantFrom(...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'), minLength: 1, maxLength: 21 }),
        (body) => {
          expect(isValidCreditorReference(createCreditorReference(body))).toBe(true);
        },
      ),
    );
  });
});
