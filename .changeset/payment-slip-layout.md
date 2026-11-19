---
'@qr-bill/core': minor
---

Layout of the payment slip: `layoutQRBill(bill, { language, separators })` positions every element of the receipt and the payment part in millimetres, following chapter 3 of the SIX Implementation Guidelines v2.4 and the style guide (Swiss QR Code of 46 mm with the Swiss cross, fonts, blank fields with corner marks, cutting lines with scissors). Text is measured with Liberation Sans. `renderSVG(layout)` renders it as an SVG document of 210 × 105 mm.
