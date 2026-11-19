/**
 * Character set of the Swiss QR Code (SIX IG QR-bill v2.4, chapter 4.1.1): checking, normalizing and cleaning
 * text.
 *
 * Allowed: Basic Latin (U+0020–U+007E), Latin-1 Supplement (U+00A0–U+00FF), Latin Extended-A (U+0100–U+017F),
 * Ș ș Ț ț (U+0218–U+021B) and € (U+20AC).
 *
 * @module
 */

/**
 * Tells whether a single Unicode code point is allowed in the Swiss QR Code.
 *
 * @param codePoint - A Unicode code point, e.g. `0xe9` for "é".
 * @returns `true` when the code point belongs to the character set of chapter 4.1.1.
 */
export function isAllowedCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x20 && codePoint <= 0x7e) ||
    (codePoint >= 0xa0 && codePoint <= 0x17f) ||
    (codePoint >= 0x218 && codePoint <= 0x21b) ||
    codePoint === 0x20ac
  );
}

/**
 * Splits a string into Unicode code points. JavaScript strings are UTF-16: "😀" is two units but one code point.
 *
 * @param text - Any string.
 * @returns The code points of `text`, in order. A lone surrogate (invalid UTF-16) yields its own value.
 */
export function codePoints(text: string): number[] {
  const result: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const high = text.charCodeAt(index);
    const low = text.charCodeAt(index + 1); // NaN past the end
    if (high >= 0xd800 && high <= 0xdbff && low >= 0xdc00 && low <= 0xdfff) {
      result.push((high - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000);
      index++;
    } else {
      result.push(high);
    }
  }
  return result;
}

/**
 * Tells whether every character of a text is allowed in the Swiss QR Code.
 *
 * @param text - The text to check, already normalized (see {@link normalizeText}).
 * @returns `true` when the text contains only allowed characters, or is empty.
 */
export function isAllowedText(text: string): boolean {
  return codePoints(text).every(isAllowedCodePoint);
}

/**
 * Lists the characters of a text that the Swiss QR Code does not allow, for instance to show them in an error
 * message.
 *
 * @param text - The text to check, already normalized (see {@link normalizeText}).
 * @returns The distinct invalid characters, in order of first appearance; empty when the text is valid.
 * @example
 * ```ts
 * findInvalidCharacters('Facture – novembre'); // ['–'] (en dash)
 * ```
 */
export function findInvalidCharacters(text: string): string[] {
  const invalid = new Set<string>();
  for (const codePoint of codePoints(text)) {
    if (!isAllowedCodePoint(codePoint)) invalid.add(String.fromCodePoint(codePoint));
  }
  return [...invalid];
}

/**
 * Normalizes text the way every field is normalized before validation: Unicode NFC, so that a decomposed "é"
 * (as typed on macOS) becomes the single allowed code point, then trimmed, since padding with blanks is
 * forbidden (chapter 4.1.3).
 *
 * @param text - Any string.
 * @returns The normalized text.
 */
export function normalizeText(text: string): string {
  return text.normalize('NFC').trim();
}

const REPLACEMENTS: Readonly<Record<string, string>> = {
  '\u2018': "'", // ‘
  '\u2019': "'", // ’
  '\u201A': "'", // ‚
  '\u201B': "'", // ‛
  '\u2032': "'", // ′
  '\u201C': '"', // “
  '\u201D': '"', // ”
  '\u201E': '"', // „
  '\u201F': '"', // ‟
  '\u2033': '"', // ″
  '\u2010': '-', // hyphen
  '\u2011': '-', // non-breaking hyphen
  '\u2012': '-', // figure dash
  '\u2013': '-', // en dash
  '\u2014': '-', // em dash
  '\u2015': '-', // horizontal bar
  '\u2212': '-', // minus sign
  '\u2026': '...', // ellipsis
  '\u2022': '-', // bullet
  '\u2009': ' ', // thin space
  '\u202F': ' ', // narrow no-break space
  '\u200B': '', // zero-width space
  '\t': ' ',
  '\r': ' ',
  '\n': ' ',
};

/**
 * Makes arbitrary text acceptable for the Swiss QR Code: typographic quotes and dashes become ASCII, line breaks
 * become spaces, letters outside the allowed set lose their diacritics ("ǎ" → "a"), and anything still not allowed
 * is replaced by `replacement`.
 *
 * Use it on free text you do not control (names imported from a CRM, messages typed by users). It never changes
 * the characters of a text that is already valid; it only collapses repeated spaces and trims.
 *
 * @param text - Any string.
 * @param replacement - What replaces a character that cannot be transliterated. Removed by default.
 * @returns Text that contains only allowed characters.
 * @example
 * ```ts
 * sanitizeText('“Quoted” – text…'); // '"Quoted" - text...'
 * sanitizeText('a😀b', '?'); // 'a?b'
 * ```
 */
export function sanitizeText(text: string, replacement = ''): string {
  let result = '';
  for (const codePoint of codePoints(text.normalize('NFC'))) {
    const char = String.fromCodePoint(codePoint);
    if (isAllowedCodePoint(codePoint)) {
      result += char;
      continue;
    }
    const mapped = REPLACEMENTS[char];
    if (mapped !== undefined) {
      result += mapped;
      continue;
    }
    // Strip combining marks: "ǎ" (U+01CE) → "a" + U+030C → "a".
    const base = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    result += base !== '' && isAllowedText(base) ? base : replacement;
  }
  return result.replace(/ {2,}/g, ' ').trim();
}
