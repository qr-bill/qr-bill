// The invoices shown in the READMEs are what the code draws, not pictures made by hand: three invoices in the three
// themes, with the icon of qr-bill as their logo. This test fails when the PDFs of docs/assets no longer match the code
// (texts, fonts, sizes, positions); `pnpm readme:invoices` writes them again with their previews, to look at and
// commit with the change.
import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { Resvg } from '@resvg/resvg-js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { createInvoicePDF } from '../src/index.js';
import { QR_IBAN, QR_REFERENCE, UID } from './fixtures.js';
import { readPDF } from './render.js';

const ASSETS = new URL('../../../docs/assets/', import.meta.url);
const UPDATE = process.env['UPDATE_README_INVOICES'] === '1';

/** The icon of qr-bill, prepared as a user would prepare a logo: a PNG as high as the box at 300 dpi. */
function icon(): Uint8Array {
  const svg = readFileSync(new URL('icon-black.svg', ASSETS));
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: 'height', value: 213 } }).render().asPng());
}

/** The issuer of the three invoices: the fictional company of the examples of the standard. */
const ISSUER = {
  name: 'Max Muster & Söhne',
  street: 'Musterstrasse',
  buildingNumber: '123',
  postalCode: '8000',
  town: 'Seldwyla',
  country: 'CH',
  phones: ['+41 44 123 45 67'],
  email: 'info@muster-soehne.example',
  contact: 'www.muster-soehne.example',
  uid: UID,
  vatRegistered: true,
};

/** The recipient, and the payment. */
const RECIPIENT = {
  name: 'Pia-Maria Rutschmann-Schnyder',
  street: 'Grosse Marktgasse',
  buildingNumber: '28',
  postalCode: '9400',
  town: 'Rorschach',
  country: 'CH',
};
const PAYMENT = { account: QR_IBAN, reference: QR_REFERENCE };

/** The invoices: their file name, the width of their preview in pixels, their data. */
const INVOICES = [
  {
    name: 'invoice-business',
    width: 1240,
    input: {
      language: 'en',
      theme: 'business',
      number: '2026-042',
      date: '2026-11-20',
      dueDate: '2026-12-20',
      servicePeriod: 'November 2026',
      customerReference: 'PO 4711',
      subject: 'Redesign of the website and hosting',
      issuer: ISSUER,
      recipient: { ...RECIPIENT, salutation: 'Ms' },
      items: [
        { description: 'Design workshop', quantity: 1, unit: 'day', unitPrice: '1200', vatRate: '8.1' },
        { description: 'Development of the new website', quantity: 24, unit: 'h', unitPrice: '150', vatRate: '8.1' },
        {
          description: 'Hosting, December 2026 to November 2027',
          quantity: 1,
          unit: 'year',
          unitPrice: '480',
          vatRate: '8.1',
        },
        { description: 'Loyalty discount 10 % on the development', amount: '-360', vatRate: '8.1' },
      ],
      mentions: { paymentDays: 30, thanks: true },
      payment: PAYMENT,
    },
  },
  {
    name: 'invoice-standard',
    width: 600,
    input: {
      language: 'fr',
      number: '2026-043',
      date: '2026-11-20',
      dueDate: '2026-12-20',
      subject: 'Cotisation et cours 2027',
      issuer: ISSUER,
      recipient: { ...RECIPIENT, salutation: 'Madame' },
      items: [
        { description: 'Cotisation de membre 2027', quantity: 1, unitPrice: '80', vatRate: '8.1' },
        {
          description: 'Cours du samedi, semestre de printemps',
          quantity: 12,
          unit: 'cours',
          unitPrice: '25',
          vatRate: '8.1',
        },
      ],
      mentions: { paymentDays: 30, thanks: true },
      payment: PAYMENT,
    },
  },
  {
    name: 'invoice-modern',
    width: 600,
    input: {
      language: 'de',
      theme: 'modern',
      number: '2026-044',
      date: '2026-11-20',
      dueDate: '2026-12-20',
      servicePeriod: 'November 2026',
      subject: 'Wartung und Support',
      issuer: ISSUER,
      recipient: { ...RECIPIENT, salutation: 'Frau' },
      items: [
        { description: 'Wartungsvertrag, November 2026', quantity: 1, unit: 'Monat', unitPrice: '390', vatRate: '8.1' },
        { description: 'Support nach Aufwand', quantity: 5.5, unit: 'Std.', unitPrice: '140', vatRate: '8.1' },
        {
          description: 'Fachbuch «Zahlungsverkehr in der Schweiz»',
          quantity: 2,
          unit: 'Stk.',
          unitPrice: '39.50',
          vatRate: '2.6',
        },
      ],
      mentions: { paymentDays: 30, thanks: true },
      payment: PAYMENT,
    },
  },
];

/** The first page of a PDF as a PNG file, a given number of pixels wide, on white. */
async function preview(pdf: Uint8Array, width: number): Promise<Uint8Array> {
  const task = getDocument({ data: pdf.slice(), verbosity: 0 });
  const page = await (await task.promise).getPage(1);
  const [, , pageWidth] = page.view as [number, number, number, number];
  const viewport = page.getViewport({ scale: width / pageWidth });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const context = canvas.getContext('2d');
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas: canvas as never, canvasContext: context as never, viewport }).promise;
  await task.destroy();
  return new Uint8Array(canvas.toBuffer('image/png'));
}

/** The texts of a PDF with their font, size and position, rounded: what must not change. */
async function texts(pdf: Uint8Array): Promise<string[]> {
  const pages = await readPDF(pdf);
  return pages.flatMap((page, index) =>
    page.texts.map((text) =>
      [
        index + 1,
        text.text,
        text.font.replace(/^[A-Z]{6}\+/, ''),
        text.size,
        text.x.toFixed(2),
        text.y.toFixed(2),
      ].join(' '),
    ),
  );
}

describe('the invoices of the READMEs', () => {
  it.each(INVOICES)('$name is what the code draws', async ({ name, width, input }) => {
    const pdf = await createInvoicePDF({ ...input, issuer: { ...input.issuer, logo: icon() } } as never);
    const file = new URL(`${name}.pdf`, ASSETS);
    if (UPDATE) {
      writeFileSync(file, pdf);
      writeFileSync(new URL(`${name}.png`, ASSETS), await preview(pdf, width));
    }
    const pages = await readPDF(pdf);
    // One page, the payment slip at its bottom.
    expect(pages).toHaveLength(1);
    expect(await texts(new Uint8Array(readFileSync(file)))).toEqual(await texts(pdf));
  });
});
