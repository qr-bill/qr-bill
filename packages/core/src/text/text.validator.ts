/**
 * Validation of a free text field: presence, character set, length. The validators of the address and additional
 * information fields are built on these two functions.
 *
 * @module
 */

import { findInvalidCharacters, normalizeText } from './charset.js';
import type { OptionalTextStatus, TextStatus } from './text.types.js';

/**
 * Counts the characters of a text the way the standard does: in Unicode code points. "é" is one character (two
 * UTF-8 bytes), "😀" is one character (two UTF-16 units).
 *
 * @param text - Any string.
 * @returns The number of characters of `text`.
 */
export function characterCount(text: string): number {
  return [...text].length;
}

/**
 * Validates a mandatory text field.
 *
 * @param value - The field as typed. It is normalized first (Unicode NFC, trimmed), so surrounding spaces do not
 *   count and a blank value is empty.
 * @param maxLength - Maximum length of the field, in characters.
 * @returns `valid`, or the first problem found (see {@link TextStatus}).
 */
export function validateRequiredText(value: string | null | undefined, maxLength: number): TextStatus {
  const text = normalizeText(value ?? '');
  return text === '' ? 'required' : checkText(text, maxLength);
}

/**
 * Validates an optional text field: same rules as {@link validateRequiredText}, but empty is `valid`.
 *
 * @param value - The field as typed, normalized first.
 * @param maxLength - Maximum length of the field, in characters.
 * @returns `valid`, or the first problem found (see {@link OptionalTextStatus}).
 */
export function validateOptionalText(value: string | null | undefined, maxLength: number): OptionalTextStatus {
  const text = normalizeText(value ?? '');
  return text === '' ? 'valid' : checkText(text, maxLength);
}

/** Character set (chapter 4.1.1) then length (table 8) of a normalized, non-empty text. */
function checkText(text: string, maxLength: number): OptionalTextStatus {
  if (findInvalidCharacters(text).length > 0) return 'invalid_characters';
  if (characterCount(text) > maxLength) return 'too_long';
  return 'valid';
}
