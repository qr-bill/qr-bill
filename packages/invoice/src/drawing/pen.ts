/**
 * Drawing on a PDFKit document in millimetres: texts at their baseline, in Liberation Sans without kerning nor
 * ligatures (so that they take the width they were measured with), rectangles, lines and images.
 *
 * @module
 */

import { POINTS_PER_MM, type RegisteredFonts } from '@qr-bill/pdfkit';
import type { InvoiceDocument, Measure, TextStyle } from './drawing.types.js';

/** Kerning and ligatures off: PDFKit applies them by default, and they change the width of a text. */
const NO_KERNING = { features: { kern: false, liga: false } } as const;

/** Draws on a PDFKit document, in millimetres from the top left corner of the page. */
export class Pen {
  /** The document. */
  readonly doc: InvoiceDocument;
  /** The names of the regular and bold fonts. */
  private readonly fonts: RegisteredFonts;

  /**
   * @param doc - The document.
   * @param fonts - The names of the fonts, as registered by `registerFonts` of `@qr-bill/pdfkit`.
   */
  constructor(doc: InvoiceDocument, fonts: RegisteredFonts) {
    this.doc = doc;
    this.fonts = fonts;
  }

  /** Selects the font and its size. */
  private select(size: number, bold: boolean | undefined): void {
    this.doc.font(bold === true ? this.fonts.bold : this.fonts.regular);
    this.doc.fontSize(size);
  }

  /**
   * The width of a text.
   *
   * @param text - The text.
   * @param size - Its size in points.
   * @param bold - Whether it is bold.
   * @returns The width in millimetres.
   */
  measure(text: string, size: number, bold?: boolean): number {
    this.select(size, bold);
    return this.doc.widthOfString(text, NO_KERNING) / POINTS_PER_MM;
  }

  /**
   * The function measuring texts of a size and weight, for `wrap` and `shorten`.
   *
   * @param size - The size in points.
   * @param bold - Whether bold.
   * @returns The measure.
   */
  measurer(size: number, bold?: boolean): Measure {
    return (text) => this.measure(text, size, bold);
  }

  /**
   * Writes a text on one line.
   *
   * @param text - The text, which must fit where it goes.
   * @param x - Where it starts, or ends when aligned right.
   * @param y - Its baseline.
   * @param style - Its size, weight, colour and alignment.
   */
  text(text: string, x: number, y: number, style: TextStyle): void {
    const start = style.align === 'right' ? x - this.measure(text, style.size, style.bold) : x;
    this.select(style.size, style.bold);
    this.doc.fillColor(style.color);
    this.doc.text(text, start * POINTS_PER_MM, y * POINTS_PER_MM, {
      ...NO_KERNING,
      baseline: 'alphabetic',
      lineBreak: false,
    });
  }

  /**
   * Fills a rectangle.
   *
   * @param x - Left edge.
   * @param y - Top edge.
   * @param width - Width.
   * @param height - Height.
   * @param color - Colour, `#RRGGBB`.
   */
  rect(x: number, y: number, width: number, height: number, color: string): void {
    const k = POINTS_PER_MM;
    this.doc.rect(x * k, y * k, width * k, height * k);
    this.doc.fill(color);
  }

  /**
   * Draws a horizontal line.
   *
   * @param x1 - Start.
   * @param x2 - End.
   * @param y - Height.
   * @param width - Thickness in points.
   * @param color - Colour, `#RRGGBB`.
   */
  line(x1: number, x2: number, y: number, width: number, color: string): void {
    const k = POINTS_PER_MM;
    this.doc.moveTo(x1 * k, y * k);
    this.doc.lineTo(x2 * k, y * k);
    this.doc.lineWidth(width);
    this.doc.stroke(color);
  }

  /**
   * Draws an image fitted in a box, keeping its proportions, in the top left corner of the box.
   *
   * @param bytes - A PNG or JPEG file.
   * @param x - Left edge of the box.
   * @param y - Top edge of the box.
   * @param width - Width of the box.
   * @param height - Height of the box.
   */
  image(bytes: Uint8Array, x: number, y: number, width: number, height: number): void {
    const k = POINTS_PER_MM;
    // PDFKit reads images from a Buffer; a plain Uint8Array would be taken for a file path.
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.doc.image(buffer, x * k, y * k, { fit: [width * k, height * k] });
  }
}
