/**
 * Validation of the lines of an invoice: their texts, and their numbers read as exact integers.
 *
 * @module
 */

import { type IssuePath, MAX_AMOUNT } from '@qr-bill/core';
import type { ParsedLine } from '../amounts/amounts.types.js';
import { toShortDecimal } from '../amounts/money.js';
import {
  AMOUNT_DECIMALS,
  MAX_CENTIMES,
  QUANTITY_DECIMALS,
  RATE_DECIMALS,
  UNIT_PRICE_DECIMALS,
  lineAmount,
} from '../amounts/totals.js';
import { type IssueList, isAbsent, isRecord, readLine, readList, readNumber, readParagraph } from '../fields/fields.js';
import { INVOICE_LIMITS } from '../invoice/limits.js';
import type { InvoiceLine, ItemsRead } from './items.types.js';

/** The largest quantity and unit price: a billion, in their units. */
const MAX_QUANTITY = 10n ** BigInt(9 + QUANTITY_DECIMALS);
const MAX_UNIT_PRICE = 10n ** BigInt(9 + UNIT_PRICE_DECIMALS);
/** VAT rates go from 0 to 100 %, in hundredths of a percent. */
const MAX_RATE = 100n * 10n ** BigInt(RATE_DECIMALS);

/**
 * Reads the lines of an invoice: from 1 to 1000, each with a description and optional numbers. A line with a
 * quantity needs a unit price or an amount.
 *
 * @param value - The lines, as given.
 * @param issues - Where problems are reported.
 * @returns The lines read, or `undefined` when one of them is invalid.
 */
export function readItems(value: unknown, issues: IssueList): ItemsRead | undefined {
  const L = INVOICE_LIMITS;
  if (isAbsent(value) || (Array.isArray(value) && value.length === 0)) {
    issues.add('required', ['items'], 'At least one line is required');
    return undefined;
  }
  const entries = readList(value, ['items'], L.items, issues);
  if (entries.length === 0) return undefined;
  const parsed: ParsedLine[] = [];
  const lines: InvoiceLine[] = [];
  let valid = true;
  for (const [index, entry] of entries.entries()) {
    const path = ['items', index];
    if (!isRecord(entry)) {
      issues.add('invalid_type', path, 'Expected a line object');
      valid = false;
      continue;
    }
    const count = issues.list.length;
    const description = readParagraph(
      entry['description'],
      [...path, 'description'],
      L.description,
      L.descriptionLines,
      issues,
      true,
    );
    const unit = readLine(entry['unit'], [...path, 'unit'], L.unit, issues);
    const line: ParsedLine = {
      quantity: readNumber(entry['quantity'], [...path, 'quantity'], QUANTITY_DECIMALS, MAX_QUANTITY, issues),
      unitPrice: readNumber(entry['unitPrice'], [...path, 'unitPrice'], UNIT_PRICE_DECIMALS, MAX_UNIT_PRICE, issues),
      vatRate: readRate(entry['vatRate'], [...path, 'vatRate'], issues),
      amount: readNumber(entry['amount'], [...path, 'amount'], AMOUNT_DECIMALS, MAX_CENTIMES, issues),
    };
    if (line.quantity !== undefined && line.unitPrice === undefined && line.amount === undefined) {
      issues.add('required', [...path, 'unitPrice'], 'A line with a quantity needs a unit price or an amount');
    }
    const amount = lineAmount(line);
    if (amount !== undefined && (amount < -MAX_CENTIMES || amount > MAX_CENTIMES)) {
      issues.add('out_of_range', [...path, 'amount'], `The amount of the line must stay within ±${MAX_AMOUNT}`);
    }
    if (issues.list.length > count || description === undefined) {
      valid = false;
      continue;
    }
    parsed.push(line);
    lines.push({
      description,
      ...(line.quantity !== undefined && { quantity: toShortDecimal(line.quantity, QUANTITY_DECIMALS) }),
      ...(unit !== undefined && { unit }),
      ...(line.unitPrice !== undefined && { unitPrice: toShortDecimal(line.unitPrice, UNIT_PRICE_DECIMALS, 2) }),
      ...(line.vatRate !== undefined && { vatRate: toShortDecimal(line.vatRate, RATE_DECIMALS) }),
    });
  }
  return valid ? { parsed, lines } : undefined;
}

/**
 * Reads a VAT rate in percent, from 0 to 100, with at most 2 decimals.
 *
 * @param value - The rate, as given.
 * @param path - Where it is.
 * @param issues - Where problems are reported: `invalid_number`, `out_of_range`.
 * @returns The rate in hundredths of a percent, or `undefined`.
 */
export function readRate(value: unknown, path: IssuePath, issues: IssueList): bigint | undefined {
  const rate = readNumber(value, path, RATE_DECIMALS, MAX_RATE, issues);
  if (rate === undefined || rate >= 0n) return rate;
  issues.add('out_of_range', path, 'A VAT rate goes from 0 to 100 %');
  return undefined;
}
