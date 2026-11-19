/**
 * The shapes of the payment slip, as layout elements: text, corner marks of the blank fields, the QR code, the Swiss
 * cross and the scissors symbol.
 *
 * @module
 */

import type { QRCode } from '../qr-code/qr-code.types.js';
import { CORNER_MARK_LENGTH, CORNER_MARK_THICKNESS, SWISS_CROSS_SIZE } from './dimensions.js';
import type { Box, FilledPath, StrokedPath, TextElement } from './layout.types.js';
import type { Font } from './text.js';

/** Writes a length for path data: at most four decimals, no trailing zeros. */
export function mm(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

/**
 * Creates a line of text.
 *
 * @param x - Left end of the baseline, in millimetres.
 * @param y - Height of the baseline, in millimetres.
 * @param text - The text.
 * @param font - Its font.
 * @returns The text element.
 */
export function text(x: number, y: number, text: string, font: Font): TextElement {
  return { type: 'text', x, y, text, fontSize: font.size, fontWeight: font.weight };
}

/** Path data of a rectangle. */
function rectangle(x: number, y: number, width: number, height: number): string {
  return `M${mm(x)} ${mm(y)}H${mm(x + width)}V${mm(y + height)}H${mm(x)}Z`;
}

/**
 * Draws the corner marks of a blank field: four right angles of 3 mm, 0.75 pt thick (style guide, page 7).
 *
 * @param box - The blank field.
 * @returns A stroked path.
 */
export function cornerMarks(box: Box): StrokedPath {
  const { x, y, width, height } = box;
  const right = x + width;
  const bottom = y + height;
  const l = CORNER_MARK_LENGTH;
  const d = [
    `M${mm(x)} ${mm(y + l)}V${mm(y)}H${mm(x + l)}`,
    `M${mm(right - l)} ${mm(y)}H${mm(right)}V${mm(y + l)}`,
    `M${mm(right)} ${mm(bottom - l)}V${mm(bottom)}H${mm(right - l)}`,
    `M${mm(x + l)} ${mm(bottom)}H${mm(x)}V${mm(bottom - l)}`,
  ].join('');
  return { type: 'path', d, stroke: { width: CORNER_MARK_THICKNESS } };
}

/**
 * Draws the dark modules of a QR code, scaled to a box, as one filled path: one rectangle per run of dark modules in
 * a row. A single path leaves no hairline between neighbouring modules, which separate shapes can show in some PDF
 * viewers.
 *
 * @param qrCode - The QR code.
 * @param box - Where to draw it: 46 × 46 mm for the Swiss QR Code.
 * @returns A filled path.
 */
export function qrCodePath(qrCode: QRCode, box: Box): FilledPath {
  const module = box.width / qrCode.size;
  const parts: string[] = [];
  for (const [row, modules] of qrCode.modules.entries()) {
    let start = -1;
    for (let column = 0; column <= qrCode.size; column++) {
      const dark = modules[column] === true;
      if (dark && start < 0) start = column;
      if (!dark && start >= 0) {
        parts.push(rectangle(box.x + start * module, box.y + row * module, (column - start) * module, module));
        start = -1;
      }
    }
  }
  return { type: 'path', d: parts.join(''), fill: 'black' };
}

/**
 * Draws the Swiss cross printed over the centre of the Swiss QR Code (chapter 6.4.2): a white cross on a black
 * square with a white border, 7 × 7 mm. The cross has the proportions of the Swiss coat of arms: arms one sixth
 * longer than wide, the cross spanning 20/32 of the square.
 *
 * @param centerX - Horizontal centre, in millimetres.
 * @param centerY - Vertical centre, in millimetres.
 * @returns The white border, the black square and the white cross, in drawing order.
 */
export function swissCross(centerX: number, centerY: number): FilledPath[] {
  const border = 0.5;
  const square = SWISS_CROSS_SIZE - 2 * border;
  const arm = (square * 6) / 32;
  const span = (square * 20) / 32;
  const half = SWISS_CROSS_SIZE / 2;
  return [
    { type: 'path', d: rectangle(centerX - half, centerY - half, SWISS_CROSS_SIZE, SWISS_CROSS_SIZE), fill: 'white' },
    { type: 'path', d: rectangle(centerX - square / 2, centerY - square / 2, square, square), fill: 'black' },
    {
      type: 'path',
      d:
        rectangle(centerX - span / 2, centerY - arm / 2, span, arm) +
        rectangle(centerX - arm / 2, centerY - span / 2, arm, span),
      fill: 'white',
    },
  ];
}

/** Control point distance of a cubic Bézier curve that approximates a quarter circle, relative to the radius. */
const KAPPA = 0.5523;

/**
 * Draws a scissors symbol centred on a point: two round handles and two crossing blades, about 4.6 × 2.4 mm.
 *
 * @param centerX - Horizontal centre, in millimetres.
 * @param centerY - Vertical centre, in millimetres.
 * @param direction - Where the blades point: `right` on a horizontal line, `down` on a vertical one.
 * @returns A stroked path.
 */
export function scissors(centerX: number, centerY: number, direction: 'right' | 'down'): StrokedPath {
  // Coordinates in a frame where the blades point to +u; turned a quarter clockwise when they point down.
  const at = (u: number, v: number): string =>
    direction === 'right' ? `${mm(centerX + u)} ${mm(centerY + v)}` : `${mm(centerX - v)} ${mm(centerY + u)}`;
  const circle = (u: number, v: number, r: number): string => {
    const k = r * KAPPA;
    return [
      `M${at(u + r, v)}`,
      `C${at(u + r, v + k)} ${at(u + k, v + r)} ${at(u, v + r)}`,
      `C${at(u - k, v + r)} ${at(u - r, v + k)} ${at(u - r, v)}`,
      `C${at(u - r, v - k)} ${at(u - k, v - r)} ${at(u, v - r)}`,
      `C${at(u + k, v - r)} ${at(u + r, v - k)} ${at(u + r, v)}Z`,
    ].join('');
  };
  const d = [
    circle(-1.7, -0.65, 0.55),
    circle(-1.7, 0.65, 0.55),
    `M${at(-1.2, -0.35)}L${at(2.3, 0.5)}`,
    `M${at(-1.2, 0.35)}L${at(2.3, -0.5)}`,
  ].join('');
  return { type: 'path', d, stroke: { width: 0.5 } };
}
