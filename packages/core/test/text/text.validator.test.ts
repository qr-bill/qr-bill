import { describe, expect, it } from 'vitest';
import { characterCount, validateOptionalText, validateRequiredText } from '../../src/text/text.validator.js';

describe('characterCount', () => {
  it('counts Unicode code points, not UTF-16 units nor bytes', () => {
    expect(characterCount('Zürich')).toBe(6);
    expect(characterCount('😀')).toBe(1);
  });
});

describe('validateRequiredText and validateOptionalText', () => {
  it.each([
    ['undefined', undefined, 'required', 'valid'],
    ['null', null, 'required', 'valid'],
    ['empty', '', 'required', 'valid'],
    ['blank', '   ', 'required', 'valid'],
    ['at the maximum length', 'abc', 'valid', 'valid'],
    ['surrounded by spaces', '  abc  ', 'valid', 'valid'],
    ['over the maximum length', 'abcd', 'too_long', 'too_long'],
    ['with a character outside the set', 'a–b', 'invalid_characters', 'invalid_characters'],
    ['too long with a character outside the set', 'a–bcd', 'invalid_characters', 'invalid_characters'],
  ] as const)('text %s (max. 3)', (_, value, required, optional) => {
    expect(validateRequiredText(value, 3)).toBe(required);
    expect(validateOptionalText(value, 3)).toBe(optional);
  });

  it('measures the length in characters', () => {
    expect(validateRequiredText('őőő', 3)).toBe('valid');
    expect(validateRequiredText('😀😀😀', 3)).toBe('invalid_characters');
  });
});
