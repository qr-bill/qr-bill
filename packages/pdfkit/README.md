<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qr-bill/qr-bill/main/docs/assets/logo-white.svg" />
    <img src="https://raw.githubusercontent.com/qr-bill/qr-bill/main/docs/assets/logo-black.svg" alt="qr-bill" height="72" />
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/qr-bill/qr-bill/actions/workflows/ci.yml"><img src="https://github.com/qr-bill/qr-bill/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/qr-bill/qr-bill/blob/main/vitest.config.ts"><img src="https://img.shields.io/badge/coverage-100%25-brightgreen" alt="Coverage: 100 %" /></a>
  <a href="https://github.com/qr-bill/qr-bill/blob/main/LICENSE"><img src="https://img.shields.io/github/license/qr-bill/qr-bill" alt="License: MIT" /></a>
</p>

The Swiss QR-bill payment slip (receipt and payment part) in a [PDFKit](https://pdfkit.org) document, following the [SIX Implementation Guidelines v2.4](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html) and their style guide. Built on [`@qr-bill/core`](https://github.com/qr-bill/qr-bill/tree/main/packages/core).

<!-- release-blocker: remove this banner and this comment before the first npm release -->

> **Status: work in progress, not published yet.**

- **One call.** `attachTo(doc, bill, { language })` adds the slip at the bottom of the last page, or on a new page when the invoice leaves no room for it.
- **Exactly the layout of the core.** Every text and line is drawn where `layoutQRBill` puts it; the tests read the PDF back and check each text to a hundredth of a point, in the six examples of the standard and the five languages.
- **Fonts included.** Liberation Sans, metric-compatible with Arial and allowed by the standard, is embedded with only the characters used (a PDF holding the slip alone weighs 28 KB), so the PDF looks the same everywhere and the extended character set of the standard (ł, ő, ș…) prints correctly.
- **Scannable.** The tests render the PDF as pixels and read the Swiss QR Code back with ZXing.
- **No type package needed.** Works with PDFKit 0.17 and later, with or without `@types/pdfkit`.

## Install

```sh
npm install @qr-bill/core @qr-bill/pdfkit pdfkit
```

Node 22.12 or later: the adapter reads its fonts from the package.

## Example

```ts
import { createWriteStream } from 'node:fs';
import PDFDocument from 'pdfkit';
import { createQRBill } from '@qr-bill/core';
import { attachTo } from '@qr-bill/pdfkit';

const bill = createQRBill({
  currency: 'CHF',
  amount: '1949.75',
  creditor: {
    account: 'CH58 0079 1123 0008 8901 2',
    name: 'Max Muster & Söhne',
    street: 'Musterstrasse',
    buildingNumber: '123',
    postalCode: '8000',
    town: 'Seldwyla',
    country: 'CH',
  },
  message: 'Order from 15.10.2020',
});

const doc = new PDFDocument({ size: 'A4' });
doc.pipe(createWriteStream('invoice.pdf'));
doc.text('Invoice 2026-11'); // the body of your invoice, on as many pages as needed

attachTo(doc, bill, { language: 'fr' }); // { newPage: false }, or true when a page was added
doc.end();
```

### What `attachTo` does

- It needs the 105 mm of the slip at the bottom of the current page, plus what the cutting lines draw above it (1.3 mm for the scissors), below the text cursor (`doc.y`). Otherwise it adds a page of the same size and margins.
- The slip sits on the lower edge of the page, as the standard requires, and is centred: on A4 it spans the whole width. A page narrower than 210 mm throws a `RangeError`.
- Afterwards the text cursor is at the bottom of the page, so text written next goes to a new page. The current font of the document is Liberation Sans: select yours again before writing more text. The rest of the graphics state (colors, opacity, line style) is left as it was.
- Options: `language` (`'de'`, `'fr'`, `'it'`, `'rm'` or `'en'`), `separators` (`'scissors'` by default, `'text'` for the instruction "Separate before paying in", `'none'` for perforated paper) and `fonts`.

### A slip anywhere

`drawPaymentSlip(doc, layout, { x, y })` draws a slip laid out by `layoutQRBill` at a position of your choice, in points, without checking the room left: for a page of its own (210 × 105 mm) or a layout of your own.

```ts
import { layoutQRBill } from '@qr-bill/core';
import { POINTS_PER_MM, drawPaymentSlip } from '@qr-bill/pdfkit';

const doc = new PDFDocument({ size: [210 * POINTS_PER_MM, 105 * POINTS_PER_MM], margin: 0 });
drawPaymentSlip(doc, layoutQRBill(bill, { language: 'de', separators: 'none' }), { x: 0, y: 0 });
```

## Fonts

The package ships Liberation Sans Regular and Bold 2.1.5, unmodified, under the [SIL Open Font License 1.1](fonts/LICENSE). The core measures every text with the widths of this font, so that lines are broken and shortened the same way in every runtime; kerning and ligatures are turned off for the same reason.

To embed other files, pass them as `fonts: { regular, bold }` (`Uint8Array`, TrueType or OpenType). They must have the widths of Liberation Sans, as Arial does: the layout is not measured again.

## License

MIT © Olivier Azevedo — maintained by [Claine](https://claine.ai). The fonts in `fonts/` are under the SIL Open Font License 1.1.
