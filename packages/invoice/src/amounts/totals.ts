/**
 * The amounts of an invoice: each line, the VAT of each rate and the total, computed exactly in integers.
 *
 * - The amount of a line is given, or its quantity (1 when absent) times its unit price, rounded to the centime.
 * - The VAT of a rate is computed on the sum of the lines at that rate, not line by line, so that roundings do not
 *   add up. When the prices exclude VAT it is added; when they include it, it is the part of the gross amount that
 *   is VAT (gross × rate / (100 + rate)).
 * - All roundings are commercial (half away from zero), to the centime, or to 5 centimes for the total on request.
 *
 * @module
 */

import type { InvoiceItem } from '../items/items.types.js';
import type { ComputedTotals, InvoiceTotals, InvoiceVAT, ParsedLine, TotalsOptions } from './amounts.types.js';
import { parseDecimal, roundDiv, toDecimal, toShortDecimal } from './money.js';

/** Decimals of a quantity: 3, so that `1.5` hours is `1500n`. */
export const QUANTITY_DECIMALS = 3;
/** Decimals of a unit price: 4, for prices such as 0.1250 per unit. */
export const UNIT_PRICE_DECIMALS = 4;
/** Decimals of a VAT rate in percent: 2, so that 8.1 % is `810n`. */
export const RATE_DECIMALS = 2;
/** Decimals of an amount: 2, amounts are counted in centimes. */
export const AMOUNT_DECIMALS = 2;
/** The largest amount, in centimes: the largest amount of a QR-bill, 999 999 999.99. */
export const MAX_CENTIMES = 99_999_999_999n;

/**
 * The amount of a line in centimes: its own amount, or quantity × unit price; `undefined` for a line of text.
 *
 * @param line - The line, read.
 * @returns The amount in centimes.
 */
export function lineAmount(line: ParsedLine): bigint | undefined {
  if (line.amount !== undefined) return line.amount;
  if (line.unitPrice === undefined) return undefined;
  const quantity = line.quantity ?? 10n ** BigInt(QUANTITY_DECIMALS);
  return roundDiv(quantity * line.unitPrice, 10n ** BigInt(QUANTITY_DECIMALS + UNIT_PRICE_DECIMALS - AMOUNT_DECIMALS));
}

/**
 * Computes the totals of lines already read. The result is in centimes; see {@link computeInvoiceTotals} for the
 * rules.
 *
 * @param lines - The lines, read.
 * @param options - Prices with or without VAT, rounding to 5 centimes.
 * @returns The amount of each line, the subtotal, the VAT per rate, the rounding and the total.
 */
export function computeTotals(lines: readonly ParsedLine[], options: TotalsOptions): ComputedTotals {
  const amounts = lines.map(lineAmount);
  const bases = new Map<bigint, bigint>();
  let subtotal = 0n;
  lines.forEach((line, index) => {
    const amount = amounts[index] ?? 0n;
    subtotal += amount;
    if (line.vatRate !== undefined) bases.set(line.vatRate, (bases.get(line.vatRate) ?? 0n) + amount);
  });
  // A rate in hundredths of a percent: 100 % is 10000.
  const hundredPercent = 100n * 10n ** BigInt(RATE_DECIMALS);
  const vat = [...bases]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([rate, base]) => ({
      rate,
      base,
      amount: roundDiv(base * rate, options.pricesIncludeVAT === true ? hundredPercent + rate : hundredPercent),
    }));
  const vatTotal = vat.reduce((total, { amount }) => total + amount, 0n);
  const total = options.pricesIncludeVAT === true ? subtotal : subtotal + vatTotal;
  if (options.roundTo5Centimes !== true) return { lines: amounts, subtotal, vat, total };
  const rounded = roundDiv(total, 5n) * 5n;
  return { lines: amounts, subtotal, vat, rounding: rounded - total, total: rounded };
}

/**
 * Writes totals in centimes as decimal strings.
 *
 * @param totals - The result of {@link computeTotals}.
 * @returns The totals as printed in an {@link Invoice}.
 */
export function totalsToDecimals(totals: ComputedTotals): InvoiceTotals {
  const vat: InvoiceVAT[] = totals.vat.map(({ rate, base, amount }) => ({
    rate: toShortDecimal(rate, RATE_DECIMALS),
    base: toDecimal(base, AMOUNT_DECIMALS),
    amount: toDecimal(amount, AMOUNT_DECIMALS),
  }));
  return {
    lines: totals.lines.map((amount) => (amount === undefined ? undefined : toDecimal(amount, AMOUNT_DECIMALS))),
    subtotal: toDecimal(totals.subtotal, AMOUNT_DECIMALS),
    vat,
    ...(totals.rounding !== undefined && { rounding: toDecimal(totals.rounding, AMOUNT_DECIMALS) }),
    total: toDecimal(totals.total, AMOUNT_DECIMALS),
  };
}

/** Reads one number of a line, or throws a RangeError naming it. */
function readNumber(value: unknown, decimals: number, name: string, index: number): bigint | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseDecimal(value, decimals);
  if (parsed === undefined) {
    throw new RangeError(`items[${index}].${name}: expected a number with at most ${decimals} decimals`);
  }
  return parsed;
}

/**
 * Computes the amounts of an invoice from its lines, without the rest of the invoice: useful to show the totals
 * while a form is being filled.
 *
 * - The amount of a line is its `amount`, or its `quantity` (1 when absent) × `unitPrice`, rounded to the centime;
 *   a line with neither is a line of text.
 * - The VAT is computed per rate on the sum of the lines at that rate. Prices exclude VAT by default: it is added to
 *   the total. With `pricesIncludeVAT`, the VAT is the part of the gross amount that is VAT.
 * - Roundings are commercial (half away from zero), to the centime; the total is rounded to 5 centimes with
 *   `roundTo5Centimes`.
 *
 * @param items - The lines of the invoice.
 * @param options - Prices with or without VAT, rounding to 5 centimes.
 * @returns The amount of each line, the subtotal, the VAT per rate (highest rate first), the rounding and the
 *   total, as decimal strings.
 * @throws {RangeError} When a quantity, price, rate or amount is not a number with the decimals allowed.
 * @example
 * ```ts
 * computeInvoiceTotals([{ description: 'Advice', quantity: 6, unitPrice: '150', vatRate: '8.1' }]).total; // '972.90'
 * ```
 */
export function computeInvoiceTotals(items: readonly InvoiceItem[], options: TotalsOptions = {}): InvoiceTotals {
  const lines = items.map((item, index) => ({
    quantity: readNumber(item.quantity, QUANTITY_DECIMALS, 'quantity', index),
    unitPrice: readNumber(item.unitPrice, UNIT_PRICE_DECIMALS, 'unitPrice', index),
    vatRate: readNumber(item.vatRate, RATE_DECIMALS, 'vatRate', index),
    amount: readNumber(item.amount, AMOUNT_DECIMALS, 'amount', index),
  }));
  return totalsToDecimals(computeTotals(lines, options));
}
