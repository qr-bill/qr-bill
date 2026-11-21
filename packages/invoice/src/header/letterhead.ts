/**
 * The letterhead, in the top left corner of the first page: the logo, or the name of the issuer in large type.
 *
 * @module
 */

import type { RenderContext } from '../drawing/drawing.types.js';
import { wrap } from '../drawing/text.js';
import { InvoiceValidationError } from '../invoice/errors.js';
import { LEFT } from '../page/page.js';

/** The box of the logo, whose proportions are kept. */
const LOGO = { x: LEFT, y: 15, width: 50, height: 18 } as const;
/**
 * The name of the issuer, without a logo: the sizes tried until it fits on two lines, the smallest one, shortened
 * when even it does not fit, and the width.
 */
const LETTERHEAD_SIZES = [16, 14];
const LETTERHEAD_SMALLEST_SIZE = 12;
const LETTERHEAD_WIDTH = 95;

/**
 * Draws the logo, or the name of the issuer in large type: on two lines at most, in a smaller size when needed,
 * shortened with "…" as a last resort.
 *
 * @param context - The invoice being drawn.
 * @throws {InvoiceValidationError} When the logo is not a PNG or JPEG file PDFKit can read.
 */
export function drawLetterhead(context: RenderContext): void {
  const { pen, invoice, colors } = context;
  const { logo, name } = invoice.issuer;
  if (logo !== undefined) {
    try {
      pen.image(logo.bytes, LOGO.x, LOGO.y, LOGO.width, LOGO.height);
    } catch (error) {
      throw new InvoiceValidationError([
        {
          code: 'unsupported_logo',
          path: ['issuer', 'logo'],
          message: `The logo could not be read (${String(error)})`,
        },
      ]);
    }
    return;
  }
  const size =
    LETTERHEAD_SIZES.find((candidate) => wrap(name, LETTERHEAD_WIDTH, pen.measurer(candidate, true)).length <= 2) ??
    LETTERHEAD_SMALLEST_SIZE;
  const lineHeight = size * 0.41;
  wrap(name, LETTERHEAD_WIDTH, pen.measurer(size, true), 2).forEach((line, index) => {
    pen.text(line, LEFT, LOGO.y + size * 0.32 + index * lineHeight, { size, bold: true, color: colors.title });
  });
}
