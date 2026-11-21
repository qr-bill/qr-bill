/**
 * The rows of the totals, as printed: labels in the language of the invoice, amounts in its format.
 *
 * @module
 */

import { formatMoney } from '../amounts/money.js';
import type { RenderContext } from '../drawing/drawing.types.js';
import { fill } from '../labels/labels.js';
import type { TotalRows } from './summary.types.js';

/**
 * The rows of the totals: the subtotal when something lies between it and the total, the VAT of each rate (before
 * the total when it is added, after it when the prices include it), the rounding when it changed the total, and the
 * total.
 *
 * @param context - The invoice being drawn.
 * @returns The rows, as printed.
 */
export function totalRows(context: RenderContext): TotalRows {
  const { invoice, labels } = context;
  const { totals, amountFormat, pricesIncludeVAT } = invoice;
  const money = (value: string): string => formatMoney(value, amountFormat);
  const vat = totals.vat.map((entry) => {
    const values = { rate: entry.rate, ...(entry.base !== undefined && { base: money(entry.base) }) };
    const template = entry.base === undefined ? labels.vatRate : pricesIncludeVAT ? labels.vatIncluded : labels.vatOn;
    return { label: fill(template, values), value: money(entry.amount) };
  });
  const subtotal =
    totals.subtotal === undefined || totals.subtotal === totals.total
      ? []
      : [{ label: labels.subtotal, value: money(totals.subtotal) }];
  // The rounding only when it changed the total.
  const rounding =
    totals.rounding === undefined || totals.rounding === '0.00'
      ? []
      : [{ label: labels.rounding, value: money(totals.rounding) }];
  return {
    before: [...subtotal, ...(pricesIncludeVAT ? [] : vat), ...rounding],
    total: { label: `${labels.total} ${invoice.currency}`, value: money(totals.total) },
    after: pricesIncludeVAT ? vat : [],
  };
}
