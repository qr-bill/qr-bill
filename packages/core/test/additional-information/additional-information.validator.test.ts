import { describe, expect, it } from 'vitest';
import {
  ADDITIONAL_INFORMATION_MAX_LENGTH,
  ALTERNATIVE_PROCEDURE_MAX_LENGTH,
  MAX_ALTERNATIVE_PROCEDURES,
  validateAlternativeProcedure,
  validateBillingInformation,
  validateMessage,
} from '../../src/index.js';

describe('limits (chapters 4.2.2 and 4.3.3)', () => {
  it('match table 8', () => {
    expect(ADDITIONAL_INFORMATION_MAX_LENGTH).toBe(140);
    expect(ALTERNATIVE_PROCEDURE_MAX_LENGTH).toBe(100);
    expect(MAX_ALTERNATIVE_PROCEDURES).toBe(2);
  });
});

describe('validateMessage', () => {
  it.each([
    ['Order of 15 October 2026', 'valid'],
    ['', 'valid'],
    [undefined, 'valid'],
    ['x'.repeat(140), 'valid'],
    ['x'.repeat(141), 'too_long'],
    ['Order – October', 'invalid_characters'],
  ] as const)('%j → %s', (value, expected) => {
    expect(validateMessage(value)).toBe(expected);
  });
});

describe('validateBillingInformation', () => {
  it.each([
    ['//S1/10/10201409/11/190512', 'valid'],
    ['  //S1/10/1234  ', 'valid'],
    ['', 'valid'],
    [null, 'valid'],
    ['S1/10/1234', 'invalid_billing_information'],
    ['//S', 'invalid_billing_information'],
    ['//S1/10/12–34', 'invalid_characters'],
    [`//S1/${'1'.repeat(135)}`, 'valid'],
    [`//S1/${'1'.repeat(136)}`, 'too_long'],
  ] as const)('%j → %s', (value, expected) => {
    expect(validateBillingInformation(value)).toBe(expected);
  });
});

describe('validateAlternativeProcedure', () => {
  it.each([
    ['eBill/B/peter@sample.ch', 'valid'],
    ['', 'valid'],
    ['x'.repeat(100), 'valid'],
    ['x'.repeat(101), 'too_long'],
  ] as const)('%j → %s', (value, expected) => {
    expect(validateAlternativeProcedure(value)).toBe(expected);
  });
});
