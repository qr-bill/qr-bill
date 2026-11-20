# Contributing to qr-bill

Thank you for helping. qr-bill implements a payment standard: a wrong rule means a bill that a bank rejects, or worse, a payment that goes astray. The conventions below exist to keep every rule traceable to the standard, tested, and readable.

## Before you start

- **Open an issue first** for anything beyond a typo, so that we agree on the change before you spend time on it.
- **Work from the standard**, the [SIX Implementation Guidelines for the QR-bill v2.4](https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html) and the style guide, never from another implementation. Do not copy code from other QR-bill libraries.
- **Security issues** must not be reported in a public issue: see [SECURITY.md](SECURITY.md).

## Setup

Node 22.12 or later. pnpm comes through Corepack.

```bash
corepack enable
pnpm install
```

| Command              | What it does                                                             |
| -------------------- | ------------------------------------------------------------------------ |
| `pnpm test`          | Runs the tests (Vitest)                                                  |
| `pnpm coverage`      | Runs the tests with coverage; 100 % is required                          |
| `pnpm lint`          | ESLint with `typescript-eslint` `strictTypeChecked`                      |
| `pnpm format`        | Formats every file with Prettier (`pnpm format:check` only checks)       |
| `pnpm typecheck`     | Type-checks the tests and each package                                   |
| `pnpm docs:build`    | Generates the API reference in `docs/api/` (open `docs/api/index.html`)  |
| `pnpm docs:watch`    | Regenerates it on every change                                           |
| `pnpm check:docs`    | Fails when an export is not documented or a link is broken               |
| `pnpm build`         | Builds the packages (ESM and type declarations)                          |
| `pnpm check:package` | Checks what would be published (`publint`, `arethetypeswrong`)           |
| `pnpm changeset`     | Describes your change for the changelog and the next version (see below) |

The CI runs `format:check`, `lint`, `typecheck`, `coverage`, `check:docs`, `build` and `check:package` on Node 22, 24 and 26. Run them before opening a pull request.

## Workflow

1. **Issue.** Every change starts from an issue.
2. **Branch** from `main`, named after the kind of change: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `test/<slug>`, `refactor/<slug>` or `chore/<slug>`. Nothing is committed directly to `main`.
3. **Commits** in English, short, in the [Conventional Commits](https://www.conventionalcommits.org) form, referencing the issue: `fix: reject a country code that changes length when upper-cased (#12)`.
4. **Changeset.** If the change affects a published package (behaviour, API, types, documentation shipped in the package), run `pnpm changeset`, choose the packages and the kind of version, and describe the change for the users in one or two sentences. The file it creates in `.changeset/` is committed with your change. Changes to tests, tooling or repository documentation only need none.
5. **Pull request** into `main`, linked to the issue, with the CI green. It is merged with "Squash and merge": one commit per pull request on `main`, titled like a commit message.

### Versions

Each package has its own version, in its `package.json`, following [semantic versioning](https://semver.org). The version of the standard (v2.4) is not tied to it.

| Kind of change                                                | Before 1.0.0 | From 1.0.0 |
| ------------------------------------------------------------- | ------------ | ---------- |
| Bug fix, no change to the API                                 | patch        | patch      |
| New function, new option, new issue code                      | minor        | minor      |
| Removed or renamed export, changed result, changed issue code | minor        | major      |

### Releases

The maintainers publish from the changesets accumulated on `main`: `changeset version` raises the versions and writes the changelogs, `changeset publish` publishes to npm with provenance. Publication is refused while a README still carries a `<!-- release-blocker -->` comment (`scripts/check-release-blockers.js`).

## Code conventions

### Where the code goes

`packages/core/src` has one folder per concept of the standard (`account/`, `address/`, `amount/`, `reference/`…); the table is in [docs/architecture.md](docs/architecture.md#source-layout). Inside a folder:

| File             | Holds                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| `*.types.ts`     | Types only: the shapes of the data and the statuses returned by the validators |
| `*.validator.ts` | Validators                                                                     |
| other `*.ts`     | Normalizing, formatting, building references, writing the payload…             |

`index.ts` only re-exports the public API. Tests mirror the folders of `src` in `test`. File names are in kebab-case; imports end in `.js`.

An adapter (`packages/pdfkit`) draws the layout of the core with a rendering library: it holds no rule of the standard, and its tests check that what it draws matches the layout.

### Naming

| Prefix       | Returns                                                        | Example                                         |
| ------------ | -------------------------------------------------------------- | ----------------------------------------------- |
| `validate…`  | A status: `'valid'` or the problem, named like an issue code   | `validateCountry('CHE')` → `'invalid_country'`  |
| `is…`        | A boolean, when there are only two outcomes                    | `isQRIBAN('CH44 3199 …')` → `true`              |
| `normalize…` | The form written in the Swiss QR Code                          | `normalizeIBAN('ch44 3199 …')` → `'CH4431999…'` |
| `format…`    | The form printed on the payment part                           | `formatAmount('1590')` → `'1 590.00'`           |
| `create…`    | A new value built from yours; throws `RangeError` on bad input | `createQRReference(42)`                         |
| `UPPER_CASE` | Constants of the standard                                      | `ADDRESS_MAX_LENGTH.name` is 70                 |

### Rules

- **Zero runtime dependencies and no Node or DOM API in the core.** Its `tsconfig.json` has no `types` and an ES-only `lib`, so `Buffer`, `document` or `TextEncoder` do not compile. It must run in browsers, Node, Deno, Bun, Workers and React Native.
- **One validator per field.** A validator is a pure function that never throws, accepts `string | null | undefined`, normalizes first (Unicode NFC, trimmed), treats blank as missing, and returns the first problem in a fixed order. `validateQRBill` is built on the field validators: never re-implement a rule inside it.
- **Issue codes are a public contract.** Clients translate them and map them to form fields. Adding one is a new feature; renaming or removing one is a breaking change.
- **Amounts are decimal strings**, never floating-point numbers.
- **Generated code**: `src/layout/font-metrics.ts` is written by `scripts/generate-font-metrics.py` from the Liberation Sans font files (instructions in the script); never edit it by hand.
- **Third-party code**: the files of `src/qr-code/` are adapted from Project Nayuki and keep its MIT notice at the top. `test/qr-code/reference/qrcodegen.ts` is the unmodified original, used as a witness by the tests: never edit it (a test checks its hash).
- **Fonts**: `packages/pdfkit/fonts/` holds Liberation Sans 2.1.5, unmodified, under the SIL Open Font License 1.1, which reserves the name "Liberation": never edit nor subset these files.
- **No computation at module level** (`new Set(…)`, `.map(…)`): build data on first use, so that bundlers can drop what an application does not import. `test/tree-shaking.test.ts` checks it.
- **Every rule of the standard has a test**, and the code and the test cite the chapter: `// chapter 4.3.2`.
- **100 % coverage.** When a branch cannot be reached, restructure the code rather than adding a fallback.
- **Test data is fictional**: the names and addresses of the SIX examples (Max Muster & Söhne, Seldwyla…). Never real people, companies or accounts.

### Documentation

- Every file starts with a comment that says what it holds, ending with `@module`.
- Every export has a comment: what it does, `@param`, `@returns`, `@throws`, the chapter of the standard, and an `@example` for functions.
- One-line examples written as `validateCountry('ß'); // 'invalid_country'` are **run by the tests** (`test/doc-examples.test.ts`), in the sources and in the READMEs. Run the code to get the result; never write it from memory.
- Link to another declaration with `{@link validateQRBill}`, by name only, wherever it is declared.
- A new export goes into `index.ts` and into the list of `test/index.test.ts`, which makes every change of the public API visible in review.
- Code, comments and documentation are in English. Comments are wrapped at 120 columns. In Markdown, one line per paragraph or list item.

### Adding or changing a rule of the standard

1. Find the chapter and the table of the Implementation Guidelines that state the rule.
2. Write or change the validator in the folder of its concept, with its status type in `*.types.ts`.
3. Test it, citing the chapter; add a property-based test when the rule is an algorithm (check digits, encoding).
4. Make sure `validateQRBill` uses it, and test the issue it reports (code, path, message).
5. Export it, document it with an example, update `test/index.test.ts`.
6. Record the reason in [docs/architecture.md](docs/architecture.md) if it is a design decision, and add a changeset.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
