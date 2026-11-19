/**
 * The information sections of the receipt and the payment part (SIX IG QR-bill v2.4, chapters 3.5.4 and 3.6.2):
 * blocks made of a heading and values, in a fixed order, one under the other; a block that is not in the Swiss QR
 * Code is left out and the next ones move up (style guide, page 15).
 *
 * @module
 */

import { formatIBAN } from '../account/iban.js';
import type { Address } from '../address/address.types.js';
import type { QRBill } from '../bill/bill.types.js';
import type { Labels } from '../labels/labels.types.js';
import { formatReference } from '../reference/reference.js';
import type { Size, TextStyle } from './dimensions.js';
import type { Box, LayoutElement } from './layout.types.js';
import { cornerMarks, text } from './shapes.js';
import { MM_PER_PT, ascent, descent, wrap } from './text.js';

/** A block of the information section: a heading, then either lines of values or a blank field. */
export type InformationBlock =
  | {
      /** The heading, in bold. */
      readonly heading: string;
      /** The values, one per line, already fitted to the width. */
      readonly lines: readonly string[];
    }
  | {
      /** The heading, in bold. */
      readonly heading: string;
      /** A blank field with corner marks, for the debtor to fill in by hand. */
      readonly blankField: Size;
    };

/** What goes into the information section, and how much of it. */
export interface InformationContent {
  /** Whether to print the street and the building number of the addresses (the receipt may leave them out). */
  readonly streets: boolean;
  /** Whether to print the additional information (never on the receipt, chapter 3.6). */
  readonly additionalInformation: boolean;
  /** The most lines of additional information, the last one shortened with an ellipsis when there are more. */
  readonly additionalInformationLines?: number | undefined;
}

/**
 * Writes the lines of an address: name, street and building number, then postal code and town, each on at most
 * two lines. The postal code of a foreign address, Liechtenstein included, is preceded by the country code, as in
 * "DE-78462 Konstanz" (chapter 3.5.4).
 *
 * @param address - The address.
 * @param width - The width available, in millimetres.
 * @param size - Font size, in points.
 * @param streets - Whether to print the street and the building number.
 * @returns The lines.
 */
export function addressLines(address: Address, width: number, size: number, streets: boolean): string[] {
  const font = { size, weight: 'regular' } as const;
  const street = [address.street, address.buildingNumber].filter((part) => part !== undefined).join(' ');
  const country = address.country === 'CH' ? '' : `${address.country}-`;
  return [
    ...wrap(address.name, width, font, 2),
    ...(streets && street !== '' ? wrap(street, width, font, 2) : []),
    ...wrap(`${country}${address.postalCode} ${address.town}`, width, font, 2),
  ];
}

/**
 * Builds the blocks of an information section, in the order of chapter 3.5.4: account and creditor, reference,
 * additional information, debtor.
 *
 * @param bill - The bill.
 * @param labels - The headings, in the language of the bill.
 * @param width - The width of the section, in millimetres.
 * @param style - The font sizes.
 * @param debtorField - Size of the blank field printed when the bill has no debtor.
 * @param content - What to print.
 * @returns The blocks.
 */
export function informationBlocks(
  bill: QRBill,
  labels: Labels,
  width: number,
  style: TextStyle,
  debtorField: Size,
  content: InformationContent,
): InformationBlock[] {
  const font = { size: style.value, weight: 'regular' } as const;
  const blocks: InformationBlock[] = [
    {
      heading: labels.accountPayableTo,
      lines: [formatIBAN(bill.creditor.account), ...addressLines(bill.creditor, width, style.value, content.streets)],
    },
  ];
  if (bill.reference !== undefined) {
    blocks.push({ heading: labels.reference, lines: [formatReference(bill.reference)] });
  }
  const additional = [bill.message, bill.billingInformation].filter((line) => line !== undefined).join('\n');
  if (content.additionalInformation && additional !== '') {
    const lines = wrap(additional, width, font, content.additionalInformationLines);
    blocks.push({ heading: labels.additionalInformation, lines });
  }
  blocks.push(
    bill.debtor === undefined
      ? { heading: labels.payableByNameAddress, blankField: debtorField }
      : { heading: labels.payableBy, lines: addressLines(bill.debtor, width, style.value, content.streets) },
  );
  return blocks;
}

/** Blocks placed in a section: their elements and the height they take. */
export interface PlacedBlocks {
  /** The elements to draw. */
  readonly elements: LayoutElement[];
  /** Height from the top of the section to the bottom of the last element, in millimetres. */
  readonly height: number;
}

/** Space between a heading and the blank field below it, in millimetres. */
const FIELD_GAP = 1;

/**
 * Places the blocks one under the other, from the top of the section: one line spacing between two baselines, and
 * a blank line between two blocks.
 *
 * @param blocks - The blocks, see {@link informationBlocks}.
 * @param box - The information section.
 * @param style - The font sizes and line spacing.
 * @returns The elements, and the height they take from the top of the section, in millimetres.
 */
export function flowBlocks(blocks: readonly InformationBlock[], box: Box, style: TextStyle): PlacedBlocks {
  const lineSpacing = style.lineSpacing * MM_PER_PT;
  const heading = { size: style.heading, weight: 'bold' } as const;
  const value = { size: style.value, weight: 'regular' } as const;
  const elements: LayoutElement[] = [];
  let baseline = box.y + ascent(style.heading) - lineSpacing;
  let bottom = box.y;
  for (const [index, block] of blocks.entries()) {
    // The first heading sits at the top of the section; the next ones after a blank line.
    baseline += index === 0 ? lineSpacing : 2 * lineSpacing;
    elements.push(text(box.x, baseline, block.heading, heading));
    bottom = baseline + descent(style.heading);
    if ('blankField' in block) {
      const field = { x: box.x, y: bottom + FIELD_GAP, ...block.blankField };
      elements.push(cornerMarks(field));
      bottom = field.y + field.height;
      baseline = bottom;
      continue;
    }
    for (const line of block.lines) {
      baseline += lineSpacing;
      elements.push(text(box.x, baseline, line, value));
      bottom = baseline + descent(style.value);
    }
  }
  return { elements, height: bottom - box.y };
}
