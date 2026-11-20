/**
 * Validation of totals given by the caller, which are printed as they are instead of being computed.
 *
 * @module
 */

import type { IssuePath } from '@qr-bill/core';
import { type IssueList, isAbsent, isBlank, isRecord, readList, readNumber } from '../fields/fields.js';
import { readRate } from '../items/items.validator.js';
import type { InvoiceVAT, ProvidedTotals } from './amounts.types.js';
import { toDecimal, toShortDecimal } from './money.js';
import { AMOUNT_DECIMALS, MAX_CENTIMES, RATE_DECIMALS } from './totals.js';

/** At most one VAT line per rate in use; 10 is plenty. */
const MAX_PROVIDED_RATES = 10;

/**
 * Reads totals given by the caller: a total, and optionally a subtotal and the VAT per rate.
 *
 * @param value - The totals, as given.
 * @param issues - Where problems are reported.
 * @returns The totals, or `undefined` when absent or invalid.
 */
export function readProvidedTotals(value: unknown, issues: IssueList): ProvidedTotals | undefined {
  if (isAbsent(value)) return undefined;
  if (!isRecord(value)) {
    issues.add('invalid_type', ['totals'], 'Expected an object with at least a total');
    return undefined;
  }
  const amount = (field: unknown, path: IssuePath): bigint | undefined =>
    readNumber(field, path, AMOUNT_DECIMALS, MAX_CENTIMES, issues);
  const count = issues.list.length;
  const subtotal = amount(value['subtotal'], ['totals', 'subtotal']);
  const total = amount(value['total'], ['totals', 'total']);
  if (isBlank(value['total'])) issues.add('required', ['totals', 'total'], 'Required');
  const vat = readList(value['vat'], ['totals', 'vat'], MAX_PROVIDED_RATES, issues).flatMap((entry, index) => {
    const path = ['totals', 'vat', index];
    if (!isRecord(entry)) {
      issues.add('invalid_type', path, 'Expected an object with a rate and an amount');
      return [];
    }
    const rate = readRate(entry['rate'], [...path, 'rate'], issues);
    const base = amount(entry['base'], [...path, 'base']);
    const vatAmount = amount(entry['amount'], [...path, 'amount']);
    if (isBlank(entry['rate'])) issues.add('required', [...path, 'rate'], 'Required');
    if (isBlank(entry['amount'])) issues.add('required', [...path, 'amount'], 'Required');
    if (rate === undefined || vatAmount === undefined) return [];
    const line: InvoiceVAT = {
      rate: toShortDecimal(rate, RATE_DECIMALS),
      ...(base !== undefined && { base: toDecimal(base, AMOUNT_DECIMALS) }),
      amount: toDecimal(vatAmount, AMOUNT_DECIMALS),
    };
    return [line];
  });
  if (issues.list.length > count || total === undefined) return undefined;
  return {
    totals: {
      ...(subtotal !== undefined && { subtotal: toDecimal(subtotal, AMOUNT_DECIMALS) }),
      vat,
      total: toDecimal(total, AMOUNT_DECIMALS),
    },
    total,
  };
}
