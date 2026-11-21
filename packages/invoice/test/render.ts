// Helpers of the tests of the rendering: an invoice written as a PDF, then read back by pdfjs (its texts with their
// font, size and position) or rasterised; positions are converted to millimetres, the unit of the code.
import { createCanvas } from '@napi-rs/canvas';
import { expect } from 'vitest';
import { type PDFPage, type PDFText, type Pixels, near, rasterize, readPDF } from '../../pdfkit/test/helpers.js';
import { type InvoiceInput, createInvoicePDF } from '../src/index.js';

export type { PDFPage, PDFText, Pixels };
export { near, rasterize, readPDF };

/** Points in a millimetre. */
export const PT = 72 / 25.4;

/** A PDF written and read back. */
export interface Rendered {
  /** The bytes of the file. */
  readonly pdf: Uint8Array;
  /** Its pages, as pdfjs reads them. */
  readonly pages: readonly PDFPage[];
}

/** Writes the PDF of an invoice and reads it back. */
export async function render(input: unknown): Promise<Rendered> {
  const pdf = await createInvoicePDF(input as InvoiceInput);
  return { pdf, pages: await readPDF(pdf) };
}

/** A text read back, its position and width in millimetres, its weight from the name of its font. */
export interface Text {
  readonly text: string;
  /** Left edge. */
  readonly x: number;
  /** Baseline. */
  readonly y: number;
  readonly width: number;
  /** Size in points. */
  readonly size: number;
  readonly bold: boolean;
}

/** The texts of a page, in millimetres. */
export function textsOf(page: PDFPage | undefined): Text[] {
  expect(page).toBeDefined();
  return (page?.texts ?? []).map((text) => ({
    text: text.text,
    x: text.x / PT,
    y: text.y / PT,
    width: text.width / PT,
    size: text.size,
    bold: text.font.includes('Bold'),
  }));
}

/** The text of a page that reads exactly so; fails the test when there is none. */
export function find(page: PDFPage | undefined, text: string): Text {
  const found = textsOf(page).find((candidate) => candidate.text === text);
  if (found === undefined) throw new Error(`"${text}" is not printed`);
  return found;
}

/** Every text of a document, all pages together. */
export function allTexts(rendered: Rendered): string[] {
  return rendered.pages.flatMap((page) => page.texts.map((text) => text.text));
}

/** The colour of a pixel of an image, as `#RRGGBB`. */
export function pixel(image: Pixels, x: number, y: number): string {
  const index = (Math.round(y) * image.width + Math.round(x)) * 4;
  const hex = [0, 1, 2].map((channel) => (image.data[index + channel] ?? 0).toString(16).padStart(2, '0'));
  return `#${hex.join('')}`.toUpperCase();
}

/** The colour of a page at a point given in millimetres, the page rasterised at 10 pixels per millimetre. */
export async function colorAt(pdf: Uint8Array, page: number, x: number, y: number): Promise<string> {
  const image = await rasterize(pdf, 2100, page);
  return pixel(image, x * 10, y * 10);
}

/** A logo of 300 × 100 pixels, all dark blue, as a PNG or a JPEG file. */
export function logo(format: 'png' | 'jpeg'): Uint8Array {
  const canvas = createCanvas(300, 100);
  const context = canvas.getContext('2d');
  context.fillStyle = '#1F3A5F';
  context.fillRect(0, 0, 300, 100);
  return new Uint8Array(format === 'png' ? canvas.toBuffer('image/png') : canvas.toBuffer('image/jpeg'));
}
