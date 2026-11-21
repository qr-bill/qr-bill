# The payment slip in a PDF: `@qr-bill/pdfkit`

`@qr-bill/pdfkit` draws the payment slip of a QR-bill (the receipt and the payment part) in a [PDFKit](https://pdfkit.org) document, exactly where the layout of `@qr-bill/core` puts every text and line, with its fonts embedded. Your application writes the rest of the document with PDFKit as usual.

## Install

```sh
npm install @qr-bill/core @qr-bill/pdfkit pdfkit
```

- **Node 22.12 or later.** The adapter reads its fonts from its package. It does not run in a browser yet: a jsPDF adapter is planned for that.
- **PDFKit 0.17 or later**, with or without `@types/pdfkit`: the adapter is typed by the methods it calls.

## The slip at the bottom of the last page

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

`createQRBill` throws a `QRBillValidationError` listing every problem when the data is not a valid QR-bill; `validateQRBill` returns them without throwing (see the [README](../README.md#example) of the repository).

### What `attachTo` does

- It needs the 105 mm of the slip at the bottom of the current page, plus what the cutting lines draw above it (1.3 mm for the scissors), below the text cursor (`doc.y`). Otherwise it adds a page of the same size and margins.
- The slip sits on the lower edge of the page, as the standard requires (chapter 3.1), and is centred: on A4 it spans the whole width. The margins of the page do not apply to it.
- Afterwards the text cursor is at the bottom of the page, so text written next goes to a new page. The current font of the document is Liberation Sans: select yours again before writing more text. The rest of the graphics state (colours, opacity, line style) is left as it was.
- It returns `{ newPage }`: whether it added a page.

| Option       | Values                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `language`   | `'de'`, `'fr'`, `'it'`, `'rm'` or `'en'`: the language of the headings of the slip. Required.                                          |
| `separators` | `'scissors'` (default): cutting lines with scissors; `'text'`: the instruction "Separate before paying in"; `'none'`: perforated paper |
| `fonts`      | `{ regular, bold }`: other font files, see [Fonts](#fonts)                                                                             |

A page narrower than 210 mm, or too low for the slip, throws a `RangeError`.

## A slip anywhere

`drawPaymentSlip(doc, layout, { x, y })` draws a slip laid out by `layoutQRBill` at a position of your choice, in points from the top left corner of the page, without checking the room left: for a page of its own (210 × 105 mm) or a layout of your own.

```ts
import { layoutQRBill } from '@qr-bill/core';
import { POINTS_PER_MM, drawPaymentSlip } from '@qr-bill/pdfkit';

const doc = new PDFDocument({ size: [210 * POINTS_PER_MM, 105 * POINTS_PER_MM], margin: 0 });
drawPaymentSlip(doc, layoutQRBill(bill, { language: 'de', separators: 'none' }), { x: 0, y: 0 });
```

`POINTS_PER_MM` converts millimetres, the unit of the layout, into points, the unit of PDFKit.

## Your own invoice above the slip

The body of the invoice is yours: PDFKit writes it, over as many pages as it needs, and `attachTo` adds the slip at the end.

- **Write the body, then call `attachTo` once.** It puts the slip under the text cursor if there is room on the last page, on a new page otherwise. Leave `doc.y` where the body ends.
- **Use the fonts of the slip for the body** with `registerFonts` (from version 0.2.0). They are then embedded once, with the characters of both, and the extended character set of the standard (ł, ő, ș…) prints in the body too.

  ```ts
  import { registerFonts } from '@qr-bill/pdfkit';

  const fonts = registerFonts(doc); // the names to select them with
  doc.font(fonts.bold).fontSize(16).text('Invoice 2026-042');
  doc.font(fonts.regular).fontSize(10).text('Thank you for your order.');
  ```

- **Select your font again** after `attachTo` if you write anything else, for instance a page number on every page.

For a complete invoice from data, letterhead, lines, VAT and totals included, see [`@qr-bill/invoice`](invoice.md), which is built on this adapter.

## Fonts

The package ships Liberation Sans Regular and Bold 2.1.5, unmodified, under the [SIL Open Font License 1.1](../packages/pdfkit/fonts/LICENSE). It is one of the fonts the QR-bill allows (chapter 3.4), metric-compatible with Arial. The core measures every text with its widths, so that lines are broken and shortened the same way in every runtime; kerning and ligatures are turned off for the same reason. Only the characters used are embedded: a PDF holding the slip alone weighs 28 KB.

To embed other files, pass them as `fonts: { regular, bold }` (`Uint8Array`, TrueType or OpenType). They must have the widths of Liberation Sans, as Arial does: the layout is not measured again.

## What the tests check

- Every text of the six examples of the standard, in the five languages, is read back from the PDF by pdfjs at its position to a hundredth of a point, in its font, size and measured width.
- The lines and the QR code are compared pixel by pixel with the SVG renderer of the core.
- The Swiss QR Code is read back by ZXing from the PDF rendered as pixels.
- PDFKit 0.17.0, the oldest version supported, draws the same slip as the latest.

The design and the decisions behind the adapter are in [architecture.md](architecture.md).
