/**
 * The beginning of the body of the invoice: its title, its details in a grid (number, dates, period, references,
 * the details added by the caller), the subject and the introduction.
 *
 * @module
 */

import type { RenderContext } from '../drawing/drawing.types.js';
import { shorten, wrap } from '../drawing/text.js';
import type { Flow } from '../page/flow.js';
import { CONTENT_WIDTH, LEFT } from '../page/page.js';
import { formatDate } from './date.js';
import type { Detail } from './details.types.js';

/** The title: its baseline and size. */
const TITLE_BASELINE = 100;
const TITLE_SIZE = 16;

/** The grid of details: where it starts, columns, sizes, and the lines a value may take. */
const GRID_TOP = 102;
const GRID_COLUMNS = 5;
const GRID_COLUMN_WIDTH: number = CONTENT_WIDTH / GRID_COLUMNS;
const GRID_GAP = 2;
const LABEL_SIZE = 7.5;
const VALUE_SIZE = 9;
const VALUE_LINE = 4;
const VALUE_MAX_LINES = 2;

/** The subject: size, line height and lines at most. */
const SUBJECT_SIZE = 10.5;
const SUBJECT_LINE = 4.8;
const SUBJECT_MAX_LINES = 3;

/** The introduction. */
const BODY_SIZE = 9;
const BODY_LINE = 4.2;

/** The details of the invoice, in the order they are printed. */
function details(context: RenderContext): Detail[] {
  const { invoice, labels } = context;
  const optional = (label: string, value: string | undefined): Detail[] =>
    value === undefined ? [] : [{ label, value }];
  return [
    ...optional(labels.number, invoice.number),
    { label: labels.date, value: formatDate(invoice.date) },
    ...optional(labels.dueDate, invoice.dueDate === undefined ? undefined : formatDate(invoice.dueDate)),
    ...optional(labels.servicePeriod, invoice.servicePeriod),
    ...optional(labels.customerReference, invoice.customerReference),
    ...invoice.extraFields,
  ];
}

/**
 * Draws the title, the grid of details, the subject and the introduction, from the top of the body of the first
 * page.
 *
 * @param context - The invoice being drawn.
 * @param flow - Where the content goes; afterwards, under the introduction.
 */
export function drawDetails(context: RenderContext, flow: Flow): void {
  const { pen, invoice, labels, colors } = context;
  pen.text(shorten(invoice.title, CONTENT_WIDTH, pen.measurer(TITLE_SIZE, true)), LEFT, TITLE_BASELINE, {
    size: TITLE_SIZE,
    bold: true,
    color: colors.title,
  });

  // The grid, five details per row; a value takes two lines at most.
  const width = GRID_COLUMN_WIDTH - GRID_GAP;
  const labelMeasure = pen.measurer(LABEL_SIZE);
  const valueMeasure = pen.measurer(VALUE_SIZE, true);
  const all = details(context);
  let top = GRID_TOP;
  for (let start = 0; start < all.length; start += GRID_COLUMNS) {
    const row = all.slice(start, start + GRID_COLUMNS).map((detail) => ({
      label: shorten(detail.label, width, labelMeasure),
      lines: wrap(detail.value, width, valueMeasure, VALUE_MAX_LINES),
    }));
    row.forEach((detail, column) => {
      const x = LEFT + column * GRID_COLUMN_WIDTH;
      pen.text(detail.label, x, top + 3, { size: LABEL_SIZE, color: colors.muted });
      detail.lines.forEach((line, index) => {
        pen.text(line, x, top + 7 + index * VALUE_LINE, { size: VALUE_SIZE, bold: true, color: colors.text });
      });
    });
    top += 4 + Math.max(...row.map((detail) => detail.lines.length)) * VALUE_LINE + 1;
  }
  flow.y = top + 1;

  if (invoice.subject !== undefined) {
    const lines = wrap(
      `${labels.subject}${invoice.subject}`,
      CONTENT_WIDTH,
      pen.measurer(SUBJECT_SIZE, true),
      SUBJECT_MAX_LINES,
    );
    flow.paragraph(lines, SUBJECT_LINE, (line, baseline) => {
      pen.text(line, LEFT, baseline, { size: SUBJECT_SIZE, bold: true, color: colors.text });
    });
    flow.y += 2;
  }
  if (invoice.introduction !== undefined) {
    const lines = wrap(invoice.introduction, CONTENT_WIDTH, pen.measurer(BODY_SIZE));
    flow.paragraph(lines, BODY_LINE, (line, baseline) => {
      pen.text(line, LEFT, baseline, { size: BODY_SIZE, color: colors.text });
    });
    flow.y += 2;
  }
}
