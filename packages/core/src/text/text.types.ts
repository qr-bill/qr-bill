/**
 * Types of the validation of free text fields (names, addresses, messages).
 *
 * @module
 */

/**
 * Result of the validation of a mandatory text field. When a field has several problems, only the first one in
 * this order is returned: `required`, then `invalid_characters`, then `too_long`.
 *
 * - `valid`: the field can be used (after trimming and Unicode normalization).
 * - `required`: the field is empty or blank.
 * - `invalid_characters`: the field contains characters outside the character set of the Swiss QR Code (chapter
 *   4.1.1); {@link findInvalidCharacters} lists them.
 * - `too_long`: the field exceeds its maximum length, counted in characters.
 */
export type TextStatus = 'valid' | 'required' | 'invalid_characters' | 'too_long';

/** Result of the validation of an optional text field: like {@link TextStatus}, but empty is `valid`. */
export type OptionalTextStatus = Exclude<TextStatus, 'required'>;
