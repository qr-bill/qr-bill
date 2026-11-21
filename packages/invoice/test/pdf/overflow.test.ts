// Nothing overflows: an invoice whose every field is at its maximum length, written with the widest characters, is
// drawn in the five languages, with the window on either side and in the three themes. Read back by pdfjs, every
// text stays within the content of its page, above the bottom margin and above the payment slip, and no two texts
// overlap.
import { type Language, layoutQRBill } from '@qr-bill/core';
import { describe, expect, it } from 'vitest';
import { INVOICE_LIMITS, type ThemeName, validateInvoice } from '../../src/index.js';
import { QR_IBAN, QR_REFERENCE, UID } from '../fixtures.js';
import { PT, type Text, logo, render, textsOf } from '../render.js';

const LANGUAGES: readonly Language[] = ['de', 'fr', 'it', 'en', 'rm'];
const WINDOWS = ['left', 'right'] as const;
const THEMES: readonly ThemeName[] = ['standard', 'business', 'modern'];

/**
 * A text of a given length made of the widest characters of Liberation Sans ("W", "@" is wider still but not allowed
 * everywhere), with a space every few characters or none, the worst case for wrapping.
 */
function wide(length: number, spaced: boolean): string {
  const word = 'WWWWWWW ';
  return spaced ? word.repeat(Math.ceil(length / word.length)).slice(0, length - 1) + 'W' : 'W'.repeat(length);
}

/** A paragraph of the maximum length and number of lines. */
function paragraph(length: number, lines: number, spaced: boolean): string {
  const line = Math.floor((length - (lines - 1)) / lines);
  return Array.from({ length: lines }, () => wide(line, spaced)).join('\n');
}

/** An invoice at every limit. Its lines cancel out, so that the total of zero makes a notification. */
function maximal(
  language: Language,
  addressWindow: string,
  theme: ThemeName,
  spaced: boolean,
): Record<string, unknown> {
  const L = INVOICE_LIMITS;
  const text = (length: number): string => wide(length, spaced);
  const items = Array.from({ length: 8 }, (_, index) => ({
    description: paragraph(L.description, L.descriptionLines, spaced),
    quantity: '-999999999.999',
    unit: text(L.unit),
    unitPrice: '-999999999.9999',
    vatRate: '100',
    amount: index % 2 === 0 ? '999999999.99' : '-999999999.99',
  }));
  return {
    language,
    addressWindow,
    theme,
    title: text(L.title),
    number: text(L.number),
    date: '2026-11-20',
    dueDate: '2026-12-20',
    servicePeriod: text(L.servicePeriod),
    customerReference: text(L.customerReference),
    extraFields: Array.from({ length: L.extraFields }, () => ({
      label: text(L.extraFieldLabel),
      value: text(L.extraFieldValue),
    })),
    subject: text(L.subject),
    introduction: paragraph(L.introduction, L.introductionLines, spaced),
    closing: paragraph(L.closing, L.closingLines, spaced),
    issuer: {
      name: text(L.issuer.name),
      street: text(L.issuer.street),
      buildingNumber: text(L.issuer.buildingNumber),
      postalCode: text(L.issuer.postalCode),
      town: text(L.issuer.town),
      country: 'CH',
      // A logo in the business theme, the name as letterhead otherwise.
      ...(theme === 'business' && { logo: logo('png') }),
      extraLines: [text(L.issuer.extraLine), text(L.issuer.extraLine)],
      phones: [text(L.issuer.phone), text(L.issuer.phone)],
      email: `${'W'.repeat(30)}@${'W'.repeat(L.issuer.email - 34)}.ch`,
      contact: text(L.issuer.contact),
      uid: UID,
      vatRegistered: true,
    },
    recipient: {
      salutation: text(L.recipient.salutation),
      name: text(L.recipient.name),
      extraLines: [text(L.recipient.extraLine), text(L.recipient.extraLine)],
      street: text(L.recipient.street),
      buildingNumber: text(L.recipient.buildingNumber),
      postalCode: text(L.recipient.postalCode),
      town: text(L.recipient.town),
      country: 'DE',
    },
    items,
    // The mentions with the window on the left; without them, the remarks start beside the totals.
    ...(addressWindow === 'left' && {
      mentions: { notVatRegistered: true, vatExcluded: true, paymentDays: 365, thanks: true },
    }),
    notes: Array.from({ length: L.notes }, () => paragraph(L.note, L.noteLines, spaced)),
    payment: { account: QR_IBAN, reference: QR_REFERENCE },
  };
}

/** The box of a text, in millimetres: from its ascent to its descent. */
function box(text: Text): { left: number; right: number; top: number; bottom: number } {
  const size = text.size / PT;
  return { left: text.x, right: text.x + text.width, top: text.y - 0.72 * size, bottom: text.y + 0.21 * size };
}

const ε = 0.01;

describe('no overflow', () => {
  const cases = LANGUAGES.flatMap((language) =>
    WINDOWS.flatMap((window) => THEMES.map((theme) => [language, window, theme] as const)),
  );

  it.each(cases)('%s, window on the %s, theme %s', async (language, window, theme) => {
    const spaced = THEMES.indexOf(theme) % 2 === 0;
    const input = maximal(language, window, theme, spaced);
    const result = validateInvoice(input);
    expect(result.success).toBe(true);
    const bill = result.success ? result.data.bill : undefined;
    expect(bill).toBeDefined();
    // The slip, its cutting lines included, takes the bottom of the last page.
    const slipTop = bill === undefined ? 297 : 297 - 105 + layoutQRBill(bill, { language }).bounds.y;

    const { pages } = await render(input);
    expect(pages.length).toBeGreaterThan(2);
    pages.forEach((page, index) => {
      const last = index === pages.length - 1;
      const body = textsOf(page).filter((text) => !last || text.y < 297 - 105);
      const boxes = body.map(box);
      for (const [position, area] of boxes.entries()) {
        const where = `page ${index + 1}, "${body[position]?.text ?? ''}"`;
        expect(area.left, where).toBeGreaterThanOrEqual(20 - ε);
        expect(area.right, where).toBeLessThanOrEqual(190 + ε);
        expect(area.bottom, where).toBeLessThanOrEqual(last ? slipTop : 282);
        for (const other of boxes.slice(position + 1)) {
          const apart =
            area.right <= other.left + ε ||
            other.right <= area.left + ε ||
            area.bottom <= other.top + ε ||
            other.bottom <= area.top + ε;
          expect(apart, `${where} overlaps another text`).toBe(true);
        }
      }
    });
  });
});
