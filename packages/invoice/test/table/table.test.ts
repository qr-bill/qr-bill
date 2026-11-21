import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../../src/themes/themes.js';
import { fullInput, invoiceInput, text } from '../fixtures.js';
import { allTexts, colorAt, find, render, textsOf } from '../render.js';

/** The labels of the header of the table, in French. */
const HEADER = ['Désignation', 'Qté', 'Unité', 'Prix unit.', 'TVA', 'Montant CHF'];

describe('columns', () => {
  it('are those the lines use, the numbers aligned right on the edge of their column', async () => {
    const { pages } = await render(fullInput());
    const header = HEADER.map((label) => find(pages[0], label));
    expect(header[0]?.x).toBeCloseTo(20, 1);
    const amount = find(pages[0], 'Montant CHF');
    expect(amount.x + amount.width).toBeCloseTo(190, 1);
    // The row of "Conseil": 6 h at 150.00, 8.1 %, 900.00, each under its label.
    const row = find(pages[0], 'Conseil');
    for (const [value, label] of [
      ['6', 'Qté'],
      ['150.00', 'Prix unit.'],
      ['8.1 %', 'TVA'],
      ['900.00', 'Montant CHF'],
    ] as const) {
      const cell = textsOf(pages[0]).find((line) => line.text === value && Math.abs(line.y - row.y) < 0.1);
      const column = find(pages[0], label);
      expect(cell && cell.x + cell.width).toBeCloseTo(column.x + column.width, 1);
    }
    expect(find(pages[0], 'h').x).toBeCloseTo(find(pages[0], 'Unité').x, 1);
  });

  it('leave out what no line uses: amounts alone take a single column', async () => {
    const { pages } = await render(invoiceInput({ items: [{ description: 'Cotisation 2027', amount: '80' }] }));
    const labels = textsOf(pages[0]).map((line) => line.text);
    expect(labels).toContain('Montant CHF');
    for (const label of ['Qté', 'Unité', 'Prix unit.', 'TVA']) expect(labels).not.toContain(label);
  });

  it('are as wide as their widest number, which is never cut', async () => {
    const items = [
      { description: 'Grande ligne', quantity: '-999999999.999', unitPrice: '-999999999.9999', amount: '999999999.99' },
      { description: 'Petite ligne', amount: '-999999999.99' },
    ];
    const { pages } = await render(invoiceInput({ items, amountFormat: 'apostrophe' }));
    const values = ["-999'999'999.999", "-999'999'999.9999", "999'999'999.99", "-999'999'999.99"];
    const cells = values.map((value) => find(pages[0], value));
    // From left to right, each one ends before the next one starts.
    for (let index = 1; index < 3; index++) {
      const previous = cells[index - 1];
      expect((previous?.x ?? 0) + (previous?.width ?? 0)).toBeLessThan(cells[index]?.x ?? 0);
    }
    expect(find(pages[0], 'Grande ligne').x).toBeCloseTo(20, 1);
  });

  it('let a description wrap within its column', async () => {
    const description = text(30, 'Conseil ').trim();
    const { pages } = await render(invoiceInput({ items: [{ description, quantity: 1, unitPrice: '10' }] }));
    const lines = textsOf(pages[0]).filter((line) => line.text.startsWith('Conseil'));
    expect(lines.length).toBeGreaterThan(1);
    const quantity = find(pages[0], 'Qté');
    for (const line of lines) expect(line.x + line.width).toBeLessThan(quantity.x);
    expect(lines.map((line) => line.text).join(' ')).toBe(description);
  });
});

describe('pages', () => {
  it('repeat the header of the table on every page, and never split a row', async () => {
    const items = Array.from({ length: 80 }, (_, index) => ({
      description: `Ligne ${index + 1} ${index % 5 === 0 ? text(40, 'détail ') : ''}`.trim(),
      quantity: 1,
      unitPrice: '10',
    }));
    const rendered = await render(invoiceInput({ items }));
    expect(rendered.pages.length).toBeGreaterThan(2);
    for (const page of rendered.pages) {
      const lines = textsOf(page).filter((line) => line.text.startsWith('Ligne'));
      if (lines.length === 0) continue;
      const header = find(page, 'Désignation');
      for (const line of lines) {
        expect(line.y).toBeGreaterThan(header.y);
        expect(line.y).toBeLessThanOrEqual(282);
      }
    }
    // A row of several lines of text starts and ends on the same page: its first line is followed by the second.
    const all = allTexts(rendered);
    for (let index = 0; index < 80; index++) {
      if (index % 5 !== 0) expect(all).toContain(`Ligne ${index + 1}`);
    }
    for (const page of rendered.pages) {
      const texts = textsOf(page).map((line) => line.text);
      const starts = texts.flatMap((line, position) => (/^Ligne \d+ détail/.test(line) ? [position] : []));
      for (const position of starts) expect(texts[position + 1]?.startsWith('détail')).toBe(true);
    }
    expect(all.filter((line) => /^Ligne \d+ détail/.test(line))).toHaveLength(16);
  });
});

describe('themes', () => {
  /** The point of the overhang of the header of the table, left of its labels, in millimetres. */
  async function headerColor(theme: unknown): Promise<string> {
    const { pdf, pages } = await render(fullInput({ theme }));
    const label = find(pages[0], 'Désignation');
    return colorAt(pdf, 1, 19, label.y - 2);
  }

  it('fill the header with the accent (business), a tint of it (modern), nothing (standard)', async () => {
    expect(await headerColor('business')).toBe('#1F3A5F');
    expect(await headerColor({ name: 'business', accent: '#C2410C' })).toBe('#C2410C');
    expect(await headerColor('modern')).toBe(resolveTheme({ name: 'modern' }).tableHeaderBackground);
    expect(await headerColor('standard')).toBe('#FFFFFF');
  });

  it('stripe every other row (modern)', async () => {
    const { pdf, pages } = await render(fullInput({ theme: 'modern' }));
    const first = find(pages[0], 'Conseil');
    const second = find(pages[0], 'Paramétrage');
    expect(await colorAt(pdf, 1, 19, first.y - 2)).toBe('#FFFFFF');
    expect(await colorAt(pdf, 1, 19, second.y - 2)).toBe(resolveTheme({ name: 'modern' }).stripe);
  });
});
