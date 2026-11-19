/**
 * Types of the layout of the payment slip: the receipt and the payment part, as positioned elements in millimetres.
 *
 * @module
 */

import type { Language } from '../labels/labels.types.js';

/** A rectangle, in millimetres from the top left corner of the slip. */
export interface Box {
  /** Left edge. */
  readonly x: number;
  /** Top edge. */
  readonly y: number;
  /** Width. */
  readonly width: number;
  /** Height. */
  readonly height: number;
}

/** Weight of a text: regular or bold, the only two the QR-bill uses (chapter 3.4). */
export type FontWeight = 'regular' | 'bold';

/** A line of text, in black, set in Liberation Sans or a metric-compatible font (Arial, Helvetica). */
export interface TextElement {
  /** Kind of element. */
  readonly type: 'text';
  /** Left end of the baseline, in millimetres. */
  readonly x: number;
  /** Height of the baseline, in millimetres. */
  readonly y: number;
  /** The text, on one line. */
  readonly text: string;
  /** Font size, in points. */
  readonly fontSize: number;
  /** Font weight. */
  readonly fontWeight: FontWeight;
}

/**
 * A shape described by SVG path data in millimetres, with absolute commands only: `M`, `L`, `H`, `V`, `C` and `Z`.
 * It is either filled ({@link FilledPath}) or stroked ({@link StrokedPath}).
 */
export type PathElement = FilledPath | StrokedPath;

/** A filled shape: the QR code, the Swiss cross. */
export interface FilledPath {
  /** Kind of element. */
  readonly type: 'path';
  /** SVG path data, in millimetres. */
  readonly d: string;
  /** Fill color. */
  readonly fill: 'black' | 'white';
}

/** A stroked shape, in black: corner marks, cutting lines, scissors. */
export interface StrokedPath {
  /** Kind of element. */
  readonly type: 'path';
  /** SVG path data, in millimetres. */
  readonly d: string;
  /** The outline. */
  readonly stroke: Stroke;
}

/** The outline of a stroked path, always black. */
export interface Stroke {
  /** Line thickness, in points. */
  readonly width: number;
  /** Lengths of the dashes and the gaps, in millimetres; absent for a solid line. */
  readonly dash?: readonly number[];
}

/** An element of the slip: renderers only have to draw these two kinds. */
export type LayoutElement = TextElement | PathElement;

/**
 * How the cutting lines are marked, for a slip sent as a PDF document (chapter 3.7). A slip printed on perforated
 * paper needs none.
 *
 * - `scissors`: dashed lines above the slip and between the receipt and the payment part, with a scissors symbol.
 * - `text`: the same lines, with the instruction "Separate before paying in" above the slip instead of the symbol.
 * - `none`: no line, for perforated paper.
 */
export type Separators = 'scissors' | 'text' | 'none';

/** Options of {@link layoutQRBill}. */
export interface LayoutOptions {
  /** Language of the headings (chapter 3.2). */
  readonly language: Language;
  /** How the cutting lines are marked. Default: `scissors`. */
  readonly separators?: Separators;
}

/** The layout of a payment slip: the receipt and the payment part, 210 × 105 mm. */
export interface QRBillLayout {
  /** Width of the slip: 210 mm, the width of an A4 page. */
  readonly width: number;
  /** Height of the slip: 105 mm. */
  readonly height: number;
  /**
   * The area covered by the elements. It is the slip, extended above it when the separators reach out of it (the
   * scissors on the top line, or the instruction printed above the line).
   */
  readonly bounds: Box;
  /** The elements to draw, in order; later elements are drawn over earlier ones. */
  readonly elements: readonly LayoutElement[];
}
