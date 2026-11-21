/**
 * Types of the drawing of an invoice: the PDFKit document it is drawn in, how a text is written, how texts are
 * measured, and what every part of the page needs to draw itself.
 *
 * @module
 */

import type { PDFKitDocument } from '@qr-bill/pdfkit';
import type { Invoice } from '../invoice/invoice.types.js';
import type { InvoiceLabels } from '../labels/labels.types.js';
import type { ThemeColors } from '../themes/themes.types.js';
import type { Pen } from './pen.js';

/**
 * The methods of a PDFKit document the invoice calls, besides those the payment slip calls. Like the adapter, the
 * invoice describes the document by the methods it uses rather than by `@types/pdfkit`.
 */
export interface InvoiceDocument extends PDFKitDocument {
  /** The width of a text in the current font and size, in points. */
  widthOfString(text: string, options: object): number;
  /** Starts a rectangle. */
  rect(x: number, y: number, width: number, height: number): unknown;
  /** Starts a path at a point. */
  moveTo(x: number, y: number): unknown;
  /** Adds a straight line to the path. */
  lineTo(x: number, y: number): unknown;
  /** Draws an image. */
  image(source: Buffer, x: number, y: number, options: object): unknown;
  /** The pages kept in memory: all of them, with `bufferPages`. */
  bufferedPageRange(): { readonly start: number; readonly count: number };
  /** Makes a page kept in memory the current one. */
  switchToPage(index: number): unknown;
}

/** How a text is written. */
export interface TextStyle {
  /** Size in points. */
  readonly size: number;
  /** Whether it is bold. */
  readonly bold?: boolean | undefined;
  /** Colour, `#RRGGBB`. */
  readonly color: string;
  /** `left` (default): the text starts at x; `right`: it ends at x. */
  readonly align?: 'left' | 'right' | undefined;
}

/** Measures the width of a text, in millimetres. */
export type Measure = (text: string) => number;

/** An invoice being drawn: its data, its texts and colours, and the pen that draws it. */
export interface RenderContext {
  /** The invoice, valid. */
  readonly invoice: Invoice;
  /** The texts in its language. */
  readonly labels: InvoiceLabels;
  /** The colours of its theme. */
  readonly colors: ThemeColors;
  /** Draws on the document. */
  readonly pen: Pen;
  /** Whether the issuer and the recipient are in different countries: their addresses then show their country. */
  readonly foreign: boolean;
}
