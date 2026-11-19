---
'@qr-bill/core': minor
---

Swiss QR Code encoder: `encodeSwissQRCode(payload)` returns the modules of the QR code of a bill, as chapter 6 of the SIX Implementation Guidelines v2.4 requires (byte mode in UTF-8, error correction level M, smallest version up to 25). Adapted from the QR Code generator library of Project Nayuki (MIT).
