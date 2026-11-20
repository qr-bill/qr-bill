/**
 * The `standard` theme, the default: black text and grey rules, sober. The accent colours only the rules of the
 * table header and of the total.
 *
 * @module
 */

import type { ThemeDefinition } from './themes.types.js';

/** The `standard` theme. */
export const STANDARD_THEME: ThemeDefinition = {
  name: 'standard',
  accent: '#555555',
  accentTitle: false,
  tableHeader: 'rule',
  stripedRows: false,
  topBar: false,
  accentTotal: false,
};
