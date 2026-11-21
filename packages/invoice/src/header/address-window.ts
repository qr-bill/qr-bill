/**
 * The address of the recipient, in the window of the envelope: on the left by default, on the right as an option.
 * As Swiss Post asks, the window holds a single line with the sender, separated from the address by a rule, at
 * least 3 mm above it, and nothing frames the address.
 *
 * @module
 */

import type { RenderContext } from '../drawing/drawing.types.js';
import { shorten, wrap } from '../drawing/text.js';
import { RIGHT } from '../page/page.js';
import { countryName, streetLine, townLine } from '../parties/address.js';
import type { HeaderLine } from './header.types.js';

/**
 * The window: left edge and width of its texts on the left and on the right, top; the sender line, its rule and the
 * address under it. On the right, the texts end at the right edge of the content.
 */
const WINDOW_LEFT = { x: 25, width: 85 } as const;
const WINDOW_RIGHT = { x: 118, width: RIGHT - 118 } as const;
const WINDOW_TOP = 47;
const SENDER_SIZE = 7;
const ADDRESS_SIZE = 10;
const ADDRESS_LINE = 4.4;

/**
 * Draws the recipient in the window of the envelope: the sender on one line, a rule, then the address, its name in
 * bold on two lines at most, its country when it is not the issuer's.
 *
 * @param context - The invoice being drawn.
 */
export function drawAddressWindow(context: RenderContext): void {
  const { pen, invoice, colors, foreign } = context;
  const { issuer, recipient, language } = invoice;
  const { x, width } = invoice.addressWindow === 'right' ? WINDOW_RIGHT : WINDOW_LEFT;
  const sender = [
    issuer.name,
    streetLine(issuer),
    townLine(issuer),
    foreign ? countryName(issuer.country, language) : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(', ');
  pen.text(shorten(sender, width, pen.measurer(SENDER_SIZE)), x, WINDOW_TOP + 2.5, {
    size: SENDER_SIZE,
    color: colors.muted,
  });
  pen.line(x, x + width, WINDOW_TOP + 4, 0.3, colors.muted);

  const measure = pen.measurer(ADDRESS_SIZE);
  const plain = (text: string | undefined): HeaderLine[] =>
    text === undefined ? [] : [{ text: shorten(text, width, measure), bold: false }];
  const lines: HeaderLine[] = [
    ...plain(recipient.salutation),
    ...wrap(recipient.name, width, pen.measurer(ADDRESS_SIZE, true), 2).map((text) => ({ text, bold: true })),
    ...recipient.extraLines.flatMap(plain),
    ...plain(streetLine(recipient)),
    ...plain(townLine(recipient)),
    ...plain(foreign ? countryName(recipient.country, language) : undefined),
  ];
  lines.forEach((line, index) => {
    pen.text(line.text, x, WINDOW_TOP + 11 + index * ADDRESS_LINE, {
      size: ADDRESS_SIZE,
      bold: line.bold,
      color: colors.text,
    });
  });
}
