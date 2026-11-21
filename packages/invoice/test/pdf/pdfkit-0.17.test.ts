// The invoice with the oldest version of PDFKit its peer dependency accepts, 0.17.0: the same texts at the same
// places as with the latest one.
import { describe, expect, it, vi } from 'vitest';
import type { createInvoicePDF as CreateInvoicePDF } from '../../src/index.js';
import { fullInput } from '../fixtures.js';
import { readPDF } from '../render.js';

/** createInvoicePDF loaded afresh, with the latest PDFKit or with 0.17.0. */
async function load(oldest: boolean): Promise<typeof CreateInvoicePDF> {
  vi.resetModules();
  if (oldest) vi.doMock('pdfkit', async () => import('pdfkit-0.17'));
  else vi.doUnmock('pdfkit');
  return (await import('../../src/pdf/pdf.js')).createInvoicePDF;
}

describe('createInvoicePDF with PDFKit 0.17', () => {
  it('draws the same texts at the same places, over several pages, payment slip included', async () => {
    const items = Array.from({ length: 40 }, (_, index) => ({ description: `Ligne ${index + 1}`, amount: '10' }));
    const input = fullInput({ items, theme: 'modern' }) as never;
    const latest = await readPDF(await (await load(false))(input));
    const oldest = await readPDF(await (await load(true))(input));
    // The module the invoice imported was indeed the old one.
    const [mocked, old] = await Promise.all([import('pdfkit'), import('pdfkit-0.17')]);
    expect(mocked.default).toBe(old.default);
    expect(oldest.length).toBe(2);
    const texts = (pages: typeof latest): string[][] =>
      pages.map((page) => page.texts.map((text) => `${text.text} ${text.x.toFixed(2)} ${text.y.toFixed(2)}`));
    expect(texts(oldest)).toEqual(texts(latest));
  });
});
