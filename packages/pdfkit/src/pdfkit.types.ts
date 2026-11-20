/**
 * Types of the adapter: the part of a PDFKit document it uses, the fonts and the options.
 *
 * The document is described by the few methods the adapter calls rather than by `@types/pdfkit`, so that any
 * version of PDFKit from 0.17 works and your project needs no type package for it.
 *
 * @module
 */

import type { LayoutOptions } from '@qr-bill/core';

/** Margins of a page, in points. */
export interface PageMargins {
  /** Top margin. */
  readonly top: number;
  /** Bottom margin. */
  readonly bottom: number;
  /** Left margin. */
  readonly left: number;
  /** Right margin. */
  readonly right: number;
}

/** The current page of a PDFKit document. */
export interface PDFKitPage {
  /** Width, in points. */
  readonly width: number;
  /** Height, in points. */
  readonly height: number;
  /** Margins, in points. */
  readonly margins: PageMargins;
}

/** The methods and properties of a PDFKit document (`new PDFDocument()`) that the adapter uses. */
export interface PDFKitDocument {
  /** The current page. */
  readonly page: PDFKitPage;
  /** Horizontal position of the text cursor, in points. */
  x: number;
  /** Vertical position of the text cursor, in points from the top of the page. */
  y: number;
  /** Adds a page. */
  addPage(options: { size: [number, number]; margins: PageMargins }): unknown;
  /** Registers a font under a name. */
  registerFont(name: string, source: Uint8Array): unknown;
  /** Selects a registered font. */
  font(name: string): unknown;
  /** Sets the font size, in points. */
  fontSize(size: number): unknown;
  /** Sets the color of the text and of the next fills. */
  fillColor(color: string): unknown;
  /**
   * Writes text. The adapter writes one line from its baseline at (x, y), without kerning nor ligatures:
   * `{ baseline: 'alphabetic', lineBreak: false, features: { kern: false, liga: false } }`. The options are typed as
   * `object` because `@types/pdfkit` only describes the features as an array, which cannot turn off the defaults.
   */
  text(text: string, x: number, y: number, options: object): unknown;
  /** Saves the graphics state. */
  save(): unknown;
  /** Restores the graphics state. */
  restore(): unknown;
  /** Moves the origin. */
  translate(x: number, y: number): unknown;
  /** Scales the coordinates. */
  scale(factor: number): unknown;
  /** Starts a path from SVG path data. */
  path(d: string): unknown;
  /** Fills the current path. */
  fill(color: string): unknown;
  /** Strokes the current path. */
  stroke(color: string): unknown;
  /** Sets the opacity of fills and strokes, from 0 to 1. */
  opacity(opacity: number): unknown;
  /** Sets the shape of the ends of lines. */
  lineCap(style: 'butt'): unknown;
  /** Sets the line width, in the current units. */
  lineWidth(width: number): unknown;
  /** Sets a dash pattern: the lengths of the dashes and the gaps, in the current units. */
  dash(pattern: number[]): unknown;
  /** Removes the dash pattern. */
  undash(): unknown;
}

/** The font files of the payment slip: TrueType or OpenType, with the metrics of Liberation Sans (or Arial). */
export interface PaymentSlipFonts {
  /** Regular weight. */
  readonly regular: Uint8Array;
  /** Bold weight. */
  readonly bold: Uint8Array;
}

/** Options of {@link drawPaymentSlip}. */
export interface DrawOptions {
  /** Left edge of the slip, in points from the left of the page. */
  readonly x: number;
  /** Top edge of the slip, in points from the top of the page. */
  readonly y: number;
  /** Font files; by default Liberation Sans, shipped with this package. */
  readonly fonts?: PaymentSlipFonts | undefined;
}

/** Options of {@link attachTo}: those of the layout, and the fonts. */
export interface AttachOptions extends LayoutOptions {
  /** Font files; by default Liberation Sans, shipped with this package. */
  readonly fonts?: PaymentSlipFonts | undefined;
}

/** What {@link attachTo} did. */
export interface AttachResult {
  /** Whether a page was added, because the current one had not enough room left. */
  readonly newPage: boolean;
}
