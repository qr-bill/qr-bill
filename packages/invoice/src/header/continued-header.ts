/**
 * The short header of the pages after the first: the name of the issuer on the left, the title and number of the
 * invoice on the right.
 *
 * @module
 */

import type { RenderContext } from '../drawing/drawing.types.js';
import { shorten } from '../drawing/text.js';
import { CONTENT_WIDTH, LEFT, RIGHT } from '../page/page.js';

/** Baseline and size of its texts. */
const CONTINUED_BASELINE = 18;
const CONTINUED_SIZE = 9;

/**
 * Draws the short header of the pages after the first: the name of the issuer on the left, the title and number of
 * the invoice on the right.
 *
 * @param context - The invoice being drawn.
 */
export function drawContinuedHeader(context: RenderContext): void {
  const { pen, invoice, colors } = context;
  const half = CONTENT_WIDTH / 2 - 2;
  const name = shorten(invoice.issuer.name, half, pen.measurer(CONTINUED_SIZE, true));
  pen.text(name, LEFT, CONTINUED_BASELINE, { size: CONTINUED_SIZE, bold: true, color: colors.text });
  const title = [invoice.title, invoice.number].filter((part) => part !== undefined).join(' ');
  pen.text(shorten(title, half, pen.measurer(CONTINUED_SIZE)), RIGHT, CONTINUED_BASELINE, {
    size: CONTINUED_SIZE,
    color: colors.muted,
    align: 'right',
  });
}
