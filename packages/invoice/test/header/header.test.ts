import { describe, expect, it } from 'vitest';
import { InvoiceValidationError } from '../../src/index.js';
import { ISSUER, PNG, RECIPIENT, UID, fullInput, invoiceInput, text } from '../fixtures.js';
import { type Text, colorAt, find, logo, render, textsOf, near } from '../render.js';

/** The texts of the first page within a band of baselines, in millimetres. */
async function textsBetween(input: unknown, top: number, bottom: number): Promise<Text[]> {
  const { pages } = await render(input);
  return textsOf(pages[0]).filter((line) => line.y >= top && line.y <= bottom);
}

describe('letterhead', () => {
  it('prints the name of the issuer in large type without a logo', async () => {
    const { pages } = await render(invoiceInput());
    expect(find(pages[0], 'Max Muster & Söhne')).toMatchObject({ x: near(20, 2), size: 16, bold: true });
  });

  it('takes a smaller size for a long name, on two lines', async () => {
    const name = 'Stiftung für Musik und Theater der Gemeinde Seldwyla und Umgebung';
    const lines = (await textsBetween(invoiceInput({ issuer: { ...ISSUER, name } }), 15, 33)).filter(
      (line) => line.x < 100,
    );
    expect(lines.map((line) => line.size)).toEqual([14, 14]);
    expect(lines.map((line) => line.text).join(' ')).toBe(name);
  });

  it('shortens a name that does not fit two lines even in the smallest size', async () => {
    const lines = (await textsBetween(invoiceInput({ issuer: { ...ISSUER, name: text(70, 'W') } }), 15, 33)).filter(
      (line) => line.x < 100,
    );
    expect(lines.map((line) => line.size)).toEqual([12, 12]);
    expect(lines[1]?.text.endsWith('…')).toBe(true);
    for (const line of lines) expect(line.x + line.width).toBeLessThanOrEqual(20 + 95);
  });

  it.each(['png', 'jpeg'] as const)('draws a %s logo in its box, and the name with the details', async (format) => {
    const input = invoiceInput({ issuer: { ...ISSUER, logo: logo(format) } });
    const { pdf, pages } = await render(input);
    // 300 × 100 pixels fitted in 50 × 18 mm: 50 × 16.7 mm from the top left corner.
    expect(await colorAt(pdf, 1, 45, 25)).toMatch(/^#(1F3A5F|1F3A60|1E3A5F|1F395F)$/);
    expect(await colorAt(pdf, 1, 45, 32.5)).toBe('#FFFFFF');
    expect(find(pages[0], 'Max Muster & Söhne')).toMatchObject({ size: 9, bold: true });
  });

  it('reports a logo PDFKit cannot read as unsupported', async () => {
    const error: unknown = await render(invoiceInput({ issuer: { ...ISSUER, logo: PNG } })).catch(
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(InvoiceValidationError);
    expect((error as InvoiceValidationError).issues).toMatchObject([
      { code: 'unsupported_logo', path: ['issuer', 'logo'] },
    ]);
  });
});

describe('details of the issuer', () => {
  it('fill the right column, aligned right, with the window on the left', async () => {
    const { pages } = await render(fullInput());
    const lines = [
      'Service des membres',
      'Musterstrasse 123',
      '8000 Seldwyla',
      '+41 44 123 45 67',
      'info@muster-soehne.example',
      'www.muster-soehne.example',
      `${UID} TVA`,
    ].map((line) => find(pages[0], line));
    lines.forEach((line, index) => {
      expect(line.x + line.width).toBeCloseTo(190, 1);
      expect(line.y).toBeCloseTo(18 + index * 3.8, 1);
      expect(line.size).toBe(8.5);
    });
  });

  it('go under the letterhead, aligned left, with the window on the right', async () => {
    const { pages } = await render(fullInput({ addressWindow: 'right' }));
    expect(find(pages[0], 'Service des membres')).toMatchObject({ x: near(20, 2), y: near(40, 2) });
  });

  it('print the UID without suffix when the issuer is not registered for VAT', async () => {
    const { pages } = await render(fullInput({ issuer: { ...ISSUER, uid: UID } }));
    find(pages[0], UID);
  });

  it('shorten a line too long for the column', async () => {
    const { pages } = await render(fullInput({ issuer: { ...ISSUER, extraLines: [text(70, 'W')] } }));
    const line = textsOf(pages[0]).find((candidate) => candidate.text.startsWith('WWW'));
    expect(line?.text.endsWith('…')).toBe(true);
    expect(line?.x).toBeGreaterThanOrEqual(190 - 72 - 0.01);
  });
});

describe('address window', () => {
  it('holds the sender on one line, then the address, on the left by default', async () => {
    const { pages } = await render(fullInput());
    const sender = find(pages[0], 'Max Muster & Söhne, Musterstrasse 123, 8000 Seldwyla');
    expect(sender).toMatchObject({ x: near(25, 2), y: near(49.5, 2), size: 7 });
    const lines = [
      'Madame',
      'Pia-Maria Rutschmann-Schnyder',
      'c/o Muster AG',
      'Grosse Marktgasse 28',
      '9400 Rorschach',
    ];
    lines.forEach((line, index) => {
      const found = find(pages[0], line);
      expect(found).toMatchObject({ x: near(25, 2), size: 10, bold: index === 1 });
      expect(found.y).toBeCloseTo(58 + index * 4.4, 1);
    });
  });

  it('ends at the right edge of the content on the right', async () => {
    const name = 'Pia-Maria Rutschmann-Schnyder und Hans-Ulrich Rutschmann-Schnyder';
    const { pages } = await render(fullInput({ addressWindow: 'right', recipient: { ...RECIPIENT, name } }));
    const window = textsOf(pages[0]).filter((line) => line.x > 110 && line.y > 45 && line.y < 95);
    expect(window[0]?.x).toBeCloseTo(118, 1);
    for (const line of window) expect(line.x + line.width).toBeLessThanOrEqual(190.01);
    expect(
      window
        .filter((line) => line.bold)
        .map((line) => line.text)
        .join(' '),
    ).toBe(name);
  });

  it('prints the country of both parties when they are in different countries, in the language of the invoice', async () => {
    const recipient = { ...RECIPIENT, postalCode: '10115', town: 'Berlin', country: 'DE' };
    const { pages } = await render(fullInput({ recipient }));
    // The name, the street, the town, the country.
    expect(find(pages[0], 'Allemagne').y).toBeCloseTo(58 + 3 * 4.4, 1);
    expect(find(pages[0], 'Suisse').x + find(pages[0], 'Suisse').width).toBeCloseTo(190, 1);
    find(pages[0], 'Max Muster & Söhne, Musterstrasse 123, 8000 Seldwyla, Suisse');
  });

  it('closes up the lines of an incomplete address', async () => {
    const recipient = { name: 'Simon Muster', postalCode: '9400', town: 'Rorschach', country: 'CH' };
    const { pages } = await render(invoiceInput({ recipient }));
    expect(find(pages[0], 'Simon Muster').y).toBeCloseTo(58, 1);
    expect(find(pages[0], '9400 Rorschach').y).toBeCloseTo(58 + 4.4, 1);
  });
});

describe('header of the following pages', () => {
  it('names the issuer and the invoice', async () => {
    const items = Array.from({ length: 60 }, (_, index) => ({ description: `Ligne ${index + 1}`, amount: '10' }));
    const { pages } = await render(fullInput({ items, title: 'Note de frais' }));
    expect(find(pages[1], 'Max Muster & Söhne')).toMatchObject({ x: near(20, 2), y: near(18, 2) });
    const title = find(pages[1], 'Note de frais 2026-042');
    expect(title.x + title.width).toBeCloseTo(190, 1);
  });

  it('names the invoice by its title alone without a number', async () => {
    const items = Array.from({ length: 60 }, (_, index) => ({ description: `Ligne ${index + 1}`, amount: '10' }));
    const { pages } = await render(fullInput({ items, number: undefined }));
    find(pages[1], 'Facture');
  });
});
