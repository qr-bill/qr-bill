/**
 * The cutting lines of a payment slip sent as a PDF document (SIX IG QR-bill v2.4, chapter 3.7): a line above the
 * slip and a line between the receipt and the payment part, each with a scissors symbol, or the instruction
 * "Separate before paying in" above the slip.
 *
 * @module
 */

import type { Labels } from '../labels/labels.types.js';
import { PAYMENT_PART, SEPARATOR_DASH, SEPARATOR_TEXT_FONT_SIZE, SEPARATOR_THICKNESS, SLIP } from './dimensions.js';
import type { LayoutElement, Separators } from './layout.types.js';
import { mm, scissors, text } from './shapes.js';
import { ascent, descent, textWidth } from './text.js';

/** Distance between the scissors and the start of the line they sit on, in millimetres. */
const SCISSORS_OFFSET = 8;

/** Half the height of the scissors symbol, which sits across the top line: the part above the slip. */
const SCISSORS_HALF_HEIGHT = 1.3;

/** Space between the instruction and the line below it, in millimetres. */
const TEXT_GAP = 1;

/** The cutting lines: their elements, and how high they reach. */
export interface SeparatorsLayout {
  /** The elements to draw. */
  readonly elements: LayoutElement[];
  /** Height of the topmost point, in millimetres: 0, or negative when the elements reach above the slip. */
  readonly top: number;
}

/**
 * Lays out the cutting lines.
 *
 * @param separators - How to mark them.
 * @param labels - The texts, in the language of the bill.
 * @returns The elements and the height of their topmost point.
 */
export function layoutSeparators(separators: Separators, labels: Labels): SeparatorsLayout {
  if (separators === 'none') return { elements: [], top: 0 };
  const stroke = { width: SEPARATOR_THICKNESS, dash: SEPARATOR_DASH };
  const x = PAYMENT_PART.x;
  const lines: LayoutElement[] = [
    { type: 'path', d: `M0 0H${mm(SLIP.width)}`, stroke },
    { type: 'path', d: `M${mm(x)} 0V${mm(SLIP.height)}`, stroke },
  ];
  if (separators === 'scissors') {
    return {
      elements: [...lines, scissors(SCISSORS_OFFSET, 0, 'right'), scissors(x, SCISSORS_OFFSET, 'down')],
      top: -SCISSORS_HALF_HEIGHT,
    };
  }
  // The instruction goes above the line, centred over the payment part, outside it (chapter 3.7).
  const size = SEPARATOR_TEXT_FONT_SIZE;
  const width = textWidth(labels.separateBeforePayingIn, size, 'regular');
  const baseline = -TEXT_GAP - descent(size);
  return {
    elements: [
      ...lines,
      text(x + (PAYMENT_PART.width - width) / 2, baseline, labels.separateBeforePayingIn, { size, weight: 'regular' }),
    ],
    top: baseline - ascent(size),
  };
}
