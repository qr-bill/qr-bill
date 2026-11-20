import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { attachTo } from '../src/index.js';
import { A4, BILL, PT, type PDFText, near, readPDF, writePDF } from './helpers.js';

/** Height of the slip, and with the scissors drawn 1.3 mm above it. */
const SLIP = 105 * PT;
const WITH_SCISSORS = 106.3 * PT;

/** The title of the receipt, in German. */
function receiptTitle(texts: readonly PDFText[]): PDFText | undefined {
  return texts.find((text) => text.text === 'Empfangsschein');
}

/** Baseline of the title of the receipt on the slip: 5 mm from its top, plus the ascent of 11 pt Liberation Sans. */
const TITLE_BASELINE = 5 * PT + 0.905 * 11;

describe('attachTo', () => {
  it('adds the slip at the bottom of the current page when the text leaves room for it', async () => {
    const pdf = await writePDF({ size: 'A4' }, (doc) => {
      doc.text('Invoice 2026-11');
      expect(attachTo(doc, BILL, { language: 'de' })).toEqual({ newPage: false });
    });
    const pages = await readPDF(pdf);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.texts[0]?.text).toBe('Invoice 2026-11');
    // On A4, the slip spans the whole width: 595.28 points against 595.2756.
    expect(receiptTitle(pages[0]?.texts ?? [])).toMatchObject({
      x: near((A4.width - 210 * PT) / 2 + 5 * PT, 2),
      y: near(A4.height - SLIP + TITLE_BASELINE, 2),
    });
  });

  it('adds a page of the same size and margins when the text reaches into the slip or the scissors above it', async () => {
    const margins = { top: 50, bottom: 40, left: 30, right: 20 };
    const pdf = await writePDF({ size: 'LETTER', margins }, (doc) => {
      doc.text('Invoice 2026-11');
      doc.y = 792 - WITH_SCISSORS + 0.01;
      expect(attachTo(doc, BILL, { language: 'de' })).toEqual({ newPage: true });
      expect(doc.page.margins).toEqual(margins);
    });
    const pages = await readPDF(pdf);

    expect(pages.map(({ width, height }) => [width, height])).toEqual([
      [612, 792],
      [612, 792],
    ]);
    expect(receiptTitle(pages[0]?.texts ?? [])).toBeUndefined();
    // Centred on a Letter page, which is wider than the slip.
    expect(receiptTitle(pages[1]?.texts ?? [])).toMatchObject({
      x: near((612 - 210 * PT) / 2 + 5 * PT, 2),
      y: near(792 - SLIP + TITLE_BASELINE, 2),
    });
  });

  it('keeps the slip on the page when the text ends exactly where the slip, or its scissors, begin', async () => {
    const pdf = await writePDF({ size: 'A4' }, (doc) => {
      doc.y = A4.height - WITH_SCISSORS;
      expect(attachTo(doc, BILL, { language: 'de' })).toEqual({ newPage: false });
      doc.addPage();
      doc.y = A4.height - SLIP;
      expect(attachTo(doc, BILL, { language: 'de', separators: 'none' })).toEqual({ newPage: false });
    });
    expect(await readPDF(pdf)).toHaveLength(2);
  });

  it('moves the text cursor to the bottom of the page, so that text written afterwards goes to a new page', async () => {
    const pdf = await writePDF({ size: 'A4' }, (doc) => {
      attachTo(doc, BILL, { language: 'de' });
      expect([doc.x, doc.y]).toEqual([72, A4.height]);
      doc.text('Terms and conditions');
    });
    const pages = await readPDF(pdf);

    expect(pages).toHaveLength(2);
    expect(pages[1]?.texts.map((text) => text.text)).toEqual(['Terms and conditions']);
  });

  it('adds one bill per page and embeds the fonts once', async () => {
    const pdf = await writePDF({ size: 'A4' }, (doc) => {
      expect(attachTo(doc, BILL, { language: 'de' })).toEqual({ newPage: false });
      expect(attachTo(doc, BILL, { language: 'fr' })).toEqual({ newPage: true });
    });
    const pages = await readPDF(pdf);

    expect(pages.map((page) => page.texts[0]?.text)).toEqual(['Empfangsschein', 'Récépissé']);
    expect(
      Buffer.from(pdf)
        .toString('latin1')
        .match(/\/FontFile2 /g),
    ).toHaveLength(2);
  });

  it('uses the fonts given', async () => {
    const regular = readFileSync(new URL('../fonts/LiberationSans-Regular.ttf', import.meta.url));
    const bold = readFileSync(new URL('../fonts/LiberationSans-Bold.ttf', import.meta.url));
    const pdf = await writePDF({ size: 'A4' }, (doc) => {
      // Swapped, to see that they are used.
      attachTo(doc, BILL, { language: 'de', fonts: { regular: bold, bold: regular } });
    });
    const [page] = await readPDF(pdf);

    expect(receiptTitle(page?.texts ?? [])?.font).toMatch(/^[A-Z]{6}\+LiberationSans$/);
  });

  it('throws a RangeError when the page is narrower than the slip or too low', async () => {
    await writePDF({ size: 'A5' }, (doc) => {
      expect(() => attachTo(doc, BILL, { language: 'de' })).toThrow(
        new RangeError('The payment slip needs a page of at least 210 × 106.3 mm'),
      );
    });
    await writePDF({ size: [600, 300], margin: 0 }, (doc) => {
      expect(() => attachTo(doc, BILL, { language: 'de' })).toThrow(
        new RangeError('The payment slip needs a page of at least 210 × 106.3 mm'),
      );
      // Without the scissors above it, the slip fits: 300 points are 105.8 mm.
      expect(attachTo(doc, BILL, { language: 'de', separators: 'none' })).toEqual({ newPage: false });
    });
  });
});
