/**
 * The table of the lines: the descriptions, which wrap, and the columns of numbers (see {@link placeColumns}). A row
 * never splits: when it does not fit, it goes to a new page, under the header of the table drawn again.
 *
 * @module
 */

import type { RenderContext } from '../drawing/drawing.types.js';
import { wrap } from '../drawing/text.js';
import type { Flow } from '../page/flow.js';
import { BAND_OVERHANG, CONTENT_WIDTH, LEFT, RIGHT } from '../page/page.js';
import { placeColumns, tableColumns } from './columns.js';
import {
  HEADER_BASELINE,
  HEADER_HEIGHT,
  HEADER_RULE,
  HEADER_SIZE,
  ROW_LINE,
  ROW_PADDING,
  ROW_RULE,
  ROW_SIZE,
} from './dimensions.js';

/**
 * Draws the table of the lines from the current position, over as many pages as needed.
 *
 * @param context - The invoice being drawn.
 * @param flow - Where the content goes; afterwards, under the table.
 */
export function drawTable(context: RenderContext, flow: Flow): void {
  const { pen, invoice, labels, colors } = context;
  const { columns: placed, description } = placeColumns(context, tableColumns(context));
  const measure = pen.measurer(ROW_SIZE);
  const rows = invoice.lines.map((line) => wrap(line.description, description, measure));
  const rowHeight = (lines: readonly string[]): number => lines.length * ROW_LINE + ROW_PADDING;

  const header = (): void => {
    const top = flow.y;
    const band = CONTENT_WIDTH + 2 * BAND_OVERHANG;
    if (colors.tableHeaderBackground !== undefined) {
      pen.rect(LEFT - BAND_OVERHANG, top, band, HEADER_HEIGHT, colors.tableHeaderBackground);
    }
    const style = { size: HEADER_SIZE, bold: true, color: colors.tableHeaderText } as const;
    pen.text(labels.description, LEFT, top + HEADER_BASELINE, style);
    for (const column of placed) {
      const x = column.align === 'right' ? column.right : column.left;
      pen.text(column.label, x, top + HEADER_BASELINE, { ...style, align: column.align });
    }
    if (colors.tableHeaderRule !== undefined) {
      pen.line(LEFT, RIGHT, top + HEADER_HEIGHT, HEADER_RULE, colors.tableHeaderRule);
    }
    flow.y += HEADER_HEIGHT;
  };

  // The header never stays alone at the bottom of a page: it goes with the first row.
  const [first = []] = rows;
  flow.ensure(HEADER_HEIGHT + rowHeight(first));
  header();
  rows.forEach((lines, index) => {
    const height = rowHeight(lines);
    if (flow.ensure(height)) header();
    const top = flow.y;
    if (colors.stripe !== undefined && index % 2 === 1) {
      pen.rect(LEFT - BAND_OVERHANG, top, CONTENT_WIDTH + 2 * BAND_OVERHANG, height, colors.stripe);
    }
    const style = { size: ROW_SIZE, color: colors.text } as const;
    lines.forEach((line, row) => {
      pen.text(line, LEFT, top + ROW_LINE + row * ROW_LINE, style);
    });
    for (const column of placed) {
      const cell = column.cells[index];
      if (cell !== undefined) {
        const x = column.align === 'right' ? column.right : column.left;
        pen.text(cell, x, top + ROW_LINE, { ...style, align: column.align });
      }
    }
    if (colors.stripe === undefined) pen.line(LEFT, RIGHT, top + height, ROW_RULE, colors.line);
    flow.y += height;
  });
}
