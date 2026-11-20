/**
 * The `business` theme: the title and the total in the accent colour, and the table header in a band filled with
 * it. Dark blue by default.
 *
 * @module
 */

import type { ThemeDefinition } from './themes.types.js';

/** The `business` theme. */
export const BUSINESS_THEME: ThemeDefinition = {
  name: 'business',
  accent: '#1F3A5F',
  accentTitle: true,
  tableHeader: 'band',
  stripedRows: false,
  topBar: false,
  accentTotal: true,
};
