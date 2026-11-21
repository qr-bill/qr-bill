/**
 * The columns of the table: those at least one line uses, each as wide as its widest text, so that no number is ever
 * cut; the descriptions take the room left.
 *
 * @module
 */

import { formatMoney } from '../amounts/money.js';
import type { RenderContext } from '../drawing/drawing.types.js';
import { LEFT, RIGHT } from '../page/page.js';
import { COLUMN_GAP, HEADER_SIZE, ROW_SIZE } from './dimensions.js';
import type { Column, PlacedColumn } from './table.types.js';

/**
 * The columns of numbers and units that at least one line uses, in their order: quantity, unit, unit price, VAT
 * rate, amount.
 *
 * @param context - The invoice being drawn.
 * @returns The columns, with the text of each line.
 */
export function tableColumns(context: RenderContext): Column[] {
  const { invoice, labels } = context;
  const { lines, totals, amountFormat, currency } = invoice;
  const number = (value: string | undefined): string | undefined =>
    value === undefined ? undefined : formatMoney(value, amountFormat);
  const all: Column[] = [
    { label: labels.quantity, cells: lines.map((line) => number(line.quantity)), align: 'right' },
    { label: labels.unit, cells: lines.map((line) => line.unit), align: 'left' },
    { label: labels.unitPrice, cells: lines.map((line) => number(line.unitPrice)), align: 'right' },
    {
      label: labels.vat,
      cells: lines.map((line) => (line.vatRate === undefined ? undefined : `${line.vatRate} %`)),
      align: 'right',
    },
    { label: `${labels.amount} ${currency}`, cells: totals.lines.map(number), align: 'right' },
  ];
  return all.filter((column) => column.cells.some((cell) => cell !== undefined));
}

/**
 * Places the columns from the right edge, each as wide as its widest text, label included; the descriptions take
 * the rest.
 *
 * @param context - The invoice being drawn.
 * @param columns - The columns, in their order.
 * @returns The columns placed, and the width left for the descriptions.
 */
export function placeColumns(
  context: RenderContext,
  columns: readonly Column[],
): { columns: PlacedColumn[]; description: number } {
  const { pen } = context;
  let right = RIGHT;
  const placed: PlacedColumn[] = [];
  for (const column of [...columns].reverse()) {
    const width = Math.max(
      pen.measure(column.label, HEADER_SIZE, true),
      ...column.cells.map((cell) => (cell === undefined ? 0 : pen.measure(cell, ROW_SIZE))),
    );
    placed.unshift({ ...column, left: right - width, right });
    right -= width + COLUMN_GAP;
  }
  return { columns: placed, description: right - LEFT };
}
