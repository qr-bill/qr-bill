<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-white.svg" />
    <img src="docs/assets/logo-black.svg" alt="qr-bill" height="72" />
  </picture>
</h1>

<p align="center">
  <a href="https://github.com/qr-bill/qr-bill/actions/workflows/ci.yml"><img src="https://github.com/qr-bill/qr-bill/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="vitest.config.ts"><img src="https://img.shields.io/badge/coverage-100%25-brightgreen" alt="Coverage: 100 %" /></a>
  <a href="packages/core/package.json"><img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Dependencies: 0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/qr-bill/qr-bill" alt="License: MIT" /></a>
</p>

Swiss QR-bill (QR-Rechnung, QR-facture, QR-fattura, Quint QR) for JavaScript and TypeScript, following the [SIX Implementation Guidelines v2.4](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html), in force since 14 November 2026.

<p align="center">
  <img src="docs/assets/payment-slip.svg" alt="Payment slip of a QR-bill: the receipt on the left, the payment part with the Swiss QR Code on the right" width="800" />
</p>

- **Runs everywhere.** No Node or DOM API in the core: browsers, Node, Deno, Bun, Cloudflare Workers, React Native.
- **Zero dependencies** in the core. PDF engines live in separate adapters. An application only carries what it imports: `isValidIBAN` alone is 340 bytes once bundled.
- **Up to date with v2.4.** Structured addresses only, QR-IBAN and QR reference reserved for CHF, extended character set, Romansh.
- **No floating-point money.** Amounts are decimal strings; `fromCents()` converts what you store.
- **The official rules for your forms.** One validator per field (`validateName`, `validateAccount`, `validateAmount`…), the very ones the library uses, so a form that passes them makes a valid QR-bill.
- **Every problem at once.** Validation reports all issues with stable codes, and plugs into any [Standard Schema](https://standardschema.dev) consumer (Hono, tRPC, TanStack Form…).
- **Reads QR-bills too.** `parseQRBill()` turns a scanned Swiss QR Code back into a validated bill.

## Example

```ts
import { createQRBill, createQRReference, fromCents, layoutQRBill, renderSVG } from '@qr-bill/core';

const bill = createQRBill({
  currency: 'CHF',
  amount: fromCents(194975), // "1949.75"
  creditor: {
    account: 'CH44 3199 9123 0008 8901 2', // QR-IBAN
    name: 'Max Muster & Söhne',
    street: 'Musterstrasse',
    buildingNumber: '123',
    postalCode: '8000',
    town: 'Seldwyla',
    country: 'CH',
  },
  reference: createQRReference('21000000000313947143000901'),
  message: 'Order from 15.10.2020',
});

bill.payload; // content of the Swiss QR Code

const layout = layoutQRBill(bill, { language: 'fr' }); // receipt and payment part, positioned in millimetres
const svg = renderSVG(layout); // SVG document of 210 × 105 mm, Swiss QR Code and cutting lines included
```

Invalid input throws a `QRBillValidationError` whose `issues` list every problem:

```ts
import { validateQRBill } from '@qr-bill/core';

const result = validateQRBill(requestBody); // never throws, accepts unknown
if (!result.success) {
  result.issues; // [{ code: 'qr_iban_requires_chf', path: ['currency'], message: '…' }, …]
}
```

## PDF

[`@qr-bill/pdfkit`](packages/pdfkit) adds the payment slip to a [PDFKit](https://pdfkit.org) document, with its fonts:

```ts
import { attachTo } from '@qr-bill/pdfkit';

attachTo(doc, bill, { language: 'fr' }); // at the bottom of the last page, or on a new page if the invoice leaves no room
```

## Validate a form, field by field

Each field of the QR-bill has its validator. It takes the value as typed and returns `true`/`false` when there are two outcomes, or a status naming the problem, ready to be translated:

```ts
import {
  validateAccount,
  validateCountry,
  validateName,
  validateReference,
  validateReferenceForAccount,
} from '@qr-bill/core';

validateName('  '); // 'required'
validateCountry('CHE'); // 'invalid_country': two letters expected
validateAccount('CH44 3199 9123 0008 8901 2'); // 'qr_iban'
validateReference('RF18 5390 0754 7034'); // 'SCOR'

// Rules on several fields, once each field is valid
validateReferenceForAccount('qr_iban', 'SCOR'); // 'qr_iban_requires_qr_reference'
```

The maximum lengths are exported too (`ADDRESS_MAX_LENGTH.name` is 70), for the `maxlength` of your inputs.

## Packages

| Package                              | Status      | Purpose                                               |
| ------------------------------------ | ----------- | ----------------------------------------------------- |
| [`@qr-bill/core`](packages/core)     | in progress | Validation, payload, references, parsing, layout, SVG |
| [`@qr-bill/pdfkit`](packages/pdfkit) | in progress | Payment slip in a PDFKit document (Node)              |
| `@qr-bill/jspdf`                     | planned     | Payment slip in a jsPDF document (browser)            |

## Quality

- The six examples of the standard are conformance tests ([`conformance/`](conformance)), shared with future implementations in other languages. While writing them we found that example 4 of the standard prints a Creditor Reference with wrong check digits; the file documents it.
- Property-based tests (fast-check) for check digits, amounts, character set and round trips.
- Every example of the documentation comments is run by the tests, so the documentation cannot drift from the code.
- 100 % coverage enforced in CI on Node 22, 24 and 26.

See [docs/architecture.md](docs/architecture.md) for the design.

## Contributing

Issues and pull requests are welcome. The workflow, the code conventions and how to add a rule of the standard are described in [CONTRIBUTING.md](CONTRIBUTING.md).

## Acknowledgements

The QR code encoder is adapted from the [QR Code generator library](https://www.nayuki.io/page/qr-code-generator-library) of Project Nayuki (MIT); its notice is in [LICENSE](packages/core/LICENSE).

The text is measured with, and the PDF adapter embeds, the [Liberation Sans](https://github.com/liberationfonts/liberation-fonts) fonts (SIL Open Font License 1.1), shipped unmodified in [`packages/pdfkit/fonts`](packages/pdfkit/fonts).

## Trademarks

qr-bill is an independent open-source project. It is not affiliated with or endorsed by SIX Group, whose subsidiary SIX Interbank Clearing Ltd publishes the Swiss Implementation Guidelines for the QR-bill. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.

## License

MIT © Olivier Azevedo — maintained by [Claine](https://claine.ai).
