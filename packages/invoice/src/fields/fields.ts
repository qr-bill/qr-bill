/**
 * Reading the fields of an invoice given as `unknown`: each read* function checks one value, reports the problems it
 * finds in an {@link IssueList}, and returns the normalized value, or `undefined` when the value is absent or
 * invalid. Texts are normalized (Unicode NFC, trimmed); blank counts as missing.
 *
 * @module
 */

import type { IssuePath } from '@qr-bill/core';
import type { InvoiceIssue, InvoiceIssueCode } from '../invoice/invoice.types.js';
import { parseDecimal, toShortDecimal } from '../amounts/money.js';

/** The problems found so far, in the order of the fields. */
export class IssueList {
  /** The problems. */
  readonly list: InvoiceIssue[] = [];

  /**
   * Reports a problem.
   *
   * @param code - What the problem is.
   * @param path - Where it is.
   * @param message - An explanation in English.
   */
  add(code: InvoiceIssueCode, path: IssuePath, message: string): void {
    this.list.push({ code, path, message });
  }
}

/** Characters that never belong in a line: control characters and line separators. */
const CONTROL = /[\p{Cc}\u2028\u2029]/u;
/** The same, except the line feed, which separates the lines of a paragraph. */
const CONTROL_EXCEPT_NEWLINE = /(?!\n)[\p{Cc}\u2028\u2029]/u;

/**
 * Whether a value is absent: `undefined` or `null`.
 *
 * @param value - Any value.
 * @returns `true` when absent.
 */
export function isAbsent(value: unknown): value is undefined | null {
  return value === undefined || value === null;
}

/**
 * Whether a value is absent or a blank string: what a required field must not be.
 *
 * @param value - Any value.
 * @returns `true` when absent or blank.
 */
export function isBlank(value: unknown): boolean {
  return isAbsent(value) || (typeof value === 'string' && value.trim() === '');
}

/**
 * Whether a value is a plain object (not an array, nor the bytes of a file).
 *
 * @param value - Any value.
 * @returns `true` for an object whose properties can be read.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Uint8Array);
}

/**
 * Reads an object that must be present.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param issues - Where problems are reported: `required` or `invalid_type`.
 * @returns The object, or `undefined`.
 */
export function readRecord(value: unknown, path: IssuePath, issues: IssueList): Record<string, unknown> | undefined {
  if (isRecord(value)) return value;
  if (isAbsent(value)) issues.add('required', path, 'Required');
  else issues.add('invalid_type', path, 'Expected an object');
  return undefined;
}

/**
 * Reads a string, normalized; blank counts as absent.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param issues - Where problems are reported: `invalid_type`.
 * @returns The text, or `undefined` when absent, blank or not a string.
 */
export function readString(value: unknown, path: IssuePath, issues: IssueList): string | undefined {
  if (isAbsent(value)) return undefined;
  if (typeof value !== 'string') {
    issues.add('invalid_type', path, `Expected a string, received ${typeof value}`);
    return undefined;
  }
  const text = value.normalize('NFC').trim();
  return text === '' ? undefined : text;
}

/** Reports a text longer than its limit, counted in Unicode code points. */
function checkLength(text: string, path: IssuePath, max: number, issues: IssueList): boolean {
  const length = [...text].length;
  if (length <= max) return true;
  issues.add('too_long', path, `At most ${max} characters, received ${length}`);
  return false;
}

/**
 * Reads a text on one line.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param max - Its maximum length.
 * @param issues - Where problems are reported: `required`, `invalid_type`, `invalid_characters`, `too_long`.
 * @param required - Whether a blank value is a problem.
 * @returns The text, or `undefined`.
 */
export function readLine(
  value: unknown,
  path: IssuePath,
  max: number,
  issues: IssueList,
  required = false,
): string | undefined {
  if (required && isBlank(value)) {
    issues.add('required', path, 'Required');
    return undefined;
  }
  const text = readString(value, path, issues);
  if (text === undefined) return undefined;
  if (CONTROL.test(text)) {
    issues.add('invalid_characters', path, 'Line breaks and control characters are not allowed in this field');
    return undefined;
  }
  return checkLength(text, path, max, issues) ? text : undefined;
}

/**
 * Reads a text of several lines separated by line feeds; `\r\n` and `\r` become `\n`.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param max - Its maximum length, line feeds included.
 * @param maxLines - Its maximum number of lines.
 * @param issues - Where problems are reported: `required`, `invalid_type`, `invalid_characters`, `too_long`,
 *   `too_many_lines`.
 * @param required - Whether a blank value is a problem.
 * @returns The text, or `undefined`.
 */
export function readParagraph(
  value: unknown,
  path: IssuePath,
  max: number,
  maxLines: number,
  issues: IssueList,
  required = false,
): string | undefined {
  if (required && isBlank(value)) {
    issues.add('required', path, 'Required');
    return undefined;
  }
  const raw = readString(value, path, issues);
  if (raw === undefined) return undefined;
  const text = raw.replace(/\r\n?/g, '\n');
  if (CONTROL_EXCEPT_NEWLINE.test(text)) {
    issues.add('invalid_characters', path, 'Control characters are not allowed in this field');
    return undefined;
  }
  if (!checkLength(text, path, max, issues)) return undefined;
  const lines = text.split('\n').length;
  if (lines > maxLines) {
    issues.add('too_many_lines', path, `At most ${maxLines} lines, received ${lines}`);
    return undefined;
  }
  return text;
}

/**
 * Reads a list; absent counts as empty.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param max - Its maximum number of entries.
 * @param issues - Where problems are reported: `invalid_type`, `too_many`.
 * @returns The entries, unchecked; empty when the list is absent or invalid.
 */
export function readList(value: unknown, path: IssuePath, max: number, issues: IssueList): unknown[] {
  if (isAbsent(value)) return [];
  if (!Array.isArray(value)) {
    issues.add('invalid_type', path, 'Expected an array');
    return [];
  }
  if (value.length > max) {
    issues.add('too_many', path, `At most ${max} entries, received ${value.length}`);
    return [];
  }
  return value;
}

/**
 * Reads a list of texts on one line, blank entries being left out.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param maxLines - The maximum number of entries.
 * @param max - The maximum length of an entry.
 * @param issues - Where problems are reported.
 * @returns The texts.
 */
export function readLines(value: unknown, path: IssuePath, maxLines: number, max: number, issues: IssueList): string[] {
  return readList(value, path, maxLines, issues).flatMap((entry, index) => {
    const line = readLine(entry, [...path, index], max, issues);
    return line === undefined ? [] : [line];
  });
}

/**
 * Reads a boolean.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param issues - Where problems are reported: `invalid_type`.
 * @returns The boolean, or `undefined` when absent or invalid.
 */
export function readBoolean(value: unknown, path: IssuePath, issues: IssueList): boolean | undefined {
  if (isAbsent(value)) return undefined;
  if (typeof value === 'boolean') return value;
  issues.add('invalid_type', path, `Expected a boolean, received ${typeof value}`);
  return undefined;
}

/**
 * Reads one value among a few allowed.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param options - The values allowed.
 * @param issues - Where problems are reported: `invalid_option`.
 * @returns The value, or `undefined` when absent or not allowed.
 */
export function readOption<T extends string>(
  value: unknown,
  path: IssuePath,
  options: readonly T[],
  issues: IssueList,
): T | undefined {
  if (isAbsent(value)) return undefined;
  if (options.includes(value as T)) return value as T;
  issues.add('invalid_option', path, `Expected one of ${options.map((option) => `"${option}"`).join(', ')}`);
  return undefined;
}

/** Whether a year, a month (1 to 12) and a day exist in the calendar: not the 30 February. */
function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Reads a calendar date written `YYYY-MM-DD`.
 *
 * @param value - The value.
 * @param path - Where it is.
 * @param required - Whether a blank value is a problem.
 * @param issues - Where problems are reported: `required`, `invalid_type`, `invalid_date`.
 * @returns The date as written, or `undefined`.
 */
export function readDate(value: unknown, path: IssuePath, required: boolean, issues: IssueList): string | undefined {
  if (required && isBlank(value)) {
    issues.add('required', path, 'Required');
    return undefined;
  }
  const text = readString(value, path, issues);
  if (text === undefined) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null || !isCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
    issues.add('invalid_date', path, `Expected a date written YYYY-MM-DD, received ${JSON.stringify(text)}`);
    return undefined;
  }
  return text;
}

/**
 * Reads a decimal number with at most a given number of decimals, within ±limit; blank counts as absent.
 *
 * @param value - The value, a string or a number.
 * @param path - Where it is.
 * @param decimals - The decimals allowed, which are also the unit of the result.
 * @param limit - The largest magnitude allowed, in that unit.
 * @param issues - Where problems are reported: `invalid_number`, `out_of_range`.
 * @returns The number as an integer of that unit, or `undefined`.
 */
export function readNumber(
  value: unknown,
  path: IssuePath,
  decimals: number,
  limit: bigint,
  issues: IssueList,
): bigint | undefined {
  if (isBlank(value)) return undefined;
  const parsed = parseDecimal(value, decimals);
  if (parsed === undefined) {
    issues.add('invalid_number', path, `Expected a number with at most ${decimals} decimals, e.g. "12.50"`);
    return undefined;
  }
  if (parsed < -limit || parsed > limit) {
    issues.add('out_of_range', path, `Expected a number within ±${toShortDecimal(limit, decimals)}`);
    return undefined;
  }
  return parsed;
}

/**
 * Freezes an object and everything in it, except the bytes of a logo, which cannot be frozen.
 *
 * @param value - The object.
 * @returns The same object, frozen.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !(value instanceof Uint8Array)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}
