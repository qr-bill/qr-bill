/**
 * The summary under the table of the lines: the totals in the right column, the mentions and remarks in the left
 * column beside them, kept together on one page, then the closing text.
 *
 * @module
 */

import type { RenderContext } from '../drawing/drawing.types.js';
import { shorten, wrap } from '../drawing/text.js';
import type { Flow } from '../page/flow.js';
import { CONTENT_WIDTH, LEFT, RIGHT } from '../page/page.js';
import { mentionTexts } from './mentions.js';
import type { TotalRow } from './summary.types.js';
import { totalRows } from './total-rows.js';

/** Space between the table and the totals, and between the totals and the closing text. */
const SPACE_BEFORE = 3;
const SPACE_AFTER = 5;

/**
 * The totals: left edge, sizes, line heights, where the baseline sits in a line, gap between labels and amounts,
 * thickness of the rule.
 */
const TOTALS_LEFT = 110;
const TOTALS_SIZE = 9;
const TOTALS_LINE = 4.4;
const TOTAL_SIZE = 10.5;
const TOTAL_LINE = 6;
const BASELINE_SHARE = 0.72;
const TOTALS_GAP = 3;
const TOTAL_RULE = 0.6;

/** The mentions and remarks: width, size, line height, space between them. */
const NOTES_WIDTH = 84;
const NOTES_SIZE = 8.5;
const NOTES_LINE = 3.8;
const NOTES_SPACE = 1.5;

/** The closing text. */
const BODY_SIZE = 9;
const BODY_LINE = 4.2;

/**
 * Draws the totals with the mentions and remarks beside them, on the same page, then the closing text.
 *
 * @param context - The invoice being drawn.
 * @param flow - Where the content goes; afterwards, under the closing text.
 */
export function drawSummary(context: RenderContext, flow: Flow): void {
  const { pen, invoice, colors } = context;
  const rows = totalRows(context);

  // The amounts are aligned right; the labels take the room left of the widest one.
  const amounts = Math.max(
    pen.measure(rows.total.value, TOTAL_SIZE, true),
    ...[...rows.before, ...rows.after].map((row) => pen.measure(row.value, TOTALS_SIZE)),
  );
  const labelWidth = RIGHT - amounts - TOTALS_GAP - TOTALS_LEFT;
  const totalsHeight = (rows.before.length + rows.after.length) * TOTALS_LINE + TOTAL_LINE + 1;

  const noteMeasure = pen.measurer(NOTES_SIZE);
  const paragraphs = mentionTexts(context).map((note) => wrap(note, NOTES_WIDTH, noteMeasure));
  const notesHeight = paragraphs.reduce((height, lines) => height + lines.length * NOTES_LINE + NOTES_SPACE, 0);

  flow.y += SPACE_BEFORE;
  flow.ensure(Math.max(totalsHeight, notesHeight));
  const top = flow.y;

  let y = top;
  const row = (entry: TotalRow, size: number, bold: boolean, color: string, height: number): void => {
    const label = shorten(entry.label, labelWidth, pen.measurer(size, bold));
    const baseline = y + height * BASELINE_SHARE;
    pen.text(label, TOTALS_LEFT, baseline, { size, bold, color });
    pen.text(entry.value, RIGHT, baseline, { size, bold, color, align: 'right' });
    y += height;
  };
  for (const entry of rows.before) row(entry, TOTALS_SIZE, false, colors.text, TOTALS_LINE);
  pen.line(TOTALS_LEFT, RIGHT, y + 0.5, TOTAL_RULE, colors.totalRule);
  y += 1;
  row(rows.total, TOTAL_SIZE, true, colors.total, TOTAL_LINE);
  for (const entry of rows.after) row(entry, TOTALS_SIZE, false, colors.muted, TOTALS_LINE);

  let noteY = top;
  for (const lines of paragraphs) {
    lines.forEach((line, index) => {
      // The first line on the baseline of the first row of the totals.
      const baseline = noteY + TOTALS_LINE * BASELINE_SHARE + index * NOTES_LINE;
      pen.text(line, LEFT, baseline, { size: NOTES_SIZE, color: colors.muted });
    });
    noteY += lines.length * NOTES_LINE + NOTES_SPACE;
  }
  flow.y = Math.max(y, noteY);

  if (invoice.closing !== undefined) {
    flow.y += SPACE_AFTER;
    const lines = wrap(invoice.closing, CONTENT_WIDTH, pen.measurer(BODY_SIZE));
    flow.paragraph(lines, BODY_LINE, (line, baseline) => {
      pen.text(line, LEFT, baseline, { size: BODY_SIZE, color: colors.text });
    });
  }
}
