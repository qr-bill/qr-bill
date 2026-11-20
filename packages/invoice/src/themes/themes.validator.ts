/**
 * Validation of the theme of an invoice: its name, and its accent colour written `#RRGGBB`.
 *
 * @module
 */

import { type IssueList, isAbsent, isRecord, readOption } from '../fields/fields.js';
import { INVOICE_THEMES } from './themes.js';
import type { InvoiceThemeData, ThemeName } from './themes.types.js';

/**
 * Reads the theme: the name of a theme, or an object with a name and an accent colour.
 *
 * @param value - The theme, as given.
 * @param issues - Where problems are reported: `invalid_type`, `invalid_option`, `invalid_color`.
 * @returns The theme; `standard` when absent or invalid.
 */
export function readTheme(value: unknown, issues: IssueList): InvoiceThemeData {
  if (isAbsent(value)) return { name: 'standard' };
  const record = typeof value === 'string' ? { name: value } : value;
  if (!isRecord(record)) {
    issues.add('invalid_type', ['theme'], 'Expected the name of a theme or an object with a name and an accent');
    return { name: 'standard' };
  }
  const path = typeof value === 'string' ? ['theme'] : ['theme', 'name'];
  const name = readOption<ThemeName>(record['name'], path, INVOICE_THEMES, issues) ?? 'standard';
  const accent = record['accent'];
  if (isAbsent(accent)) return { name };
  if (typeof accent === 'string' && /^#[0-9a-f]{6}$/iu.test(accent.trim())) {
    return { name, accent: accent.trim().toUpperCase() };
  }
  issues.add('invalid_color', ['theme', 'accent'], 'Expected a colour written #RRGGBB, e.g. "#1F3A5F"');
  return { name };
}
