import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  LABELS,
  type Language,
  type PathElement,
  type QRBill,
  type QRBillLayout,
  createQRBill,
  layoutQRBill,
} from '../../src/index.js';
import {
  FURTHER_INFORMATION,
  PAYMENT_PART_AMOUNT_FIELD,
  PAYMENT_PART_INFORMATION,
  QR_CODE,
  RECEIPT_AMOUNT_FIELD,
  RECEIPT_INFORMATION,
  SLIP,
} from '../../src/layout/dimensions.js';
import { ELLIPSIS, textWidth, wrap } from '../../src/layout/text.js';
import { IBAN } from '../fixtures.js';
import { SIX_BILLS, inside, overflowing, textBox, texts, textsIn } from './helpers.js';

const LANGUAGES: readonly Language[] = ['de', 'fr', 'it', 'en', 'rm'];
const SEPARATORS = ['scissors', 'text', 'none'] as const;

const creditor = {
  account: IBAN,
  name: 'Max Muster & Söhne',
  street: 'Musterstrasse',
  buildingNumber: '123',
  postalCode: '8000',
  town: 'Seldwyla',
  country: 'CH',
};

/** A bill whose every field is at its maximum length, with the widest letter. */
function widest(country = 'LI'): QRBill {
  const w = (n: number) => 'W'.repeat(n);
  const address = { name: w(70), street: w(70), buildingNumber: w(16), postalCode: w(16), town: w(35), country };
  return createQRBill({
    currency: 'CHF',
    amount: '999999999.99',
    creditor: { ...address, account: IBAN },
    debtor: address,
    reference: 'RF18539007547034',
    // 140 characters together, split so that they take the most lines.
    message: w(33),
    billingInformation: `//S1/${w(102)}`,
    alternativeProcedures: [w(100), `${w(99)}/`],
  });
}

const paths = (layout: QRBillLayout): PathElement[] =>
  layout.elements.filter((element): element is PathElement => element.type === 'path');

describe('layoutQRBill: the examples of Annex A', () => {
  for (const { id, bill } of SIX_BILLS) {
    it.each(LANGUAGES)(`${id} in %s: every text inside its section`, (language) => {
      for (const separators of SEPARATORS) {
        expect(overflowing(layoutQRBill(bill, { language, separators }))).toEqual([]);
      }
    });
  }

  it('returns a frozen layout of 210 × 105 mm', () => {
    const layout = layoutQRBill(SIX_BILLS[0]?.bill ?? widest(), { language: 'de', separators: 'none' });
    expect([layout.width, layout.height]).toEqual([210, 105]);
    expect(layout.bounds).toEqual(SLIP);
    expect(Object.isFrozen(layout)).toBe(true);
    expect(Object.isFrozen(layout.elements)).toBe(true);
  });
});

describe('layoutQRBill: content (chapters 3.5 and 3.6)', () => {
  const example = (n: number) => SIX_BILLS[n - 1]?.bill ?? widest();

  it('prints the headings in the order of the standard, the additional information on the payment part only', () => {
    const labels = LABELS.fr;
    const layout = layoutQRBill(example(2), { language: 'fr' });
    const headings = texts(layout)
      .filter((element) => element.fontWeight === 'bold')
      .map((element) => element.text);
    expect(headings).toEqual([
      labels.receipt,
      labels.accountPayableTo,
      labels.reference,
      labels.payableBy,
      labels.currency,
      labels.amount,
      labels.acceptancePoint,
      labels.paymentPart,
      labels.currency,
      labels.amount,
      labels.accountPayableTo,
      labels.reference,
      labels.additionalInformation,
      labels.payableBy,
      'eBill',
    ]);
  });

  it('formats the account, the reference and the amount for printing', () => {
    const information = textsIn(layoutQRBill(example(1), { language: 'en' }), PAYMENT_PART_INFORMATION);
    expect(information).toContain('CH64 3196 1000 0044 2155 7');
    expect(information).toContain('00 00082 07791 22585 74212 86694');
    expect(texts(layoutQRBill(example(2), { language: 'en' })).map((element) => element.text)).toContain('1 949.75');
  });

  it('prints the message, then the billing information on its own line', () => {
    const information = textsIn(layoutQRBill(example(2), { language: 'de' }), PAYMENT_PART_INFORMATION);
    const message = information.indexOf('Order from 15.10.2020');
    expect(message).toBeGreaterThan(-1);
    expect(information[message + 1]?.startsWith('//S1/')).toBe(true);
  });

  it('precedes the postal code of a foreign address with the country code, Liechtenstein included', () => {
    expect(textsIn(layoutQRBill(example(5), { language: 'de' }), PAYMENT_PART_INFORMATION)).toContain('LI-9490 Vaduz');
    expect(textsIn(layoutQRBill(example(6), { language: 'de' }), RECEIPT_INFORMATION)).toContain('DE-78462 Konstanz');
    expect(textsIn(layoutQRBill(example(1), { language: 'de' }), RECEIPT_INFORMATION)).toContain('8000 Seldwyla');
  });

  it('leaves blank fields with corner marks for the amount and the debtor when the bill has none', () => {
    const layout = layoutQRBill(example(3), { language: 'it' });
    const labels = LABELS.it;
    const all = texts(layout).map((element) => element.text);
    expect(all.filter((text) => text === labels.payableByNameAddress)).toHaveLength(2);
    expect(all).not.toContain(labels.payableBy);
    expect(all).not.toContain(labels.reference);
    const marks = paths(layout).filter((element) => 'stroke' in element && element.stroke.width === 0.75);
    expect(marks).toHaveLength(4);
    const corners = (box: { x: number; y: number }) => `M${box.x} ${box.y + 3}V${box.y}H${box.x + 3}`;
    expect(marks.some((element) => element.d.startsWith(corners(PAYMENT_PART_AMOUNT_FIELD)))).toBe(true);
    expect(marks.some((element) => element.d.startsWith(corners(RECEIPT_AMOUNT_FIELD)))).toBe(true);
  });

  it('draws the Swiss QR Code in its 46 mm square, with the Swiss cross at the centre', () => {
    const layout = layoutQRBill(example(1), { language: 'en' });
    const [qrCode, border] = paths(layout).filter((element) => 'fill' in element);
    const coordinates = (qrCode?.d.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    expect(Math.min(...coordinates)).toBeGreaterThanOrEqual(QR_CODE.x - 50);
    expect(qrCode?.d.startsWith(`M${QR_CODE.x} ${QR_CODE.y}H`)).toBe(true);
    expect(border?.d).toBe('M86.5 36.5H93.5V43.5H86.5Z');
  });
});

describe('layoutQRBill: fitting long content (chapters 3.4, 3.5.4, 3.6.2)', () => {
  it('uses the recommended 8/10 pt fonts when everything fits', () => {
    const sizes = new Set(
      texts(layoutQRBill(SIX_BILLS[1]?.bill ?? widest(), { language: 'de' }))
        .filter((element) => inside(textBox(element), PAYMENT_PART_INFORMATION))
        .map((element) => element.fontSize),
    );
    expect(sizes).toEqual(new Set([8, 10]));
  });

  it('falls back to smaller fonts, then shortens the additional information, and never overflows', () => {
    const layout = layoutQRBill(widest(), { language: 'rm' });
    expect(overflowing(layout)).toEqual([]);
    const information = texts(layout).filter((element) => inside(textBox(element), PAYMENT_PART_INFORMATION));
    expect(new Set(information.map((element) => element.fontSize))).toEqual(new Set([6, 8]));
    // The additional information: between its heading and the next one, fewer lines than the whole text needs.
    const labels = LABELS.rm;
    const start = information.findIndex((element) => element.text === labels.additionalInformation);
    const end = information.findIndex((element) => element.text === labels.payableBy);
    const shown = information.slice(start + 1, end).map((element) => element.text);
    const bill = widest();
    const whole = wrap(`${bill.message ?? ''}\n${bill.billingInformation ?? ''}`, 87, { size: 8, weight: 'regular' });
    expect(shown.length).toBeLessThan(whole.length);
    expect(shown.at(-1)?.endsWith(ELLIPSIS)).toBe(true);
  });

  it('leaves the streets out of the receipt when they do not fit', () => {
    const receipt = textsIn(layoutQRBill(widest(), { language: 'en' }), RECEIPT_INFORMATION);
    expect(receipt.some((text) => text.startsWith('LI-'))).toBe(true);
    expect(receipt.filter((text) => text.startsWith('WWW')).length).toBeLessThan(8);
  });

  it('writes each alternative procedure on one line, its name in bold, shortened with an ellipsis', () => {
    const layout = layoutQRBill(widest(), { language: 'de' });
    const procedures = texts(layout).filter((element) => element.y > FURTHER_INFORMATION.y);
    expect(procedures).toHaveLength(2);
    for (const element of procedures) {
      expect(element.text.endsWith(ELLIPSIS)).toBe(true);
      expect(element.x + textWidth(element.text, 7, element.fontWeight)).toBeLessThanOrEqual(205.001);
    }
    // No separator: no name, the whole line is regular. A name longer than the line: the name alone, shortened.
    expect(procedures.map((element) => element.fontWeight)).toEqual(['regular', 'bold']);
  });

  it('fits any valid bill in its sections', () => {
    const text = (max: number) =>
      fc
        .string({ unit: fc.constantFrom(...'Wa mÄ1-é'), minLength: 1, maxLength: max })
        .filter((value) => value.trim() !== '');
    const address = fc.record({
      name: text(70),
      street: text(70),
      buildingNumber: text(16),
      postalCode: text(16),
      town: text(35),
      country: fc.constantFrom('CH', 'DE'),
    });
    fc.assert(
      fc.property(
        address,
        fc.option(address, { nil: undefined }),
        text(70),
        fc.array(text(100), { maxLength: 2 }),
        fc.constantFrom(...LANGUAGES),
        (creditorAddress, debtor, message, alternativeProcedures, language) => {
          const bill = createQRBill({
            currency: 'CHF',
            creditor: { ...creditorAddress, account: IBAN },
            debtor,
            message,
            alternativeProcedures: alternativeProcedures.filter((procedure) => procedure.trim() !== ''),
          });
          expect(overflowing(layoutQRBill(bill, { language }))).toEqual([]);
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe('layoutQRBill: cutting lines (chapter 3.7)', () => {
  const bill = createQRBill({ currency: 'CHF', creditor });

  it('draws dashed lines with scissors by default, reaching a little above the slip', () => {
    const layout = layoutQRBill(bill, { language: 'fr' });
    const dashed = paths(layout).filter((element) => 'stroke' in element && element.stroke.dash !== undefined);
    expect(dashed.map((element) => element.d)).toEqual(['M0 0H210', 'M62 0V105']);
    expect(paths(layout).filter((element) => 'stroke' in element && element.stroke.width === 0.5)).toHaveLength(4);
    expect(layout.bounds.y).toBeLessThan(0);
    expect(layout.bounds.height).toBe(105 - layout.bounds.y);
  });

  it('can print the instruction above the slip instead of the scissors, centred over the payment part', () => {
    const layout = layoutQRBill(bill, { language: 'fr', separators: 'text' });
    const instruction = texts(layout).find((element) => element.text === LABELS.fr.separateBeforePayingIn);
    expect(instruction?.y).toBeLessThan(0);
    const box = instruction === undefined ? SLIP : textBox(instruction);
    expect(box.x - 62).toBeCloseTo(210 - (box.x + box.width), 6);
    expect(box.y).toBeGreaterThanOrEqual(layout.bounds.y - 0.001);
  });

  it('can draw no line at all, for perforated paper', () => {
    const layout = layoutQRBill(bill, { language: 'fr', separators: 'none' });
    expect(paths(layout).filter((element) => 'stroke' in element && element.stroke.dash !== undefined)).toEqual([]);
    expect(layout.bounds).toEqual(SLIP);
  });
});
