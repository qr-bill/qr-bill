import { describe, expect, it } from 'vitest';
import { fullInput, invoiceInput, text } from '../fixtures.js';
import { find, render, textsOf, near } from '../render.js';

describe('title and details', () => {
  it('print the title, then the details in a grid of five columns', async () => {
    const { pages } = await render(fullInput());
    expect(find(pages[0], 'Facture')).toMatchObject({ x: near(20, 2), y: near(100, 2), size: 16 });
    const details = [
      ['N° de facture', '2026-042'],
      ['Date', '20.11.2026'],
      ['Échéance', '20.12.2026'],
      ['Période', 'Novembre 2026'],
      ['Votre référence', 'CMD-7781'],
    ];
    details.forEach(([label = '', value = ''], column) => {
      const x = 20 + column * 34;
      expect(find(pages[0], label)).toMatchObject({ x: near(x, 2), y: near(105, 2), size: 7.5 });
      expect(find(pages[0], value)).toMatchObject({ x: near(x, 2), y: near(109, 2), bold: true });
    });
  });

  it('take a title of their own, and leave out the details not given', async () => {
    const { pages } = await render(invoiceInput({ title: 'Note de frais' }));
    find(pages[0], 'Note de frais');
    expect(find(pages[0], 'Date').x).toBeCloseTo(20, 1);
    const labels = textsOf(pages[0]).map((line) => line.text);
    expect(labels).not.toContain('N° de facture');
    expect(labels).not.toContain('Échéance');
  });

  it('go on a second row beyond five, with a value on two lines at most', async () => {
    const extraFields = [
      { label: 'N° client', value: '4711' },
      { label: 'Projet', value: 'Refonte du site et migration des données clients' },
    ];
    const { pages } = await render(fullInput({ extraFields }));
    expect(find(pages[0], 'N° client')).toMatchObject({ x: near(20, 2), y: near(114, 2) });
    const project = textsOf(pages[0]).filter((line) => line.x > 50 && line.x < 60 && line.y > 115 && line.y < 124);
    expect(project.map((line) => line.y)).toEqual([near(118, 1), near(122, 1)]);
    for (const line of project) expect(line.x + line.width).toBeLessThanOrEqual(54 + 32);
  });

  it('shorten a long title to the width of the page', async () => {
    const { pages } = await render(invoiceInput({ title: text(35, 'W') }));
    const title = textsOf(pages[0]).find((line) => line.size === 16 && line.text.startsWith('WWW'));
    expect(title?.text.endsWith('…')).toBe(true);
    expect((title?.x ?? 0) + (title?.width ?? 0)).toBeLessThanOrEqual(190.01);
  });
});

describe('subject and introduction', () => {
  it('follow the details, the subject in bold with its label', async () => {
    const { pages } = await render(fullInput());
    const subject = find(pages[0], 'Objet : Prestations de conseil');
    expect(subject).toMatchObject({ bold: true, size: 10.5 });
    const madame = find(pages[0], 'Madame,');
    expect(madame.y).toBeGreaterThan(subject.y);
    expect(find(pages[0], 'Voici notre facture.').y).toBeCloseTo(madame.y + 4.2, 1);
  });

  it('wrap a long subject on three lines at most', async () => {
    const { pages } = await render(invoiceInput({ subject: text(140, 'W') }));
    // The total is in the same size, further down.
    const lines = textsOf(pages[0]).filter((line) => line.size === 10.5 && line.y < 130);
    expect(lines.map((line) => line.text.slice(0, 7))).toEqual(['Objet :', 'WWWWWWW', 'WWWWWWW']);
    expect(lines[2]?.text.endsWith('…')).toBe(true);
  });

  it('keep the longest introduction on the first page, above the table', async () => {
    const introduction = Array.from({ length: 10 }, () => text(99, 'W')).join('\n');
    const extraFields = Array.from({ length: 3 }, () => ({ label: text(25, 'W'), value: text(50, 'W') }));
    const { pages } = await render(invoiceInput({ introduction, extraFields, subject: text(140, 'W') }));
    const lines = textsOf(pages[0]).filter((line) => line.text.startsWith('WWW') && line.size === 9 && !line.bold);
    expect(lines).toHaveLength(20);
    for (const line of lines) expect(line.x + line.width).toBeLessThanOrEqual(190.01);
    expect(find(pages[0], 'Désignation').y).toBeGreaterThan(Math.max(...lines.map((line) => line.y)));
  });
});
