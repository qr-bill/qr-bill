/**
 * The mentions printed beside the totals: the ready-made ones the caller chose, then the free remarks.
 *
 * @module
 */

import type { RenderContext } from '../drawing/drawing.types.js';
import { fill } from '../labels/labels.js';

/**
 * The ready-made mentions chosen, in the language of the invoice, then the free remarks, each a paragraph.
 *
 * @param context - The invoice being drawn.
 * @returns The paragraphs, in the order they are printed.
 */
export function mentionTexts(context: RenderContext): string[] {
  const { invoice, labels } = context;
  const { mentions } = invoice;
  return [
    ...(mentions.notVatRegistered === true ? [labels.notVatRegistered] : []),
    ...(mentions.vatExcluded === true ? [labels.vatExcluded] : []),
    ...(mentions.paymentDays === undefined ? [] : [fill(labels.paymentDays, { days: mentions.paymentDays })]),
    ...(mentions.thanks === true ? [labels.thanks] : []),
    ...invoice.notes,
  ];
}
