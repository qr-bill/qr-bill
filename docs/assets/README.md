# Assets

## Logo

- `logo-black.svg`: the logo for light backgrounds; `logo-white.svg`: the same for dark backgrounds.
- `icon-black.svg`: the icon alone, for avatars and favicons.

The icon is drawn on a grid of 15 × 15 modules: three finder patterns of a QR code (7 × 7 modules each) and, in the fourth corner, a cross of four squares. It deliberately differs from the recognition symbol of the QR-bill, the Swiss cross in a black square at the centre of the QR code, whose design SIX protects. The word "qr-bill" is set in JetBrains Mono Bold (SIL Open Font License 1.1) and converted to outlines, so that it looks the same everywhere.

Use the black or the white version only; red is avoided on purpose, a red cross on white being the protected emblem of the Red Cross.

## Payment slip

`payment-slip.svg`, shown at the top of the READMEs, is example 2 of the SIX Implementation Guidelines in English, as `layoutQRBill` and `renderSVG` draw it. It is not edited by hand: `packages/core/test/svg/readme-image.test.ts` fails when it no longer matches the code, and `pnpm test -u` writes it again.
