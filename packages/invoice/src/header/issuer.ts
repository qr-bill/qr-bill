/**
 * The details of the issuer on the first page: its name when a logo stands for it, its address, its contacts and its
 * UID. In the right column, aligned right, with the window on the left; under the letterhead with the window on the
 * right.
 *
 * @module
 */

import type { RenderContext, TextStyle } from '../drawing/drawing.types.js';
import { shorten, wrap } from '../drawing/text.js';
import { LEFT, RIGHT } from '../page/page.js';
import { countryName, streetLine, townLine } from '../parties/address.js';
import type { HeaderLine } from './header.types.js';

/** The details of the issuer: width, first baseline in each layout, line height, sizes. */
const ISSUER_WIDTH = 72;
const ISSUER_TOP_RIGHT_COLUMN = 18;
const ISSUER_TOP_UNDER_LETTERHEAD = 40;
const ISSUER_LINE = 3.8;
const ISSUER_SIZE = 8.5;
const ISSUER_NAME_SIZE = 9;

/** The lines of the details of the issuer: its name when a logo stands for it, its address and its contacts. */
function issuerLines(context: RenderContext): HeaderLine[] {
  const { pen, invoice, labels, foreign } = context;
  const { issuer } = invoice;
  const name =
    issuer.logo === undefined
      ? []
      : wrap(issuer.name, ISSUER_WIDTH, pen.measurer(ISSUER_NAME_SIZE, true), 2).map((text) => ({ text, bold: true }));
  const uid =
    issuer.uid === undefined ? [] : [issuer.vatRegistered ? `${issuer.uid} ${labels.vatNumberSuffix}` : issuer.uid];
  const others = [
    ...issuer.extraLines,
    streetLine(issuer),
    townLine(issuer),
    foreign ? countryName(issuer.country, invoice.language) : undefined,
    ...issuer.phones,
    issuer.email,
    issuer.contact,
    ...uid,
  ].filter((text) => text !== undefined);
  const measure = pen.measurer(ISSUER_SIZE);
  return [...name, ...others.map((text) => ({ text: shorten(text, ISSUER_WIDTH, measure), bold: false }))];
}

/**
 * Draws the details of the issuer: in the right column, aligned right, with the window on the left; under the
 * letterhead with the window on the right.
 *
 * @param context - The invoice being drawn.
 */
export function drawIssuer(context: RenderContext): void {
  const { pen, invoice, colors } = context;
  const left = invoice.addressWindow === 'right';
  const top = left ? ISSUER_TOP_UNDER_LETTERHEAD : ISSUER_TOP_RIGHT_COLUMN;
  issuerLines(context).forEach((line, index) => {
    const style: TextStyle = {
      size: line.bold ? ISSUER_NAME_SIZE : ISSUER_SIZE,
      bold: line.bold,
      color: colors.text,
      align: left ? 'left' : 'right',
    };
    pen.text(line.text, left ? LEFT : RIGHT, top + index * ISSUER_LINE, style);
  });
}
