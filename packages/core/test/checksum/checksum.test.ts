import { describe, expect, it } from 'vitest';
import { mod10Recursive } from '../../src/checksum/mod10-recursive.js';
import { mod97 } from '../../src/checksum/mod97.js';

describe('mod10Recursive (Annex B)', () => {
  it('reproduces the worked example of Annex B', () => {
    expect(mod10Recursive('21000000000313947143000901')).toBe(7);
  });
});

describe('mod97 (ISO 7064 MOD 97-10)', () => {
  it('gives 1 for a valid IBAN whose first four characters are moved to the end', () => {
    expect(mod97('00791123000889012CH58')).toBe(1);
  });

  it('counts letters as two digits, A = 10 to Z = 35', () => {
    expect(mod97('A')).toBe(10);
    expect(mod97('Z')).toBe(35);
    expect(mod97('AA')).toBe(1010 % 97);
  });
});
