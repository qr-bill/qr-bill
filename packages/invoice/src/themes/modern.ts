/**
 * The `modern` theme: a thin bar of the accent colour along the top of each page, the title and the total in that
 * colour, the table header in a light tint of it, and every other row lightly tinted. Teal by default.
 *
 * @module
 */

import type { ThemeDefinition } from './themes.types.js';

/** The `modern` theme. */
export const MODERN_THEME: ThemeDefinition = {
  name: 'modern',
  accent: '#0F766E',
  accentTitle: true,
  tableHeader: 'tint',
  stripedRows: true,
  topBar: true,
  accentTotal: true,
};
