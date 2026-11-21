import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../../src/themes/themes.js';
import { fullInput, invoiceInput, text } from '../fixtures.js';
import { type Text, allTexts, colorAt, find, render, textsOf, near } from '../render.js';

/** The rows of the totals, as label and amount, from top to bottom. */
function totals(texts: readonly Text[]): string[][] {
  const labels = texts.filter((line) => line.x > 109 && line.x < 111).sort((a, b) => a.y - b.y);
  return labels.map((label) => {
    const value = texts.find((line) => line !== label && Math.abs(line.y - label.y) < 0.1 && line.x > 140);
    return [label.text, value?.text ?? ''];
  });
}

describe('totals', () => {
  it('add the VAT of each rate to the subtotal', async () => {
    const { pages } = await render(fullInput());
    expect(totals(textsOf(pages[0]))).toEqual([
      ['Sous-total', '1 260.00'],
      ['TVA 8.1 % sur 1 260.00', '102.06'],
      ['Total CHF', '1 362.06'],
    ]);
    const total = find(pages[0], 'Total CHF');
    expect(total).toMatchObject({ bold: true, size: 10.5 });
    expect(find(pages[0], '1 362.06').x + find(pages[0], '1 362.06').width).toBeCloseTo(190, 1);
  });

  it('show the VAT included after the total, without a subtotal equal to it', async () => {
    const { pages } = await render(fullInput({ pricesIncludeVAT: true }));
    expect(totals(textsOf(pages[0]))).toEqual([
      ['Total CHF', '1 260.00'],
      ['Dont TVA 8.1 % sur 1 260.00', '94.41'],
    ]);
  });

  it('print the rounding to 5 centimes', async () => {
    const { pages } = await render(fullInput({ roundTo5Centimes: true }));
    expect(totals(textsOf(pages[0]))).toEqual([
      ['Sous-total', '1 260.00'],
      ['TVA 8.1 % sur 1 260.00', '102.06'],
      ['Arrondi', '-0.01'],
      ['Total CHF', '1 362.05'],
    ]);
  });

  it('leave out a rounding that changed nothing', async () => {
    const items = [{ description: 'Cotisation', amount: '80' }];
    const { pages } = await render(invoiceInput({ items, roundTo5Centimes: true }));
    expect(totals(textsOf(pages[0]))).toEqual([['Total CHF', '80.00']]);
  });

  it('print the totals given, a VAT without base included', async () => {
    const provided = { subtotal: '1000', vat: [{ rate: '8.1', amount: '81' }], total: '1081' };
    const { pages } = await render(fullInput({ totals: provided }));
    expect(totals(textsOf(pages[0]))).toEqual([
      ['Sous-total', '1 000.00'],
      ['TVA 8.1 %', '81.00'],
      ['Total CHF', '1 081.00'],
    ]);
  });

  it('print only the total without VAT nor rounding', async () => {
    const { pages } = await render(invoiceInput({ items: [{ description: 'Cotisation', amount: '80' }] }));
    expect(totals(textsOf(pages[0]))).toEqual([['Total CHF', '80.00']]);
  });

  it('shorten a label too long for the room left by the amounts', async () => {
    const items = [{ description: 'Ligne', amount: '999999999.99', vatRate: '8.1' }];
    const { pages } = await render(invoiceInput({ items, pricesIncludeVAT: true, language: 'de' }));
    const label = textsOf(pages[0]).find((line) => line.text.startsWith('Inkl. MWST'));
    const amount = find(pages[0], '74 930 619.80');
    expect(label?.text.endsWith('…')).toBe(true);
    expect((label?.x ?? 0) + (label?.width ?? 0)).toBeLessThan(amount.x);
  });

  it('write the total in the colour of the theme', async () => {
    const { pdf, pages } = await render(fullInput({ theme: 'business' }));
    // The rule lies 0.5 mm above the row of the total, whose baseline is 4.32 mm under its top.
    const rule = find(pages[0], 'Total CHF').y - 4.32 - 0.5;
    expect(await colorAt(pdf, 1, 150, rule)).toBe(resolveTheme({ name: 'business' }).totalRule);
    expect(find(pages[0], 'Total CHF').bold).toBe(true);
  });
});

describe('mentions and remarks', () => {
  it('fill the left column beside the totals, in order', async () => {
    const mentions = { notVatRegistered: true, vatExcluded: true, paymentDays: 30, thanks: true };
    const { pages } = await render(fullInput({ mentions, notes: ['Première remarque.', 'Seconde remarque.'] }));
    const lines = [
      'Non assujetti à la TVA.',
      'Prestation exclue du champ de la TVA.',
      'Payable dans les 30 jours.',
      'Merci pour votre confiance.',
      'Première remarque.',
      'Seconde remarque.',
    ].map((line) => find(pages[0], line));
    expect(lines[0]?.y).toBeCloseTo(find(pages[0], 'Sous-total').y, 1);
    lines.forEach((line, index) => {
      expect(line).toMatchObject({ x: near(20, 2), size: 8.5 });
      if (index > 0) expect(line.y).toBeCloseTo((lines[index - 1]?.y ?? 0) + 3.8 + 1.5, 1);
    });
  });

  it('wrap a long remark within the column', async () => {
    const { pages } = await render(fullInput({ notes: [text(30, 'remarque ').trim()] }));
    const lines = textsOf(pages[0]).filter((line) => line.text.startsWith('remarque'));
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.x + line.width).toBeLessThanOrEqual(20 + 84);
  });

  it('go with the totals to a new page when they do not fit together', async () => {
    const notes = Array.from({ length: 3 }, () => text(33, 'remarque ').trim());
    for (let count = 18; count <= 30; count++) {
      const items = Array.from({ length: count }, (_, index) => ({ description: `Ligne ${index + 1}`, amount: '10' }));
      const { pages } = await render(invoiceInput({ items, notes }));
      const page = pages.findIndex((candidate) => textsOf(candidate).some((line) => line.text === 'Total CHF'));
      const first = pages.findIndex((candidate) => textsOf(candidate).some((line) => line.text.startsWith('remarque')));
      expect(first).toBe(page);
    }
  });
});

describe('closing', () => {
  it('follows the totals across the page', async () => {
    const { pages } = await render(fullInput());
    const closing = find(pages[0], 'Avec nos meilleures salutations.');
    expect(closing.x).toBeCloseTo(20, 1);
    expect(closing.y).toBeGreaterThan(find(pages[0], 'Total CHF').y + 5);
  });

  it('continues on the next page line by line', async () => {
    // With 22 lines, the totals end low enough on the first page for the closing to reach the second one.
    const items = Array.from({ length: 22 }, (_, index) => ({ description: `Ligne ${index + 1}`, amount: '10' }));
    const closing = Array.from({ length: 10 }, (_, index) => `Ligne de conclusion ${index + 1}`).join('\n');
    const rendered = await render(invoiceInput({ items, closing }));
    const pageOf = (line: string): number =>
      rendered.pages.findIndex((page) => textsOf(page).some((candidate) => candidate.text === line));
    expect(pageOf('Ligne de conclusion 1')).toBe(0);
    expect(pageOf('Ligne de conclusion 10')).toBe(1);
    expect(find(rendered.pages[1], 'Ligne de conclusion 10').y).toBeLessThan(282);
    expect(allTexts(rendered).filter((line) => line.startsWith('Ligne de conclusion'))).toHaveLength(10);
  });
});
