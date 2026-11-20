/**
 * Types of the themes: what the caller chooses, how a theme is defined, and the colours computed from it.
 *
 * @module
 */

/** The names of the themes: `standard` (black and grey), `business` (a filled band), `modern` (light tints). */
export type ThemeName = 'standard' | 'business' | 'modern';

/** How the header of the table is drawn: black text over a rule, a band filled with the accent, or a light tint. */
export type TableHeaderStyle = 'rule' | 'band' | 'tint';

/** The look of the invoice, as given: a theme, and optionally its colour. */
export interface InvoiceTheme {
  /** The theme; `standard` by default. */
  readonly name?: ThemeName | undefined;
  /** The accent colour, as `#RRGGBB`; each theme has its own by default. */
  readonly accent?: string | undefined;
}

/** The theme of a valid invoice. */
export interface InvoiceThemeData {
  /** The theme. */
  readonly name: ThemeName;
  /** The accent colour, as `#RRGGBB` in upper case, if one was given. */
  readonly accent?: string;
}

/**
 * A theme: where its accent colour goes. A theme changes only the look of the invoice, never its layout; the
 * colours themselves are computed by {@link resolveTheme}, which keeps every text readable.
 */
export interface ThemeDefinition {
  /** The name of the theme. */
  readonly name: ThemeName;
  /** The accent colour when the caller gives none, as `#RRGGBB`. */
  readonly accent: string;
  /** Whether the title is written in the accent colour; otherwise in black. */
  readonly accentTitle: boolean;
  /** How the header of the table is drawn. */
  readonly tableHeader: TableHeaderStyle;
  /** Whether every other row of the table is lightly tinted with the accent. */
  readonly stripedRows: boolean;
  /** Whether a thin bar of the accent colour runs along the top of each page. */
  readonly topBar: boolean;
  /** Whether the total is written in the accent colour; otherwise in black. */
  readonly accentTotal: boolean;
}

/** The colours of an invoice, computed from its theme and accent, each as `#RRGGBB`. */
export interface ThemeColors {
  /** Body text. */
  readonly text: string;
  /** Labels and remarks: a grey still readable on white. */
  readonly muted: string;
  /** Thin rules between the rows of the table. */
  readonly line: string;
  /** The title of the document. */
  readonly title: string;
  /** The text of the table header. */
  readonly tableHeaderText: string;
  /** The background of the table header, for a band or a tint. */
  readonly tableHeaderBackground?: string;
  /** The rule under the table header, for the `rule` style. */
  readonly tableHeaderRule?: string;
  /** The background of every other row, for striped rows. */
  readonly stripe?: string;
  /** The total. */
  readonly total: string;
  /** The rule above the total. */
  readonly totalRule: string;
  /** The bar along the top of each page. */
  readonly topBar?: string;
}
