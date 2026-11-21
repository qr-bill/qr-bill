import { type QRBill, layoutQRBill } from '@qr-bill/core';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { decodeImage } from '../../../core/test/qr-code/decoder.js';
import { InvoiceValidationError, createInvoicePDF, validateInvoice } from '../../src/index.js';
import { QR_IBAN, QR_REFERENCE, fullInput, invoiceInput, text } from '../fixtures.js';
import { allTexts, find, rasterize, render, textsOf } from '../render.js';

/** The payment part is drawn when its title is printed. */
const PAYMENT_PART = 'Section paiement';

/** The QR-bill an invoice gets from the validation. */
function billOf(input: unknown): QRBill | undefined {
  const result = validateInvoice(input);
  if (!result.success) throw new Error('invalid');
  return result.data.bill;
}

describe('createInvoicePDF', () => {
  it('rejects invalid data with every problem found', async () => {
    const error: unknown = await createInvoicePDF(invoiceInput({ date: '2026-02-30', items: [] }) as never).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(InvoiceValidationError);
    expect((error as InvoiceValidationError).issues.map((issue) => issue.path.join('.'))).toEqual(['date', 'items']);
  });

  it('writes an invoice of one page with its payment slip, whose QR code ZXing reads back', async () => {
    const input = fullInput();
    const { pdf, pages } = await render(input);
    expect(pages).toHaveLength(1);
    expect(allTexts({ pdf, pages })).toContain(PAYMENT_PART);
    const decoded = await decodeImage(await rasterize(pdf, 2100));
    expect(decoded.map((result) => result.text)).toEqual([billOf(input)?.payload]);
  });

  it('stays light: a page with its payment slip weighs less than 60 KB', async () => {
    const { pdf } = await render(fullInput());
    expect(pdf.byteLength).toBeLessThan(60_000);
  });

  it('records the title, the author and the language of the document', async () => {
    const { pdf } = await render(fullInput());
    const task = getDocument({ data: pdf.slice(), verbosity: 0 });
    const document = await task.promise;
    const { info } = (await document.getMetadata()) as { info: Record<string, unknown> };
    await task.destroy();
    expect(info).toMatchObject({ Title: 'Facture 2026-042', Author: 'Max Muster & Söhne', Language: 'fr' });
  });

  it('has no payment slip without payment', async () => {
    const rendered = await render(fullInput({ payment: undefined }));
    expect(allTexts(rendered)).not.toContain(PAYMENT_PART);
  });

  it('has no payment slip for a credit note, whose total is negative', async () => {
    const rendered = await render(fullInput({ items: [{ description: 'Avoir', amount: '-100' }] }));
    expect(allTexts(rendered)).not.toContain(PAYMENT_PART);
    expect(allTexts(rendered)).toContain('-100.00');
  });

  it('makes a notification of a total of zero: "NE PAS UTILISER POUR LE PAIEMENT" (chapter 4.4)', async () => {
    const rendered = await render(fullInput({ items: [{ description: 'Cotisation offerte', amount: '0' }] }));
    expect(allTexts(rendered)).toContain(PAYMENT_PART);
    expect(allTexts(rendered)).toContain('NE PAS UTILISER POUR LE PAIEMENT');
  });

  it('puts the payment slip on a page of its own when the last page has no room left', async () => {
    const input = fullInput({ closing: Array.from({ length: 10 }, () => text(45, 'x ')).join('\n') });
    const { pdf, pages } = await render(input);
    expect(pages).toHaveLength(2);
    expect(textsOf(pages[0]).map((line) => line.text)).not.toContain(PAYMENT_PART);
    // Nothing on the second page but the header of the following pages, then the slip, in the bottom 105 mm.
    const bill = billOf(input);
    const top = 297 - 105 + (bill === undefined ? 0 : layoutQRBill(bill, { language: 'fr' }).bounds.y);
    const body = textsOf(pages[1]).filter((line) => line.y < top);
    expect(body.map((line) => line.text)).toEqual(['Max Muster & Söhne', 'Facture 2026-042', 'Page 2/2']);
    const decoded = await decodeImage(await rasterize(pdf, 2100, 2));
    expect(decoded).toHaveLength(1);
  });

  it('numbers the pages only when there are several', async () => {
    const one = await render(fullInput());
    expect(allTexts(one).some((line) => line.startsWith('Page '))).toBe(false);
    const items = Array.from({ length: 60 }, (_, index) => ({ description: `Ligne ${index + 1}`, amount: '10' }));
    const { pages } = await render(fullInput({ items }));
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((page, index) => {
      const number = find(page, `Page ${index + 1}/${pages.length}`);
      expect(number.y).toBeCloseTo(10, 1);
      expect(number.x + number.width).toBeCloseTo(190, 1);
    });
  });

  it('accepts a regular IBAN with a Creditor Reference, and EUR', async () => {
    const rendered = await render(
      fullInput({ currency: 'EUR', payment: { account: 'CH58 0079 1123 0008 8901 2', reference: 'RF18539007547034' } }),
    );
    expect(allTexts(rendered)).toContain('Montant EUR');
    expect(allTexts(rendered)).toContain('Total EUR');
  });

  it('writes the same QR code whatever the theme', async () => {
    const input = (theme: string): Record<string, unknown> =>
      invoiceInput({ theme, payment: { account: QR_IBAN, reference: QR_REFERENCE } });
    const images = await Promise.all(
      ['standard', 'business', 'modern'].map(async (theme) => rasterize((await render(input(theme))).pdf, 1050)),
    );
    // The bottom 105 mm of the page: the payment slip.
    const slips = images.map((image) => image.data.slice(Math.round((192 / 297) * image.height) * image.width * 4));
    const [standard = new Uint8ClampedArray(), ...others] = slips;
    expect(standard.length).toBeGreaterThan(0);
    for (const other of others) {
      expect(other.reduce((count, value, index) => count + (value === standard[index] ? 0 : 1), 0)).toBe(0);
    }
  });
});
