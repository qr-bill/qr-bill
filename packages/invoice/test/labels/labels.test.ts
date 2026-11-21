import type { Language } from '@qr-bill/core';
import { describe, expect, it } from 'vitest';
import { INVOICE_LABELS, fill } from '../../src/labels/labels.js';
import type { InvoiceLabels } from '../../src/labels/labels.types.js';

const LANGUAGES: readonly Language[] = ['de', 'fr', 'it', 'en', 'rm'];

/** The placeholders of a template, sorted. */
const placeholders = (template: string): string[] =>
  [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

describe('INVOICE_LABELS', () => {
  it.each(LANGUAGES)('%s has every text, none blank, with the placeholders of English', (language) => {
    const labels = INVOICE_LABELS[language];
    expect(Object.keys(labels).sort()).toEqual(Object.keys(INVOICE_LABELS.en).sort());
    for (const [key, text] of Object.entries(labels) as [keyof InvoiceLabels, string][]) {
      expect(text.trim(), key).not.toBe('');
      expect(placeholders(text), key).toEqual(placeholders(INVOICE_LABELS.en[key]));
    }
  });
});

describe('fill', () => {
  it('replaces the placeholders, numbers included', () => {
    expect(fill(INVOICE_LABELS.fr.vatOn, { rate: '8.1', base: '1 340.00' })).toBe('TVA 8.1 % sur 1 340.00');
    expect(fill(INVOICE_LABELS.de.page, { page: 1, pages: 3 })).toBe('Seite 1/3');
  });

  it('leaves a placeholder without value as it is', () => {
    expect(fill('{rate} % on {base}', { rate: '8.1' })).toBe('8.1 % on {base}');
  });
});
