/**
 * Rendering of a payment slip layout as SVG: a vector graphic at the real size, in millimetres, for browsers, for
 * documents that accept SVG, and as the reference rendering of the tests.
 *
 * @module
 */

import { MM_PER_PT } from '../layout/text.js';
import type { LayoutElement, QRBillLayout } from '../layout/layout.types.js';

/** The fonts the QR-bill allows (chapter 3.4), Liberation Sans first: the layout is measured with it. */
const FONT_FAMILY = 'Liberation Sans, Arial, Helvetica, sans-serif';

const COLORS = { black: '#000', white: '#fff' } as const;

/** Escapes the characters that have a meaning in XML. */
function escape(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Writes a number with at most four decimals. */
function number(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

/** Writes attributes, skipping the absent ones. */
function attributes(values: Record<string, string | undefined>): string {
  return Object.entries(values)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join('');
}

/** Renders one element. */
function element(item: LayoutElement): string {
  if (item.type === 'text') {
    const text = attributes({
      x: number(item.x),
      y: number(item.y),
      'font-size': number(item.fontSize * MM_PER_PT),
      'font-weight': item.fontWeight === 'bold' ? 'bold' : undefined,
    });
    return `<text${text}>${escape(item.text)}</text>`;
  }
  if ('fill' in item) return `<path${attributes({ d: item.d, fill: COLORS[item.fill] })}/>`;
  const stroke = attributes({
    d: item.d,
    fill: 'none',
    stroke: COLORS.black,
    'stroke-width': number(item.stroke.width * MM_PER_PT),
    'stroke-dasharray': item.stroke.dash?.map(number).join(' '),
  });
  return `<path${stroke}/>`;
}

/**
 * Renders a payment slip as an SVG document at its real size, on a white background.
 *
 * @param layout - The layout, see {@link layoutQRBill}.
 * @returns The SVG document, as text.
 * @example
 * ```ts
 * const svg = renderSVG(layoutQRBill(bill, { language: 'de' }));
 * // In a browser: element.innerHTML = svg; in Node: writeFileSync('qr-bill.svg', svg)
 * ```
 */
export function renderSVG(layout: QRBillLayout): string {
  const { x, y, width, height } = layout.bounds;
  const svg = attributes({
    xmlns: 'http://www.w3.org/2000/svg',
    width: `${number(width)}mm`,
    height: `${number(height)}mm`,
    viewBox: [x, y, width, height].map(number).join(' '),
    'font-family': FONT_FAMILY,
    fill: COLORS.black,
  });
  const background = attributes({
    x: number(x),
    y: number(y),
    width: number(width),
    height: number(height),
    fill: COLORS.white,
  });
  return [`<svg${svg}>`, `<rect${background}/>`, ...layout.elements.map(element), '</svg>'].join('\n');
}
