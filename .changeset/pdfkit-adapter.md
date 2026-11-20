---
'@qr-bill/pdfkit': minor
---

First version of the PDFKit adapter. `attachTo(doc, bill, { language })` adds the payment slip at the bottom of the last page of a PDFKit document, or on a new page when the invoice leaves no room for it; `drawPaymentSlip(doc, layout, { x, y })` draws it at any position. Liberation Sans is embedded, without kerning, so that every text takes the width the layout measured. Works with PDFKit 0.17 and later, on Node 22.12 and later.
