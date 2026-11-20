# @qr-bill/core

## 0.1.0

### Minor Changes

- First release. Validation of a QR-bill against the SIX Implementation Guidelines v2.4: `validateQRBill` reports every issue with a stable code and a path and never throws, `createQRBill` throws a `QRBillValidationError`, and `qrBillSchema` exposes the same validation as a Standard Schema. One validator per field for forms (`validateName`, `validateAccount`, `validateAmount`, `validateReference`…), the rules on several fields, and the maximum lengths. Payload of the Swiss QR Code (`bill.payload`) and `parseQRBill` to read a scanned one back. IBAN and QR-IBAN, QR reference and Creditor Reference (`createQRReference`, `createCreditorReference`), amounts as decimal strings (`fromCents`, `formatAmount`), country codes, character set, and the texts of the payment slip in German, French, Italian, Romansh and English.
- 5482ef9: Layout of the payment slip: `layoutQRBill(bill, { language, separators })` positions every element of the receipt and the payment part in millimetres, following chapter 3 of the SIX Implementation Guidelines v2.4 and the style guide (Swiss QR Code of 46 mm with the Swiss cross, fonts, blank fields with corner marks, cutting lines with scissors). Text is measured with Liberation Sans. `renderSVG(layout)` renders it as an SVG document of 210 × 105 mm.
- 9b448eb: Swiss QR Code encoder: `encodeSwissQRCode(payload)` returns the modules of the QR code of a bill, as chapter 6 of the SIX Implementation Guidelines v2.4 requires (byte mode in UTF-8, error correction level M, smallest version up to 25). Adapted from the QR Code generator library of Project Nayuki (MIT).
