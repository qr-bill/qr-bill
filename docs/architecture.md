# Architecture

## Goals

1. **Conform to the SIX Implementation Guidelines for the QR-bill, v2.4** (24.02.2026, in force since 14.11.2026). v2.4 is stricter than v2.3 (still accepted until November 2027), so a v2.4 bill is valid for both: there is no version option.
2. **Run in every JavaScript runtime** without polyfills or bundler configuration: browsers (Vite, webpack…), Node, Deno, Bun, Cloudflare Workers, React Native.
3. **Stay small**: zero dependencies in the core, PDF engines as optional adapters, and an application only carries the functions it imports.
4. **Be trustworthy for money**: no floating-point amounts, every rule of the standard tested, reproducible builds, provenance on every release.
5. **Be readable**: one folder per concept of the standard, every exported function documented with its parameters, result and an example that the tests run.

Non-goals: generating whole invoices (the caller owns the invoice layout; we add the payment part to it), eBill.

## Pipeline

```mermaid
flowchart LR
  fields["Field values (a form)"] --> validators["Field validators<br/>validateName, validateAccount…"]
  input["Input (unknown)"] --> validate["validateQRBill"]
  validators -. same rules .-> validate
  validate --> bill["QRBill"]
  bill --> payload["Swiss QR Code content<br/>(payload)"]
  payload --> encode["encodeSwissQRCode"]
  encode --> modules["QR code modules"]
  bill --> layout["layoutQRBill<br/>layout in mm"]
  modules --> layout
  layout --> svg["renderSVG"]
  layout --> pdfkit["attachTo<br/>@qr-bill/pdfkit"]
  layout -. next .-> others["jsPDF, React…"]
  scanned["Scanned QR code"] --> parse["parseQRBill"]
  parse --> validate
```

- **Field validators** (`validateName`, `validateAccount`, `validateAmount`…) check one field as typed in a form and return a boolean or a status (`'valid'`, `'required'`, `'too_long'`…). Rules that involve several fields have their own validators (`validateReferenceForAccount`, `isZeroAmountAllowed`…).
- **Validation of the bill** (`validateQRBill`) applies those same validators to every field, then the rules on several fields, then the size of the Swiss QR Code. It accepts `unknown`, reports every issue with a stable code and a path, and never throws. `createQRBill` is the throwing variant; `qrBillSchema` exposes it as a Standard Schema.
- **QRBill** is immutable and normalized (IBAN without spaces, NFC text, country in upper case, amount with two decimals).
- **Payload** follows table 8 of the standard: 31 mandatory lines, optional trailing elements left out when unused, no line break after the last element. `parseQRBill` reverses it through the same validation.
- **QR code** (`encodeSwissQRCode`) encodes the payload as chapter 6 requires: byte mode in UTF-8, error correction level M, the smallest version that holds it (at most 25), the mask with the lowest penalty. It returns the modules as plain data; the quiet zone, the size of 46 × 46 mm and the Swiss cross belong to the layout.
- **Layout** (`layoutQRBill`) places every element of the receipt and the payment part in millimetres, as data: lines of text at their baseline, and paths (the QR code as one path, the Swiss cross, corner marks, cutting lines, scissors). Renderers only draw texts and paths, so the conformity of the layout to the style guide is tested once, on the layout, not once per renderer. `renderSVG` is the reference renderer.
- **PDF** (`attachTo` of `@qr-bill/pdfkit`) draws the same layout in a PDFKit document, at the bottom of the last page or on a new page when the text leaves no room, with Liberation Sans embedded. `drawPaymentSlip` draws it at any position.

## Source layout

`packages/core/src` has one folder per concept of the standard. Inside a folder, the file name says what a file holds:

| Suffix           | Holds                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| `*.types.ts`     | Types only: the shapes of the data and the statuses returned by the validators.     |
| `*.validator.ts` | Validators: pure functions that never throw and return a boolean or a status.       |
| other `*.ts`     | Everything else: normalizing, formatting, building references, writing the payload. |

| Folder                    | Concept                                                                                                                   | Chapters of the IG  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `account/`                | Creditor account: IBAN and QR-IBAN                                                                                        | 2.7–2.10            |
| `address/`                | Creditor and debtor addresses, country codes                                                                              | 4.2.2               |
| `amount/`                 | Amount and currency                                                                                                       | 3.5.3, 4.2.2, 4.4   |
| `reference/`              | QR reference and Creditor Reference                                                                                       | 2.12, 4.3.2, B      |
| `additional-information/` | Message, billing information, alternative procedures                                                                      | 4.2.2, 4.3.3        |
| `text/`                   | Character set, normalization, UTF-8, validation of free text                                                              | 4.1.1               |
| `checksum/`               | Check digit algorithms: modulo 10 recursive, ISO 7064 MOD 97-10                                                           | Annex B             |
| `qr-code/`                | The Swiss QR Code: capacity, Reed-Solomon, codewords, modules and masks, encoder (adapted from Project Nayuki)            | 6, ISO/IEC 18004    |
| `layout/`                 | The payment slip: dimensions of the style guide, text measured with Liberation Sans, receipt, payment part, cutting lines | 3, 6.4, style guide |
| `svg/`                    | Rendering of a layout as SVG                                                                                              | —                   |
| `labels/`                 | Texts printed on the payment part and the receipt, in five languages                                                      | Annex C             |
| `bill/`                   | The bill as a whole: validation, rules on several fields, payload, parsing                                                | 4, 7.1              |

`index.ts` only re-exports the public API. Tests mirror the folders in `packages/core/test`.

## Packages

| Package           | Depends on      | Notes                                                               |
| ----------------- | --------------- | ------------------------------------------------------------------- |
| `@qr-bill/core`   | nothing         | `.` today; `/svg` and `/layout` subpaths next                       |
| `@qr-bill/pdfkit` | `pdfkit` (peer) | server-side PDF (Node), first adapter; ships Liberation Sans        |
| `@qr-bill/jspdf`  | `jspdf` (peer)  | browser-side PDF                                                    |
| `@qr-bill/react`  | `react` (peer)  | later; React Native through `react-native-svg`                      |
| `@qr-bill/camt`   | —               | later: reconcile ISO 20022 camt.054 bank statements by QR reference |

## Decisions

| Decision                                                                                         | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One validator per field, and `validateQRBill` built on them                                      | A form validated field by field with the public validators is guaranteed to be accepted by `createQRBill`: there is a single implementation of each rule.                                                                                                                                                                                                                                                                                                                 |
| A validator returns a boolean (two states) or a status (more)                                    | A status names the problem (`'too_long'`, `'invalid_characters'`…) with the same values as the issue codes, so an application can translate it. When a field has several problems, the first in a fixed order is returned (`required`, then `invalid_characters`, then `too_long`); `validateQRBill` reports one issue per field.                                                                                                                                         |
| Blank counts as missing                                                                          | A field made of spaces is reported as `required` when mandatory and ignored when optional, the same way for every field, the account and the alternative procedures included.                                                                                                                                                                                                                                                                                             |
| Country checked before upper-casing                                                              | Upper-casing can change the length and the letters: "ß" becomes "SS" (South Sudan), "ŉ" becomes "ʼN", whose "ʼ" is outside the character set.                                                                                                                                                                                                                                                                                                                             |
| Core compiled with `"types": []` and an ES-only `lib`                                            | Any use of `Buffer`, `document`, `TextEncoder`… is a compile error, which guarantees portability. UTF-8 encoding is hand-written for that reason.                                                                                                                                                                                                                                                                                                                         |
| Amounts as decimal strings, `fromCents()` helper                                                 | Floats cannot represent most cents exactly. Numbers are accepted only when they carry at most two decimals exactly (`0.1 + 0.2` is rejected).                                                                                                                                                                                                                                                                                                                             |
| Characters counted as Unicode code points                                                        | That is what the standard limits. Input is NFC-normalized first, so a decomposed "é" (macOS input) is accepted.                                                                                                                                                                                                                                                                                                                                                           |
| `0.00` only with a "DO NOT USE FOR PAYMENT" message                                              | Chapter 4.4: zero is reserved for notifications.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| QR-IBAN requires CHF                                                                             | New in v2.4 after the end of euroSIC.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Payload limited to 997 **bytes**                                                                 | 997 is the byte capacity of QR version 25 at level M, the maximum allowed. Counting bytes rather than characters guarantees it with multi-byte characters.                                                                                                                                                                                                                                                                                                                |
| Data built lazily (country codes)                                                                | A module-level `new Set(…)` cannot be removed by a bundler, so an application that only checks an IBAN would carry the 250 country codes. A test bundles the public API to keep it that way.                                                                                                                                                                                                                                                                              |
| Text measured with Liberation Sans, whose widths are in the core                                 | One of the four fonts the QR-bill allows (chapter 3.4), free (SIL OFL), metric-compatible with Arial, and it covers Latin Extended-A, which the standard PDF Helvetica cannot render. A layout measured once, without canvas or font file, breaks lines the same in every runtime; PDF adapters embed the same font so that the widths match. `scripts/generate-font-metrics.py` writes the table from the font files.                                                    |
| Long information: smaller fonts, then shortening                                                 | The payment part tries 8/10 pt (recommended), 7/9 pt, then 6/8 pt (the minimum, chapter 3.4); only then the additional information is shortened with an ellipsis (3.5.4). Address lines take at most two lines each. The receipt leaves the streets out when they do not fit (3.6.2). A property test lays out bills at the maximum lengths and checks that no text leaves its section.                                                                                   |
| Cutting lines with scissors by default                                                           | Most slips are now sent as PDF, which chapter 3.7 requires to mark the cutting lines; the instruction "Separate before paying in" or no line at all (perforated paper) are options.                                                                                                                                                                                                                                                                                       |
| Swiss cross drawn from the description of the standard                                           | A white cross with the proportions of the Swiss coat of arms on a black square with a white border, 7 × 7 mm (chapter 6.4.2); no file to embed. The end-to-end test reads the QR code back with the cross over it.                                                                                                                                                                                                                                                        |
| ESM only, Node ≥ 22.12                                                                           | `require(esm)` works natively from Node 22.12, so CommonJS consumers are still served.                                                                                                                                                                                                                                                                                                                                                                                    |
| Shared conformance vectors in JSON                                                               | A future Rust crate reuses them as is, instead of sharing code through WASM (weight, async init, React Native).                                                                                                                                                                                                                                                                                                                                                           |
| QR encoder adapted from Project Nayuki (MIT), reduced to byte mode, level M and versions 1 to 25 | A careful, widely reused implementation of ISO/IEC 18004 (swissqrbill and qrcode.react use it too), taken from its source, not from another QR-bill library. Writing an encoder from the paid ISO standard would take weeks and risk subtle bugs. Every derived file keeps the MIT notice, and `packages/core/LICENSE` carries it in the published package, whose build removes comments.                                                                                 |
| Release pull request by hand, publication by a workflow when a version of `main` is not on npm   | The maintainer decides when to publish by merging a pull request they reviewed, versions and changelogs included. The workflow compares the versions with npm instead of reading a pull request title, so a run that failed halfway can simply be run again. Unlike the bot pull request of `changesets/action`, it needs no GitHub App holding write access to the repository, because a pull request opened by the default token would not trigger the required checks. |
| PDFKit for the first PDF adapter                                                                 | Maintained, flows text over pages and tables (what an invoice needs before its slip), embeds TrueType subsets and takes SVG path data as is. pdf-lib is unmaintained since 2021 and breaks no lines; pdfmake is built on PDFKit and declarative, which makes "at the bottom of the last page if there is room" hard; jsPDF targets the browser and gets its own adapter.                                                                                                  |
| Adapters typed by the methods they call, not by `@types/pdfkit`                                  | `@types/pdfkit` lags behind PDFKit and describes the OpenType features only as an array, which cannot turn kerning off. An interface of the methods it calls accepts a document of any version from 0.17, typed or not; a test runs the oldest one.                                                                                                                                                                                                                       |
| Liberation Sans shipped unmodified in `@qr-bill/pdfkit`                                          | Its licence (SIL OFL 1.1) reserves the name "Liberation": a font reduced to the characters of the standard would have to be renamed. PDFKit embeds only the glyphs used (a PDF with the slip alone weighs 28 KB), so the 825 KB of the two files stay on the server.                                                                                                                                                                                                      |
| Kerning and ligatures off in PDF                                                                 | PDFKit applies them by default: "AVAVAV" comes out 9 % narrower than the layout measured, "office" gets a ligature. Off, every text takes the width the layout measured, to 0.05 pt.                                                                                                                                                                                                                                                                                      |
| The slip ignores the graphics state of the document                                              | It is drawn inside `save`/`restore`, at full opacity, with butt caps and solid lines unless dashed, so a transparency or a dash pattern set by the invoice cannot fade the QR code or dash the corner marks. The current font is not restored: PDFKit has no public way to read it, so the documentation says to select it again.                                                                                                                                         |
| `@qr-bill/pdfkit` for Node only, at first                                                        | It reads its fonts from its package. In a browser the fonts must come as bytes (the `fonts` option already takes them) or be bundled; the first browser adapter will be jsPDF.                                                                                                                                                                                                                                                                                            |

## Documentation

- Every exported declaration has a documentation comment: what it does, its parameters, its result, the chapter of the standard, and for most functions an example. Every file starts with a comment that says what it holds.
- `pnpm docs:build` generates the API reference with [TypeDoc](https://typedoc.org) in `docs/api/` (not versioned), one section per package and one page per source file. `pnpm docs:watch` rebuilds it on every change. The CI fails when a declaration is not documented or a link is broken.
- `scripts/typedoc-link-by-name.js` lets `{@link name}` point to a declaration of another file, so comments stay short: `{@link validateQRBill}` rather than a path.

## Known traps (next steps)

- **Fonts in PDF.** The standard PDF Helvetica (WinAnsi) cannot render the extended character set (ł, ő, Ș…), which v2.3+ allows. Every PDF adapter must embed Liberation Sans, the font the layout is measured with, without kerning.
- **Kerning in SVG.** Browsers and resvg kern SVG text, so some lines come out slightly narrower than the layout measured. `renderSVG` could turn it off as the PDF adapter does.

## Quality gates

- Conformance: the six examples of Annex A, payload line by line, in LF and CR LF.
- Property-based tests: check digits detect every single-digit error, amounts round-trip through cents, sanitized text is always valid, any generated bill parses back to itself.
- README image: the payment slip shown at the top of the READMEs is the SVG the code draws for example 2, compared with the file by a test.
- Documentation examples: every one-line example of the documentation comments (`validateCountry('ß'); // 'invalid_country'`) is run by the tests.
- Public API: a test lists every export, so adding or removing one is a visible decision.
- Layout: the dimensions of the style guide are tested one by one; no text leaves its section, for the six examples in the five languages and for random bills at the maximum lengths; the SVG of every example is rasterised (resvg) and its QR code, Swiss cross included, read back by ZXing.
- PDF: the PDF is read back with pdfjs, and every text of the six examples in the five languages is at its position to 0.005 pt, in its font, size and measured width; the paths are compared pixel by pixel with the SVG renderer; the QR code is read back by ZXing from the rasterised PDF; the oldest PDFKit supported (0.17.0) draws the same slip.
- QR codes: every generated QR code is read back by a real decoder (ZXing, through `zxing-wasm`), and compared module by module with the original encoder of Project Nayuki, kept unmodified in `test/qr-code/reference/` as a witness: the reduction changes nothing, the choice of the mask included.
- Tree shaking: a test bundles a single import (`isValidIBAN`) and checks that the rest of the library is left out.
- 100 % coverage enforced; lint with `typescript-eslint` `strictTypeChecked`; formatting with Prettier.
- `publint` and `arethetypeswrong` on every build.
- Dependencies younger than 7 days are never installed (`minimumReleaseAge`).
- Releases from GitHub Actions only ([docs/releasing.md](releasing.md)): npm Trusted Publishing (OIDC) bound to the workflow and to the environment `npm`, limited to `main`; provenance on every version after 0.1.0; no npm token anywhere.
- Publication blocked while a README carries a `<!-- release-blocker -->` comment or says "not published yet" (`scripts/check-release-blockers.js`, run by the release workflow and as `prepublishOnly`).
