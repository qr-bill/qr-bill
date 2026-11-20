import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { InvoiceItem } from '../../src/items/items.types.js';
import { parseDecimal } from '../../src/amounts/money.js';
import { computeInvoiceTotals } from '../../src/amounts/totals.js';

describe('computeInvoiceTotals', () => {
  it('adds the VAT to prices without VAT, on the sum of the lines at each rate', () => {
    const totals = computeInvoiceTotals([
      { description: 'Advice', quantity: 6, unit: 'h', unitPrice: '150.00', vatRate: '8.1' },
      { description: 'Set-up', unitPrice: '450', vatRate: 8.1 },
      { description: 'Membership', quantity: '1', unitPrice: 80, vatRate: '8.10' },
      { description: 'Loyalty discount', amount: '-90.00', vatRate: '8.1' },
    ]);
    expect(totals).toEqual({
      lines: ['900.00', '450.00', '80.00', '-90.00'],
      subtotal: '1340.00',
      vat: [{ rate: '8.1', base: '1340.00', amount: '108.54' }],
      total: '1448.54',
    });
  });

  it('lists several rates, highest first, and leaves the lines without a rate out of the VAT', () => {
    const totals = computeInvoiceTotals([
      { description: 'Books', amount: '50.00', vatRate: '2.6' },
      { description: 'Advice', amount: '100.00', vatRate: '8.1' },
      { description: 'Postage', amount: '30.00' },
      { description: 'Hotel night', amount: '200.00', vatRate: '3.8' },
    ]);
    expect(totals.vat).toEqual([
      { rate: '8.1', base: '100.00', amount: '8.10' },
      { rate: '3.8', base: '200.00', amount: '7.60' },
      { rate: '2.6', base: '50.00', amount: '1.30' },
    ]);
    expect(totals.subtotal).toBe('380.00');
    expect(totals.total).toBe('397.00');
  });

  it('takes the VAT out of prices that include it: gross × rate / (100 + rate)', () => {
    expect(
      computeInvoiceTotals([{ description: 'A', amount: '108.10', vatRate: '8.1' }], { pricesIncludeVAT: true }),
    ).toEqual({
      lines: ['108.10'],
      subtotal: '108.10',
      vat: [{ rate: '8.1', base: '108.10', amount: '8.10' }],
      total: '108.10',
    });
    // 100.00 × 8.1 / 108.1 = 7.4930…
    expect(
      computeInvoiceTotals([{ description: 'B', amount: '100.00', vatRate: '8.1' }], { pricesIncludeVAT: true }).vat,
    ).toEqual([{ rate: '8.1', base: '100.00', amount: '7.49' }]);
  });

  it('computes quantity × unit price, the quantity being 1 when absent, rounded to the centime', () => {
    const totals = computeInvoiceTotals([
      { description: 'One', unitPrice: '19.90' },
      { description: 'Hours', quantity: '1.5', unitPrice: '120.00' },
      { description: 'Third', quantity: '0.333', unitPrice: '10.00' },
      { description: 'Energy', quantity: 3, unitPrice: '0.1255' },
      { description: 'Return', quantity: '-2', unitPrice: '15.00' },
      { description: 'Given amount wins', quantity: 2, unitPrice: '10', amount: '5' },
      { description: 'A line of text' },
      { description: 'Empty fields are absent', quantity: '', unitPrice: '', vatRate: '', amount: '' },
    ]);
    // 3 × 0.1255 = 0.3765, rounded half away from zero to 0.38
    expect(totals.lines).toEqual(['19.90', '180.00', '3.33', '0.38', '-30.00', '5.00', undefined, undefined]);
    expect(totals.subtotal).toBe('178.61');
    expect(totals.vat).toEqual([]);
    expect(totals.total).toBe('178.61');
  });

  it('rounds the total to 5 centimes on request, and says by how much', () => {
    const lines: InvoiceItem[] = [{ description: 'A', amount: '1340.00', vatRate: '8.1' }];
    expect(computeInvoiceTotals(lines, { roundTo5Centimes: true })).toMatchObject({
      rounding: '0.01',
      total: '1448.55',
    });
    expect(computeInvoiceTotals([{ description: 'B', amount: '12.32' }], { roundTo5Centimes: true })).toMatchObject({
      rounding: '-0.02',
      total: '12.30',
    });
    expect(computeInvoiceTotals([{ description: 'C', amount: '-12.33' }], { roundTo5Centimes: true })).toMatchObject({
      rounding: '-0.02',
      total: '-12.35',
    });
    expect(computeInvoiceTotals([{ description: 'D', amount: '10.00' }], { roundTo5Centimes: true })).toMatchObject({
      rounding: '0.00',
      total: '10.00',
    });
    expect(computeInvoiceTotals(lines)).not.toHaveProperty('rounding');
  });

  it('throws a RangeError naming the field with too many decimals', () => {
    expect(() => computeInvoiceTotals([{ description: 'A', unitPrice: '1.23456' }])).toThrow(
      new RangeError('items[0].unitPrice: expected a number with at most 4 decimals'),
    );
    expect(() =>
      computeInvoiceTotals([
        { description: 'A', amount: '1' },
        { description: 'B', quantity: '0.0001' },
      ]),
    ).toThrow(new RangeError('items[1].quantity: expected a number with at most 3 decimals'));
    expect(() => computeInvoiceTotals([{ description: 'A', vatRate: 'eight' }])).toThrow(RangeError);
  });
});

/** A line with a quantity, a unit price and maybe one of the Swiss rates. */
const line = fc.record({
  description: fc.constant('Line'),
  quantity: fc.integer({ min: -1_000_000, max: 1_000_000 }).map((thousandths) => (thousandths / 1000).toFixed(3)),
  unitPrice: fc.integer({ min: -100_000_000, max: 100_000_000 }).map((units) => (units / 10_000).toFixed(4)),
  vatRate: fc.constantFrom(undefined, '0', '2.6', '3.8', '8.1'),
});

const cents = (amount: string | undefined): bigint => parseDecimal(amount ?? '0', 2) ?? 0n;

describe('computeInvoiceTotals: properties', () => {
  it('the subtotal is the sum of the lines, and the total adds the VAT unless the prices include it', () => {
    fc.assert(
      fc.property(fc.array(line, { minLength: 1, maxLength: 30 }), fc.boolean(), (items, pricesIncludeVAT) => {
        const totals = computeInvoiceTotals(items, { pricesIncludeVAT });
        const sum = totals.lines.reduce((total, amount) => total + cents(amount), 0n);
        expect(cents(totals.subtotal)).toBe(sum);
        const vat = totals.vat.reduce((total, { amount }) => total + cents(amount), 0n);
        expect(cents(totals.total)).toBe(pricesIncludeVAT ? sum : sum + vat);
      }),
    );
  });

  it('the VAT of each rate is within half a centime of the exact value', () => {
    fc.assert(
      fc.property(fc.array(line, { minLength: 1, maxLength: 30 }), fc.boolean(), (items, pricesIncludeVAT) => {
        for (const { rate, base, amount } of computeInvoiceTotals(items, { pricesIncludeVAT }).vat) {
          // In hundredths of a percent: VAT × divisor ≈ base × rate, within divisor / 2.
          const hundredths = parseDecimal(rate, 2) ?? 0n;
          const divisor = pricesIncludeVAT ? 10_000n + hundredths : 10_000n;
          const error = cents(amount) * divisor - cents(base) * hundredths;
          expect(2n * (error < 0n ? -error : error) <= divisor).toBe(true);
        }
      }),
    );
  });

  it('a total rounded to 5 centimes is a multiple of 5, at most 2 centimes away', () => {
    fc.assert(
      fc.property(fc.array(line, { minLength: 1, maxLength: 10 }), (items) => {
        const exact = cents(computeInvoiceTotals(items).total);
        const rounded = computeInvoiceTotals(items, { roundTo5Centimes: true });
        expect(cents(rounded.total) % 5n).toBe(0n);
        expect(cents(rounded.total) - exact).toBe(cents(rounded.rounding));
        expect(cents(rounded.rounding) >= -2n && cents(rounded.rounding) <= 2n).toBe(true);
      }),
    );
  });
});
