/**
 * The invoice as a PDF: an A4 document drawn with PDFKit in Liberation Sans, the payment slip at the bottom of the
 * last page.
 *
 * @module
 */

import { layoutQRBill } from '@qr-bill/core';
import { POINTS_PER_MM, attachTo, registerFonts } from '@qr-bill/pdfkit';
import PDFDocument from 'pdfkit';
import { drawDetails } from '../details/details.js';
import type { InvoiceDocument, RenderContext } from '../drawing/drawing.types.js';
import { Pen } from '../drawing/pen.js';
import { drawAddressWindow } from '../header/address-window.js';
import { drawContinuedHeader } from '../header/continued-header.js';
import { drawIssuer } from '../header/issuer.js';
import { drawLetterhead } from '../header/letterhead.js';
import { InvoiceValidationError } from '../invoice/errors.js';
import type { Invoice, InvoiceInput } from '../invoice/invoice.types.js';
import { validateInvoice } from '../invoice/invoice.validator.js';
import { INVOICE_LABELS } from '../labels/labels.js';
import { drawPageDecorations } from '../page/decorations.js';
import { Flow } from '../page/flow.js';
import { drawSummary } from '../summary/summary.js';
import { drawTable } from '../table/table.js';
import { resolveTheme } from '../themes/themes.js';

/**
 * Draws a valid invoice in a document, page after page, then its payment slip.
 *
 * @param doc - A PDFKit document of A4 pages without margins, keeping its pages in memory (`bufferPages`).
 * @param invoice - The invoice.
 */
function drawInvoice(doc: InvoiceDocument, invoice: Invoice): void {
  const context: RenderContext = {
    invoice,
    labels: INVOICE_LABELS[invoice.language],
    colors: resolveTheme(invoice.theme),
    pen: new Pen(doc, registerFonts(doc)),
    foreign: invoice.issuer.country !== invoice.recipient.country,
  };
  drawLetterhead(context);
  drawIssuer(context);
  drawAddressWindow(context);
  const flow = new Flow(doc, 0, () => {
    drawContinuedHeader(context);
  });
  drawDetails(context, flow);
  drawTable(context, flow);
  drawSummary(context, flow);
  if (invoice.bill !== undefined) {
    // The slip and its cutting lines take the bottom of the last page; when they do not fit, they go to a new page,
    // which gets the header of the following pages like the others.
    const options = { language: invoice.language };
    const slip = layoutQRBill(invoice.bill, options);
    flow.ensure(slip.height - slip.bounds.y, doc.page.height / POINTS_PER_MM);
    doc.y = flow.y * POINTS_PER_MM;
    attachTo(doc, invoice.bill, options);
  }
  drawPageDecorations(context);
}

/**
 * Creates the PDF of an invoice: an A4 document with the letterhead of the issuer, the recipient in the window of
 * the envelope, the details, the lines over as many pages as needed, the totals, the mentions, and the payment slip
 * at the bottom of the last page, or on a page of its own when there is no room left. Without `payment`, or with a
 * negative total (a credit note), the invoice has no payment slip.
 *
 * Nothing overflows: every text is wrapped or shortened within its zone, whatever its length within
 * {@link INVOICE_LIMITS}. The fonts are Liberation Sans, embedded with only the characters used.
 *
 * @param input - The data of the invoice, checked by {@link validateInvoice}.
 * @returns The bytes of the PDF file.
 * @throws {InvoiceValidationError} When the data is not valid, with every problem found.
 * @example
 * ```ts
 * const pdf = await createInvoicePDF({
 *   language: 'fr',
 *   date: '2026-11-20',
 *   issuer: { name: 'Max Muster & Söhne', street: 'Musterstrasse', buildingNumber: '123', postalCode: '8000', town: 'Seldwyla', country: 'CH' },
 *   recipient: { name: 'Simon Muster', postalCode: '8000', town: 'Seldwyla', country: 'CH' },
 *   items: [{ description: 'Conseil', quantity: 6, unit: 'h', unitPrice: '150', vatRate: '8.1' }],
 *   payment: { account: 'CH44 3199 9123 0008 8901 2', reference: '210000000003139471430009017' },
 * });
 * await writeFile('facture.pdf', pdf);
 * ```
 */
export async function createInvoicePDF(input: InvoiceInput): Promise<Uint8Array> {
  const result = validateInvoice(input);
  if (!result.success) throw new InvoiceValidationError(result.issues);
  const invoice = result.data;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    lang: invoice.language,
    info: {
      Title: [invoice.title, invoice.number].filter((part) => part !== undefined).join(' '),
      Author: invoice.issuer.name,
    },
  });
  const chunks: Uint8Array[] = [];
  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
  const ended = new Promise((resolve) => doc.on('end', resolve));
  drawInvoice(doc, invoice);
  doc.end();
  await ended;
  return new Uint8Array(Buffer.concat(chunks));
}
