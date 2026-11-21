# @qr-bill/pdfkit

## 0.2.0

### Minor Changes

- 2e9213a: `registerFonts(doc, fonts?)` registers the fonts of the payment slip in a PDFKit document and returns their names, so that the rest of the document can be written in the same fonts: they are embedded once.

### Patch Changes

- cd6724c: The logo at the top of the README is readable on a dark background, on npm too.
- e378d1d: The README is shorter and links to the complete documentation of the adapter, `docs/pdfkit.md`: `attachTo`, `drawPaymentSlip`, `registerFonts`, the fonts, and how to write your own invoice above the slip.
- Updated dependencies [cd6724c]
- Updated dependencies [e378d1d]
  - @qr-bill/core@0.1.1

## 0.1.0

### Minor Changes

- 8930f94: First version of the PDFKit adapter. `attachTo(doc, bill, { language })` adds the payment slip at the bottom of the last page of a PDFKit document, or on a new page when the invoice leaves no room for it; `drawPaymentSlip(doc, layout, { x, y })` draws it at any position. Liberation Sans is embedded, without kerning, so that every text takes the width the layout measured. Works with PDFKit 0.17 and later, on Node 22.12 and later.
