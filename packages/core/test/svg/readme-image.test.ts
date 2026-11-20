// The image of the README is what the code draws, not a picture made by hand: example 2 of the standard in English,
// rendered by renderSVG. After a change of the layout or of the renderer this test fails; regenerate the image with
// `pnpm test -u`, look at it, and commit it with the change.
import { describe, expect, it } from 'vitest';
import { layoutQRBill, renderSVG } from '../../src/index.js';
import { SIX_BILLS } from '../layout/helpers.js';

describe('image of the README', () => {
  it('is the SVG of example 2 of the standard, in English', async () => {
    const example = SIX_BILLS.find(({ id }) => id === 'six-v2.4-example-2');
    expect(example).toBeDefined();
    if (example === undefined) return;
    await expect(renderSVG(layoutQRBill(example.bill, { language: 'en' }))).toMatchFileSnapshot(
      '../../../../docs/assets/payment-slip.svg',
    );
  });
});
