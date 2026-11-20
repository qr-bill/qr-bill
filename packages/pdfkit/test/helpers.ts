// Helpers of the tests of the adapter: the bills of the SIX examples, PDFKit documents written in memory, and what
// pdfjs reads back from them: the texts with their font, size and position, and the pages as pixels.
import { readFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { type QRBill, type QRBillInput, createQRBill } from '@qr-bill/core';
import PDFDocument from 'pdfkit';
import OldestPDFDocument from 'pdfkit-0.17';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { expect } from 'vitest';

const { examples } = JSON.parse(
  readFileSync(new URL('../../../conformance/six-ig-v2.4-examples.json', import.meta.url), 'utf8'),
) as { examples: { id: string; input: QRBillInput }[] };

/** The six examples of Annex A, as bills. */
export const SIX_BILLS: readonly { id: string; bill: QRBill }[] = examples.map(({ id, input }) => ({
  id,
  bill: createQRBill(input),
}));

/** The first example of Annex A. */
export const BILL: QRBill = createQRBill((examples[0] ?? { input: {} }).input as QRBillInput);

/** Points in a millimetre. */
export const PT = 72 / 25.4;

/** A4 in points, as PDFKit defines it. */
export const A4 = { width: 595.28, height: 841.89 } as const;

/** Matches a number within `digits` decimals of a value, in `toEqual` and `toMatchObject`. */
export function near(value: number, digits: number): number {
  // An asymmetric matcher is typed `any`; it stands for the number it matches.
  return expect.closeTo(value, digits) as number;
}

/** The oldest version of PDFKit the adapter supports, 0.17.0, as its peer dependency says. */
export const OLDEST_PDFKIT: typeof PDFDocument = OldestPDFDocument;

/** Writes a PDFKit document in memory, with the latest version of PDFKit unless another one is given. */
export async function writePDF(
  options: PDFKit.PDFDocumentOptions,
  write: (doc: PDFKit.PDFDocument) => void,
  PDFKitDocument: typeof PDFDocument = PDFDocument,
): Promise<Uint8Array> {
  const doc = new PDFKitDocument(options);
  const chunks: Uint8Array[] = [];
  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
  const ended = new Promise((resolve) => doc.on('end', resolve));
  write(doc);
  doc.end();
  await ended;
  return new Uint8Array(Buffer.concat(chunks));
}

/** A line of text read back from a PDF: its font, its size in points, its position in points from the top left. */
export interface PDFText {
  readonly text: string;
  readonly font: string;
  readonly size: number;
  readonly x: number;
  /** Baseline, from the top of the page. */
  readonly y: number;
  readonly width: number;
}

/** A page read back from a PDF. */
export interface PDFPage {
  readonly width: number;
  readonly height: number;
  /** The texts, in the order they were written; the spaces pdfjs inserts between them are left out. */
  readonly texts: readonly PDFText[];
}

/** Reads the pages of a PDF with pdfjs. */
export async function readPDF(data: Uint8Array): Promise<PDFPage[]> {
  // pdfjs takes over the buffer it is given: give it a copy.
  const task = getDocument({ data: data.slice(), fontExtraProperties: true, verbosity: 0 });
  const pdf = await task.promise;
  const pages: PDFPage[] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    // The operator list loads the fonts, whose names the texts refer to.
    await page.getOperatorList();
    const [, , width, height] = page.view as [number, number, number, number];
    const texts = (await page.getTextContent()).items.flatMap((item) => {
      if (!('str' in item) || item.str.trim() === '') return [];
      const [size, , , , x, y] = item.transform as [number, number, number, number, number, number];
      const { name } = page.commonObjs.get(item.fontName) as { name: string };
      return [{ text: item.str, font: name, size, x, y: height - y, width: item.width }];
    });
    pages.push({ width, height, texts });
  }
  await task.destroy();
  return pages;
}

/** Pixels of an image, RGBA, as ZXing reads them. */
export interface Pixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/** Renders a page of a PDF as pixels, the given number of pixels wide. */
export async function rasterize(data: Uint8Array, width: number, pageNumber = 1): Promise<Pixels> {
  const task = getDocument({ data: data.slice(), verbosity: 0 });
  const pdf = await task.promise;
  const page = await pdf.getPage(pageNumber);
  const [, , pageWidth] = page.view as [number, number, number, number];
  const viewport = page.getViewport({ scale: width / pageWidth });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const context = canvas.getContext('2d');
  await page.render({ canvas: canvas as never, canvasContext: context as never, viewport }).promise;
  await task.destroy();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return { data: image.data, width: image.width, height: image.height };
}
