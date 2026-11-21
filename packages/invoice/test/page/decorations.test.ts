import { describe, expect, it } from 'vitest';
import { resolveTheme } from '../../src/themes/themes.js';
import { fullInput } from '../fixtures.js';
import { colorAt, render } from '../render.js';

describe('page decorations', () => {
  const items = Array.from({ length: 60 }, (_, index) => ({ description: `Ligne ${index + 1}`, amount: '10' }));

  it('run a bar of the accent along the top of every page (modern)', async () => {
    const { pdf, pages } = await render(fullInput({ items, theme: { name: 'modern', accent: '#0A7D3B' } }));
    expect(pages.length).toBeGreaterThan(1);
    const bar = resolveTheme({ name: 'modern', accent: '#0A7D3B' }).topBar;
    for (let page = 1; page <= pages.length; page++) {
      expect(await colorAt(pdf, page, 105, 1.5)).toBe(bar);
      expect(await colorAt(pdf, page, 105, 3.5)).toBe('#FFFFFF');
    }
  });

  it('leave the top of the page white in the other themes', async () => {
    for (const theme of ['standard', 'business']) {
      const { pdf } = await render(fullInput({ theme }));
      expect(await colorAt(pdf, 1, 105, 1.5)).toBe('#FFFFFF');
    }
  });
});
