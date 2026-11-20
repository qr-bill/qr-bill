import { Resvg } from '@resvg/resvg-js';
import {
  type Language,
  type QRBillLayout,
  type TextElement,
  createQRBill,
  layoutQRBill,
  renderSVG,
} from '@qr-bill/core';
import { describe, expect, it } from 'vitest';
import { textWidth } from '../../core/src/layout/text.js';
import { decodeImage } from '../../core/test/qr-code/decoder.js';
import { POINTS_PER_MM, drawPaymentSlip } from '../src/index.js';
import { A4, BILL, OLDEST_PDFKIT, PT, type Pixels, SIX_BILLS, near, rasterize, readPDF, writePDF } from './helpers.js';

const LANGUAGES: readonly Language[] = ['de', 'fr', 'it', 'rm', 'en'];

/** The texts of a layout. */
function texts(layout: QRBillLayout): TextElement[] {
  return layout.elements.filter((element): element is TextElement => element.type === 'text');
}

/** The same layout without its texts. */
function pathsOnly(layout: QRBillLayout): QRBillLayout {
  return { ...layout, elements: layout.elements.filter((element) => element.type === 'path') };
}

/** Share of the pixels of two images of the same size that differ clearly once laid on white. */
function difference(a: Pixels, b: Pixels): number {
  let different = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    const alphaA = (a.data[index + 3] ?? 0) / 255;
    const alphaB = (b.data[index + 3] ?? 0) / 255;
    for (let channel = index; channel < index + 3; channel++) {
      const onWhiteA = 255 - alphaA * (255 - (a.data[channel] ?? 0));
      const onWhiteB = 255 - alphaB * (255 - (b.data[channel] ?? 0));
      if (Math.abs(onWhiteA - onWhiteB) > 128) {
        different++;
        break;
      }
    }
  }
  return different / (a.width * a.height);
}

describe('POINTS_PER_MM', () => {
  it('converts millimetres to points', () => {
    expect(210 * POINTS_PER_MM).toBeCloseTo(595.2756, 4);
    expect(PT).toBe(POINTS_PER_MM);
  });
});

describe('drawPaymentSlip: texts', () => {
  const cases = SIX_BILLS.flatMap(({ id, bill }) => LANGUAGES.map((language) => ({ id, language, bill })));

  it.each(cases)(
    '$id in $language: every text at its baseline, in Liberation Sans, at its size and measured width',
    async ({ bill, language }) => {
      const layout = layoutQRBill(bill, { language });
      const top = A4.height - layout.height * PT;
      const pdf = await writePDF({ size: 'A4', margin: 0 }, (doc) => {
        drawPaymentSlip(doc, layout, { x: 0, y: top });
      });
      const [page] = await readPDF(pdf);

      expect(page?.texts.map(({ font, ...text }) => ({ ...text, font: font.replace(/^[A-Z]{6}\+/, '') }))).toEqual(
        texts(layout).map((element) => ({
          text: element.text,
          font: element.fontWeight === 'bold' ? 'LiberationSans-Bold' : 'LiberationSans',
          size: near(element.fontSize, 3),
          x: near(element.x * PT, 2),
          y: near(top + element.y * PT, 2),
          // The widths of the PDF are rounded to a thousandth of the font size, glyph by glyph.
          width: near(textWidth(element.text, element.fontSize, element.fontWeight) * PT, 1),
        })),
      );
    },
  );
});

describe('drawPaymentSlip: extended character set', () => {
  it('writes the characters that the standard PDF fonts lack, and they can be copied from the PDF', async () => {
    // Chapter 4.1.1: since v2.3, Latin Extended-A and a few letters of Latin Extended-B (Ș, Ț) are allowed.
    const name = 'Łódź Ősz Șțefan Čapek Ŵ';
    const bill = createQRBill({
      currency: 'CHF',
      creditor: { account: 'CH5800791123000889012', name, postalCode: '8000', town: 'Seldwyla', country: 'CH' },
    });
    const pdf = await writePDF({ size: 'A4', margin: 0 }, (doc) => {
      drawPaymentSlip(doc, layoutQRBill(bill, { language: 'de' }), { x: 0, y: 0 });
    });
    const [page] = await readPDF(pdf);

    expect(page?.texts.filter((text) => text.text === name)).toHaveLength(2);
  });
});

describe('drawPaymentSlip: paths', () => {
  it.each(
    SIX_BILLS.flatMap(({ id, bill }) =>
      (['scissors', 'none'] as const).map((separators) => ({ id, bill, separators })),
    ),
  )('$id with separators $separators: the same drawing as the reference SVG renderer', async ({ bill, separators }) => {
    const layout = pathsOnly(layoutQRBill(bill, { language: 'de', separators }));
    const above = -layout.bounds.y;
    const pdf = await writePDF({ size: [layout.width * PT, (layout.height + above) * PT], margin: 0 }, (doc) => {
      drawPaymentSlip(doc, layout, { x: 0, y: above * PT });
    });
    const width = 2100;
    const fromPDF = await rasterize(pdf, width);
    const svg = new Resvg(renderSVG(layout), { fitTo: { mode: 'width', value: width } }).render();
    const fromSVG = { data: new Uint8ClampedArray(svg.pixels), width: svg.width, height: svg.height };

    expect([fromPDF.width, fromPDF.height]).toEqual([fromSVG.width, fromSVG.height]);
    // Identical on the platforms tested; a missing dash pattern or a wrong line width makes it about 0.0015.
    expect(difference(fromPDF, fromSVG)).toBeLessThan(0.0002);
  });
});

describe('drawPaymentSlip: end to end', () => {
  it.each(SIX_BILLS)('$id: the QR code of the rasterised PDF is read back by ZXing', async ({ bill }) => {
    const pdf = await writePDF({ size: [210 * PT, 105 * PT], margin: 0 }, (doc) => {
      drawPaymentSlip(doc, layoutQRBill(bill, { language: 'fr', separators: 'none' }), { x: 0, y: 0 });
    });
    const decoded = await decodeImage(await rasterize(pdf, 2100));
    expect(decoded.map((result) => result.text)).toEqual([bill.payload]);
  });
});

describe('drawPaymentSlip: the state of the document', () => {
  // Example 3 has neither amount nor debtor: its corner marks are solid lines, beside the dashed cutting lines.
  const layout = layoutQRBill(SIX_BILLS[2]?.bill ?? BILL, { language: 'de' });
  const top = A4.height - layout.height * PT;

  /** The rows of an image from a height in points down. */
  const below = (image: Pixels, y: number): Pixels => {
    const row = Math.floor((y / A4.height) * image.height);
    return { data: image.data.slice(row * image.width * 4), width: image.width, height: image.height - row };
  };

  /** The red, green and blue of a pixel. */
  const pixel = (image: Pixels, x: number, y: number): number[] => [
    ...image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 3),
  ];

  it('is not affected by the colors, opacity, line style and cursor the document has set, and restores them', async () => {
    const clean = await writePDF({ size: 'A4', margin: 0 }, (doc) => {
      drawPaymentSlip(doc, layout, { x: 0, y: top });
    });
    const dirty = await writePDF({ size: 'A4', margin: 0 }, (doc) => {
      doc.fillColor('red').strokeColor('red').fillOpacity(0.2).strokeOpacity(0.2);
      doc.lineWidth(5).dash(1, { space: 1 }).lineCap('round').lineJoin('round');
      doc.x = 100;
      doc.y = 200;
      drawPaymentSlip(doc, layout, { x: 0, y: top });
      expect([doc.x, doc.y]).toEqual([100, 200]);
      doc.moveTo(50, 100).lineTo(500, 100).stroke();
    });
    const [cleanPixels, dirtyPixels] = await Promise.all([rasterize(clean, 2000), rasterize(dirty, 2000)]);

    expect(difference(below(dirtyPixels, top), below(cleanPixels, top))).toBe(0);
    // The line drawn afterwards has the colors of the document again: faint red.
    const row = Math.round((100 / A4.height) * dirtyPixels.height);
    const line = Array.from({ length: 1400 }, (_, index) => pixel(dirtyPixels, 200 + index, row));
    expect(line.every(([red, green, blue]) => red === 255 && green === blue && green !== 255)).toBe(true);
  });
});

describe('drawPaymentSlip: fonts', () => {
  it('embeds the fonts given instead of the default ones', async () => {
    const layout = layoutQRBill(BILL, { language: 'de' });
    const { readFileSync } = await import('node:fs');
    const regular = readFileSync(new URL('../fonts/LiberationSans-Regular.ttf', import.meta.url));
    const bold = readFileSync(new URL('../fonts/LiberationSans-Bold.ttf', import.meta.url));
    const pdf = await writePDF({ size: 'A4', margin: 0 }, (doc) => {
      // Swapped, to see that they are used.
      drawPaymentSlip(doc, layout, { x: 0, y: 0, fonts: { regular: bold, bold: regular } });
    });
    const [page] = await readPDF(pdf);
    const fonts = new Map(page?.texts.map((text) => [text.text, text.font.replace(/^[A-Z]{6}\+/, '')]));
    expect(fonts.get('Empfangsschein')).toBe('LiberationSans');
    expect(fonts.get('Max Muster & Söhne')).toBe('LiberationSans-Bold');
  });
});

describe('drawPaymentSlip: versions of PDFKit', () => {
  it('draws the same slip with the oldest version supported, 0.17.0', async () => {
    // Example 3 has corner marks: every kind of element is drawn.
    const layout = layoutQRBill(SIX_BILLS[2]?.bill ?? BILL, { language: 'fr' });
    const options = { size: [210 * PT, 105 * PT], margin: 0 };
    const write = (doc: PDFKit.PDFDocument): void => {
      drawPaymentSlip(doc, layout, { x: 0, y: 0 });
    };
    const [latest, oldest] = await Promise.all([writePDF(options, write), writePDF(options, write, OLDEST_PDFKIT)]);

    expect((await readPDF(oldest))[0]?.texts).toEqual((await readPDF(latest))[0]?.texts);
    expect(difference(await rasterize(oldest, 2100), await rasterize(latest, 2100))).toBe(0);
  });
});
