// Helpers of the layout tests: the bills of the SIX examples, the sections of the style guide, and the box a text
// takes on the slip.
import { readFileSync } from 'node:fs';
import type { Box, QRBill, QRBillInput, QRBillLayout, TextElement } from '../../src/index.js';
import { createQRBill } from '../../src/index.js';
import {
  FURTHER_INFORMATION,
  PAYMENT_PART_AMOUNT,
  PAYMENT_PART_INFORMATION,
  PAYMENT_PART_TITLE,
  RECEIPT_ACCEPTANCE_POINT,
  RECEIPT_AMOUNT,
  RECEIPT_INFORMATION,
  RECEIPT_TITLE,
} from '../../src/layout/dimensions.js';
import { ascent, descent, textWidth } from '../../src/layout/text.js';

const { examples } = JSON.parse(
  readFileSync(new URL('../../../../conformance/six-ig-v2.4-examples.json', import.meta.url), 'utf8'),
) as { examples: { id: string; input: QRBillInput }[] };

/** The six examples of Annex A, as bills. */
export const SIX_BILLS: readonly { id: string; bill: QRBill }[] = examples.map(({ id, input }) => ({
  id,
  bill: createQRBill(input),
}));

/** The sections of the style guide (page 6) that hold text. */
export const TEXT_SECTIONS: readonly Box[] = [
  RECEIPT_TITLE,
  RECEIPT_INFORMATION,
  RECEIPT_AMOUNT,
  RECEIPT_ACCEPTANCE_POINT,
  PAYMENT_PART_TITLE,
  PAYMENT_PART_AMOUNT,
  PAYMENT_PART_INFORMATION,
  FURTHER_INFORMATION,
];

/** The box a line of text takes: from its left end to its width, from its ascent to its descent. */
export function textBox(element: TextElement): Box {
  const top = element.y - ascent(element.fontSize);
  return {
    x: element.x,
    y: top,
    width: textWidth(element.text, element.fontSize, element.fontWeight),
    height: element.y + descent(element.fontSize) - top,
  };
}

/** Whether a box lies inside another one, to a micrometre. */
export function inside(box: Box, container: Box): boolean {
  const tolerance = 0.001;
  return (
    box.x >= container.x - tolerance &&
    box.y >= container.y - tolerance &&
    box.x + box.width <= container.x + container.width + tolerance &&
    box.y + box.height <= container.y + container.height + tolerance
  );
}

/** The text elements of a layout. */
export function texts(layout: QRBillLayout): TextElement[] {
  return layout.elements.filter((element): element is TextElement => element.type === 'text');
}

/** The texts of a layout that lie in a section. */
export function textsIn(layout: QRBillLayout, section: Box): string[] {
  return texts(layout)
    .filter((element) => inside(textBox(element), section))
    .map((element) => element.text);
}

/** The texts that lie outside every section of the slip: what overflows. */
export function overflowing(layout: QRBillLayout): string[] {
  return texts(layout)
    .filter((element) => element.y > 0)
    .filter((element) => !TEXT_SECTIONS.some((section) => inside(textBox(element), section)))
    .map((element) => element.text);
}
