<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/qr-bill/qr-bill/main/docs/assets/logo-white.svg" />
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/qr-bill/qr-bill/main/docs/assets/logo-black.svg" />
    <img src="https://raw.githubusercontent.com/qr-bill/qr-bill/main/docs/assets/logo-auto.svg" alt="qr-bill" height="72" />
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/qr-bill/qr-bill/actions/workflows/ci.yml"><img src="https://github.com/qr-bill/qr-bill/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@qr-bill/pdfkit"><img src="https://img.shields.io/npm/v/@qr-bill/pdfkit" alt="npm version of @qr-bill/pdfkit" /></a>
  <a href="https://github.com/qr-bill/qr-bill/blob/main/vitest.config.ts"><img src="https://img.shields.io/badge/coverage-100%25-brightgreen" alt="Coverage: 100 %" /></a>
  <a href="https://github.com/qr-bill/qr-bill/blob/main/LICENSE"><img src="https://img.shields.io/github/license/qr-bill/qr-bill" alt="License: MIT" /></a>
</p>

The Swiss QR-bill payment slip (receipt and payment part) in a [PDFKit](https://pdfkit.org) document, following the [SIX Implementation Guidelines v2.4](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html) and their style guide. Built on [`@qr-bill/core`](https://github.com/qr-bill/qr-bill/tree/main/packages/core).

<p align="center">
  <img src="https://raw.githubusercontent.com/qr-bill/qr-bill/main/docs/assets/payment-slip.svg" alt="Payment slip of a QR-bill: the receipt on the left, the payment part with the Swiss QR Code on the right" width="800" />
</p>

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

## Documentation

The complete documentation is in [docs/pdfkit.md](https://github.com/qr-bill/qr-bill/blob/main/docs/pdfkit.md):

- [what `attachTo` does](https://github.com/qr-bill/qr-bill/blob/main/docs/pdfkit.md#what-attachto-does), and its options;
- [a slip anywhere](https://github.com/qr-bill/qr-bill/blob/main/docs/pdfkit.md#a-slip-anywhere) with `drawPaymentSlip`;
- [your own invoice above the slip](https://github.com/qr-bill/qr-bill/blob/main/docs/pdfkit.md#your-own-invoice-above-the-slip), in the same fonts with `registerFonts`;
- [the fonts](https://github.com/qr-bill/qr-bill/blob/main/docs/pdfkit.md#fonts), and how to embed others.

## License

MIT © Olivier Azevedo — maintained by [Claine](https://claine.ai). The fonts in `fonts/` are under the SIL Open Font License 1.1.
