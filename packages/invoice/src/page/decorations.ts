/**
 * What every page carries once the whole invoice is drawn and the number of pages known: the bar of colour along
 * the top (theme `modern`), and the number of the page when there are several.
 *
 * @module
 */

import { POINTS_PER_MM } from '@qr-bill/pdfkit';
import type { RenderContext } from '../drawing/drawing.types.js';
import { fill } from '../labels/labels.js';
import { RIGHT } from './page.js';

/** The height of the bar along the top of each page. */
const TOP_BAR_HEIGHT = 3;
/** The number of the page: baseline and size. */
const PAGE_NUMBER_BASELINE = 10;
const PAGE_NUMBER_SIZE = 7.5;

/**
 * Draws the bar of colour and the number of each page, going back to every page of the document.
 *
 * @param context - The invoice drawn, whose document keeps its pages in memory (`bufferPages`).
 */
export function drawPageDecorations(context: RenderContext): void {
  const { pen, colors, labels } = context;
  const { doc } = pen;
  const { count } = doc.bufferedPageRange();
  for (let page = 0; page < count; page++) {
    doc.switchToPage(page);
    if (colors.topBar !== undefined) pen.rect(0, 0, doc.page.width / POINTS_PER_MM, TOP_BAR_HEIGHT, colors.topBar);
    if (count > 1) {
      const number = fill(labels.page, { page: page + 1, pages: count });
      pen.text(number, RIGHT, PAGE_NUMBER_BASELINE, { size: PAGE_NUMBER_SIZE, color: colors.muted, align: 'right' });
    }
  }
}
