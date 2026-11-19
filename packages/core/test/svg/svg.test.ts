import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';
import { createQRBill, layoutQRBill, renderSVG } from '../../src/index.js';
import { mm } from '../../src/layout/shapes.js';
import { MM_PER_PT, ascent } from '../../src/layout/text.js';
import { SIX_BILLS } from '../layout/helpers.js';
import { decodeImage } from '../qr-code/decoder.js';

const bill = SIX_BILLS[1]?.bill ?? createQRBill({ currency: 'CHF', creditor: {} as never });

describe('renderSVG', () => {
  it('renders the slip at its real size in millimetres, on a white background', () => {
    const svg = renderSVG(layoutQRBill(bill, { language: 'de', separators: 'none' }));
    expect(
      svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="105mm" viewBox="0 0 210 105"'),
    ).toBe(true);
    expect(svg).toContain('font-family="Liberation Sans, Arial, Helvetica, sans-serif"');
    expect(svg).toContain('<rect x="0" y="0" width="210" height="105" fill="#fff"/>');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('extends the drawing above the slip for the cutting lines', () => {
    const svg = renderSVG(layoutQRBill(bill, { language: 'de' }));
    expect(svg).toMatch(/height="106\.3mm" viewBox="0 -1\.3 210 106\.3"/);
    expect(svg).toContain('stroke-dasharray="1 1"');
  });

  it('writes texts with their size in millimetres and their weight, and escapes XML', () => {
    const svg = renderSVG(layoutQRBill(bill, { language: 'de' }));
    const size = mm(11 * MM_PER_PT);
    expect(svg).toContain(
      `<text x="67" y="${mm(5 + ascent(11))}" font-size="${size}" font-weight="bold">Zahlteil</text>`,
    );
    expect(svg).toContain('>Max Muster &#38; Söhne</text>');
    expect(svg).toMatch(/<text x="[\d.]+" y="[\d.]+" font-size="3\.5278">CHF<\/text>/);
  });

  it('fills the QR code in black, the cross in white, and strokes the marks', () => {
    const svg = renderSVG(layoutQRBill(createQRBill({ ...SIX_INPUT_WITHOUT_AMOUNT }), { language: 'fr' }));
    expect(svg).toMatch(/<path d="M67 17H[^"]+" fill="#000"\/>/);
    expect(svg).toContain('<path d="M86.5 36.5H93.5V43.5H86.5Z" fill="#fff"/>');
    expect(svg).toMatch(/<path d="M76 77V74H79[^"]*" fill="none" stroke="#000" stroke-width="0\.2646"\/>/);
  });
});

const SIX_INPUT_WITHOUT_AMOUNT = {
  currency: 'CHF' as const,
  creditor: {
    account: 'CH5800791123000889012',
    name: 'Max Muster & Söhne',
    postalCode: '8000',
    town: 'Seldwyla',
    country: 'CH',
  },
};

describe('end to end: the QR code of the rendered slip is readable', () => {
  it.each(SIX_BILLS)('$id: rasterised SVG read back by ZXing', async ({ bill }) => {
    const svg = renderSVG(layoutQRBill(bill, { language: 'fr' }));
    // About 11 pixels per millimetre: 3 times 96 dpi.
    const image = new Resvg(svg, { fitTo: { mode: 'zoom', value: 3 }, font: { loadSystemFonts: false } }).render();
    const decoded = await decodeImage({
      data: new Uint8ClampedArray(image.pixels),
      width: image.width,
      height: image.height,
    });
    expect(decoded.map((result) => result.text)).toEqual([bill.payload]);
  });
});
