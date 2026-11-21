/**
 * The flow of the content from page to page: blocks that go to a new page when they do not fit, and paragraphs that
 * continue on the next page line by line.
 *
 * @module
 */

import type { InvoiceDocument } from '../drawing/drawing.types.js';
import { CONTENT_BOTTOM, CONTINUED_TOP } from './page.js';

/** Where the baseline of a line sits under its top, as a share of the line height. */
const BASELINE_SHARE = 0.76;

/**
 * Where the next content goes: the current page and the height on it. A block that does not fit above
 * {@link CONTENT_BOTTOM} goes to a new page, which gets the short header of the following pages.
 */
export class Flow {
  /** The top of the next content on the current page. */
  y: number;
  /** The document. */
  private readonly doc: InvoiceDocument;
  /** Draws the header of a new page. */
  private readonly header: () => void;

  /**
   * @param doc - The document.
   * @param y - Where the content starts on the first page.
   * @param header - Draws the short header of the following pages.
   */
  constructor(doc: InvoiceDocument, y: number, header: () => void) {
    this.doc = doc;
    this.y = y;
    this.header = header;
  }

  /**
   * Makes room for a block: a new page when it does not fit under the current position.
   *
   * @param height - The height of the block.
   * @param bottom - The lowest point the block may reach; {@link CONTENT_BOTTOM} by default.
   * @returns Whether a page was added.
   */
  ensure(height: number, bottom: number = CONTENT_BOTTOM): boolean {
    if (this.y + height <= bottom) return false;
    const { page } = this.doc;
    this.doc.addPage({ size: [page.width, page.height], margins: page.margins });
    this.header();
    this.y = CONTINUED_TOP;
    return true;
  }

  /**
   * Draws lines one under the other from the current position, each going to a new page when it does not fit.
   * Afterwards the position is under the last line.
   *
   * @param lines - The lines, each fitting the width already.
   * @param lineHeight - The height of a line, in millimetres.
   * @param draw - Writes a line at its baseline.
   */
  paragraph(lines: readonly string[], lineHeight: number, draw: (line: string, baseline: number) => void): void {
    for (const line of lines) {
      this.ensure(lineHeight);
      draw(line, this.y + lineHeight * BASELINE_SHARE);
      this.y += lineHeight;
    }
  }
}
