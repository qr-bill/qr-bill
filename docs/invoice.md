# Invoices: `@qr-bill/invoice`

A Swiss invoice on A4 with its QR-bill, from your data: your logo and details, the recipient in the window of the envelope, the lines, the VAT and the totals, a few ready-made mentions, and the payment part at the bottom of the last page.

> **Work in progress.** The data, its validation, the amounts and the PDF are ready; the light logo (SVG drawn as vectors, PNG reduced) comes next. The package is not on npm yet.

## Principles

- **The invoice is always produced.** Only the form of the data is checked: types, lengths, numbers, dates, the UID, the e-mail, and the QR-bill of the payment part, which must be valid since a wrong one would make the payment go astray. What the invoice says is the issuer's business: no legal mention is required (see what Swiss law asks below).
- **Nothing overflows.** Every text field has a maximum length, and a maximum number of lines for the longer ones; [`INVOICE_LIMITS`](#schema) exports them for the `maxlength` of a form. The layout wraps a text within its zone, and shortens it with "…" only as a last resort.
- **The addresses are those of the QR-bill.** The name and structured address of the issuer and of the recipient are also the creditor and the debtor of the payment part: they follow its rules (character set, lengths, country code). Up to two free lines each are printed on the invoice only.
- **Five languages**: German, French, Italian, Romansh and English, for the invoice and its payment part.
- **No floating-point money.** Amounts, prices, quantities and rates are read as decimal strings (or numbers with the decimals allowed) and computed exactly in integers.

## Creating the PDF

`createInvoicePDF` checks the data, then writes the invoice with [PDFKit](https://pdfkit.org), which your project installs (`pdfkit` 0.17 or later). It returns the bytes of the PDF file:

```ts
import { writeFile } from 'node:fs/promises';
import { InvoiceValidationError, createInvoicePDF } from '@qr-bill/invoice';

try {
  const pdf = await createInvoicePDF({
    language: 'fr',
    date: '2026-11-20',
    number: '2026-042',
    issuer: {
      name: 'Max Muster & Söhne',
      street: 'Musterstrasse',
      buildingNumber: '123',
      postalCode: '8000',
      town: 'Seldwyla',
      country: 'CH',
    },
    recipient: { name: 'Simon Muster', postalCode: '8000', town: 'Seldwyla', country: 'CH' },
    items: [{ description: 'Conseil', quantity: 6, unit: 'h', unitPrice: '150', vatRate: '8.1' }],
    payment: { account: 'CH44 3199 9123 0008 8901 2', reference: '210000000003139471430009017' },
  });
  await writeFile('facture.pdf', pdf);
} catch (error) {
  if (error instanceof InvoiceValidationError)
    console.error(error.issues); // every problem, as validateInvoice reports them
  else throw error;
}
```

It runs on Node, like `@qr-bill/pdfkit`, whose fonts it uses. A page with its payment slip weighs about 42 KB without logo: the two fonts are embedded with only the characters used.

## The page

- **Letterhead**: the logo, fitted in a box of 50 × 18 mm in the top left corner, or the name of the issuer in large type, on two lines at most.
- **Details of the issuer**: its name when a logo stands for it, its free lines, address, phones, e-mail, contact and UID (followed by MWST, TVA or IVA when it is registered for VAT).
- **Address window**: on the left by default (the issuer's details then go in the right column), on the right with `addressWindow: 'right'` (the details then go under the letterhead). As Swiss Post asks, the window holds a single line with the sender, separated from the address by a rule, and nothing frames the address. When the issuer and the recipient are in different countries, both addresses end with the name of their country, in the language of the invoice.
- **Title and details**: the title, then a grid of five columns with the number, the dates, the period, the references and the details added (`extraFields`); then the subject and the introduction.
- **Lines**: a table whose columns are those the lines use, each as wide as its widest number; the descriptions take the room left and wrap. Over several pages, the header of the table is repeated, and a row never splits.
- **Totals**: on the right, the subtotal (when something lies between it and the total), the VAT of each rate, the rounding and the total; the VAT included in the prices comes after the total. On the left, beside them, the mentions and the remarks. Both stay together on one page. Then the closing text.
- **Following pages**: a short header with the name of the issuer, the title and the number, and every page numbered when there are several.
- **Payment slip**: at the bottom of the last page, or on a page of its own when the last one has no room left.

Every text stays in its zone, whatever its length within the limits: a test draws an invoice whose every field is at its maximum, in the widest characters, in the five languages, with both windows and the three themes, and checks that no text leaves the page, reaches the payment slip or overlaps another.

## Validating an invoice

`validateInvoice` accepts `unknown`, so that a request body can be passed as is. It never throws, and reports every problem at once:

```ts
import { validateInvoice } from '@qr-bill/invoice';

const result = validateInvoice({
  language: 'fr',
  date: '2026-11-20',
  number: '2026-042',
  issuer: {
    name: 'Max Muster & Söhne',
    street: 'Musterstrasse',
    buildingNumber: '123',
    postalCode: '8000',
    town: 'Seldwyla',
    country: 'CH',
    uid: 'CHE-123.456.788',
    vatRegistered: true,
  },
  recipient: {
    name: 'Pia-Maria Rutschmann-Schnyder',
    street: 'Grosse Marktgasse',
    buildingNumber: '28',
    postalCode: '9400',
    town: 'Rorschach',
    country: 'CH',
  },
  items: [{ description: 'Advice', quantity: 6, unit: 'h', unitPrice: '150.00', vatRate: '8.1' }],
  payment: { account: 'CH44 3199 9123 0008 8901 2', reference: '210000000003139471430009017' },
});

if (result.success) {
  result.data.totals.total; // "972.90": 900.00 plus 8.1 % VAT
  result.data.bill?.amount; // "972.90": the QR-bill of the payment part
} else {
  result.issues; // [{ code: 'invalid_uid', path: ['issuer', 'uid'], message: '…' }, …]
}
```

`computeInvoiceTotals(items, options)` computes the amounts alone, for instance to show them while a form is being filled.

## Schema

The limits are in characters (Unicode code points). "—" means no limit beyond the type.

### Document

| Field               | Type                     | Required | Limit          | Description                                                                     |
| ------------------- | ------------------------ | -------- | -------------- | ------------------------------------------------------------------------------- |
| `language`          | `de` `fr` `it` `rm` `en` | yes      | —              | Language of the invoice and of its payment part                                 |
| `currency`          | `CHF` `EUR`              | no       | —              | `CHF` by default                                                                |
| `title`             | text                     | no       | 35             | "Invoice" in the language of the invoice by default; "Credit note", "Reminder"… |
| `number`            | text                     | no       | 35             | Number of the invoice                                                           |
| `date`              | `YYYY-MM-DD`             | yes      | —              | Date of the invoice                                                             |
| `dueDate`           | `YYYY-MM-DD`             | no       | —              | Due date                                                                        |
| `servicePeriod`     | text                     | no       | 50             | Period of the supply, as printed: "November 2026"                               |
| `customerReference` | text                     | no       | 35             | Reference of the recipient, e.g. an order number                                |
| `extraFields`       | `{ label, value }[]`     | no       | 3 × (25 + 50)  | More details: "Customer no.", "Member no."…                                     |
| `subject`           | text                     | no       | 140            | Subject, on one line or two                                                     |
| `introduction`      | text                     | no       | 1000, 10 lines | Text before the lines                                                           |
| `closing`           | text                     | no       | 1000, 10 lines | Text after the totals                                                           |

### Issuer

| Field                   | Type    | Required | Limit  | Description                                                                        |
| ----------------------- | ------- | -------- | ------ | ---------------------------------------------------------------------------------- |
| `issuer.name`           | text    | yes      | 70     | Name or company, as on the payment part                                            |
| `issuer.street`         | text    | no       | 70     | Street or P.O. box                                                                 |
| `issuer.buildingNumber` | text    | no       | 16     | Building number                                                                    |
| `issuer.postalCode`     | text    | yes      | 16     | Postal code, without country prefix                                                |
| `issuer.town`           | text    | yes      | 35     | Town                                                                               |
| `issuer.country`        | text    | yes      | —      | Two-letter ISO 3166-1 code: `CH`. Printed when the recipient is in another country |
| `issuer.logo`           | bytes   | no       | 2 MB   | A PNG or JPEG file (`Uint8Array` or `Buffer`)                                      |
| `issuer.extraLines`     | text[]  | no       | 2 × 70 | Lines under the name, on the invoice only: a department…                           |
| `issuer.phones`         | text[]  | no       | 2 × 30 | Phone numbers, as printed                                                          |
| `issuer.email`          | text    | no       | 70     | E-mail address                                                                     |
| `issuer.contact`        | text    | no       | 70     | A free contact line: a website…                                                    |
| `issuer.uid`            | text    | no       | —      | UID such as `CHE-123.456.788`, with its check digit                                |
| `issuer.vatRegistered`  | boolean | no       | —      | Prints the UID as a VAT number: `CHE-123.456.788 TVA`                              |

### Recipient

| Field                      | Type   | Required | Limit  | Description                                                                                                                             |
| -------------------------- | ------ | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `recipient.salutation`     | text   | no       | 35     | Line above the name: "Madame", "Herr"…                                                                                                  |
| `recipient.name`           | text   | yes      | 70     | Name or company, as on the payment part                                                                                                 |
| `recipient.street`         | text   | no       | 70     | Street or P.O. box                                                                                                                      |
| `recipient.buildingNumber` | text   | no       | 16     | Building number                                                                                                                         |
| `recipient.postalCode`     | text   | yes      | 16     | Postal code, without country prefix                                                                                                     |
| `recipient.town`           | text   | yes      | 35     | Town                                                                                                                                    |
| `recipient.country`        | text   | yes      | —      | Two-letter ISO 3166-1 code. Printed on the last line of the address when it is not the issuer's country, in the language of the invoice |
| `recipient.extraLines`     | text[] | no       | 2 × 70 | Lines under the name, on the invoice only: a department, "c/o"…                                                                         |

### Lines

| Field                 | Type    | Required | Limit        | Description                                                        |
| --------------------- | ------- | -------- | ------------ | ------------------------------------------------------------------ |
| `items`               | line[]  | yes      | 1 to 1000    | The lines of the invoice                                           |
| `items[].description` | text    | yes      | 300, 6 lines | What is invoiced; a line with a description only is a line of text |
| `items[].quantity`    | decimal | no       | —            | At most 3 decimals; 1 when absent; may be negative                 |
| `items[].unit`        | text    | no       | 10           | "h", "pce"…                                                        |
| `items[].unitPrice`   | decimal | no       | —            | At most 4 decimals; may be negative                                |
| `items[].vatRate`     | decimal | no       | —            | In percent, at most 2 decimals, from 0 to 100: `"8.1"`             |
| `items[].amount`      | decimal | no       | —            | At most 2 decimals; takes precedence over quantity × unit price    |

Discounts, deposits and fees are ordinary lines, with negative amounts where needed.

### Amounts and mentions

| Field              | Type    | Required | Limit                 | Description                                                                                             |
| ------------------ | ------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| `pricesIncludeVAT` | boolean | no       | —                     | The prices include VAT; by default they do not, and the VAT is added                                    |
| `roundTo5Centimes` | boolean | no       | —                     | Rounds the total to 5 centimes, with a rounding line                                                    |
| `totals`           | object  | no       | —                     | Totals computed elsewhere, printed as they are: `{ subtotal?, vat?: [{ rate, base?, amount }], total }` |
| `mentions`         | object  | no       | —                     | Ready-made mentions: `{ notVatRegistered?, vatExcluded?, paymentDays?, thanks? }`                       |
| `notes`            | text[]  | no       | 3 × 300, 4 lines each | Free remarks                                                                                            |

### Payment part

| Field                        | Type | Required | Limit | Description                                                                      |
| ---------------------------- | ---- | -------- | ----- | -------------------------------------------------------------------------------- |
| `payment.account`            | text | yes      | —     | IBAN or QR-IBAN of the issuer, from Switzerland or Liechtenstein                 |
| `payment.reference`          | text | no       | —     | QR reference (with a QR-IBAN) or Creditor Reference (`RF…`)                      |
| `payment.message`            | text | no       | —     | 140 characters with the billing information; by default the title and the number |
| `payment.billingInformation` | text | no       | —     | Coded billing information starting with `//`, e.g. Swico                         |

Without `payment`, the invoice has no payment part.

### Look

| Field           | Type                         | Required | Limit | Description                                                                   |
| --------------- | ---------------------------- | -------- | ----- | ----------------------------------------------------------------------------- |
| `amountFormat`  | `space` `apostrophe`         | no       | —     | `1 234.50` (default, as on the payment part) or `1'234.50`                    |
| `addressWindow` | `left` `right`               | no       | —     | Window of the envelope for the recipient; `left` by default                   |
| `theme`         | name or `{ name?, accent? }` | no       | —     | `standard` (default), `business` or `modern`, and one accent colour `#RRGGBB` |

## Themes

A theme changes only the look of the invoice, never its layout: the positions, the limits and the payment part stay the same, and the payment part is always black on white, as the style guide of the QR-bill requires.

| Theme                | Title  | Table header                                 | Rows                           | Total  | Default accent      |
| -------------------- | ------ | -------------------------------------------- | ------------------------------ | ------ | ------------------- |
| `standard` (default) | black  | black text over a rule of the accent         | white                          | black  | grey `#555555`      |
| `business`           | accent | band filled with the accent, white text      | white                          | accent | dark blue `#1F3A5F` |
| `modern`             | accent | light tint of the accent, text in the accent | every other row lightly tinted | accent | teal `#0F766E`      |

`modern` also draws a thin bar of the accent along the top of each page. One accent colour, written `#RRGGBB`, replaces the default: `theme: { name: 'business', accent: '#C2410C' }`. The tints are derived from it, and every text stays readable, with a contrast of at least 4.5:1 on its background (level AA of WCAG 2): a text written in the accent is darkened when needed, and the band of `business` takes black text when the accent is too light for white. A light accent such as a bright yellow therefore makes a dark olive title and total: when a brand has a light colour and a darker one, the darker one usually makes the better accent.

## Amounts

With `totals`, the amounts given are printed as they are, and nothing is computed. Otherwise:

- **A line**: its `amount`, or its `quantity` (1 when absent) × `unitPrice`, rounded to the centime. A line with neither is a line of text.
- **The VAT** is computed per rate on the sum of the lines at that rate, not line by line, so that roundings do not add up. Prices exclude VAT by default, and the VAT is added to the total. With `pricesIncludeVAT`, the VAT is the part of the gross amount that is VAT: gross × rate / (100 + rate).
- **Roundings** are commercial (half away from zero), to the centime. With `roundTo5Centimes`, the total is rounded to 5 centimes and, when that changes it, a rounding line says by how much.
- The total stays within ±999 999 999.99, the limit of a QR-bill.

## The payment part

Its amount is always the total of the invoice. Its creditor is the issuer, its debtor the recipient.

- **A positive total** is the amount to pay.
- **A total of 0.00** makes the payment part a notification, as chapter 4.4 of the SIX Implementation Guidelines requires: its message becomes "DO NOT USE FOR PAYMENT" in the language of the invoice ("NE PAS UTILISER POUR LE PAIEMENT", "NICHT ZUR ZAHLUNG VERWENDEN"…).
- **A negative total** (a credit note) has no payment part; the invoice is produced all the same.

A problem of the payment part is reported where it is in the invoice: `['payment', 'account']`, `['payment', 'reference']`, `['currency']` for a QR-IBAN with euros. The codes are those of the QR-bill (`invalid_iban`, `qr_iban_requires_qr_reference`…).

## Problems

Each problem has a stable `code`, the `path` of the field (`['items', 2, 'unitPrice']`) and an English `message`. Besides the codes of the QR-bill, which the addresses and the payment part reuse:

| Code                 | Meaning                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `invalid_type`       | The value has the wrong type                                                                                           |
| `required`           | A required field is missing or blank                                                                                   |
| `too_long`           | A text is longer than its limit                                                                                        |
| `too_many`           | A list has more entries than its limit                                                                                 |
| `too_many_lines`     | A text has more lines than its limit                                                                                   |
| `invalid_characters` | A line break or a control character in a field on one line; for an address, a character outside the set of the QR-bill |
| `invalid_language`   | Not `de`, `fr`, `it`, `rm` or `en`                                                                                     |
| `invalid_currency`   | Not `CHF` or `EUR`                                                                                                     |
| `invalid_date`       | Not a date written `YYYY-MM-DD`                                                                                        |
| `invalid_number`     | Not a number with the decimals allowed                                                                                 |
| `out_of_range`       | A number, an amount or the total out of its range                                                                      |
| `invalid_country`    | Not a two-letter ISO 3166-1 code                                                                                       |
| `invalid_uid`        | Not a UID, or a wrong check digit                                                                                      |
| `invalid_email`      | Not an e-mail address                                                                                                  |
| `invalid_option`     | Not one of the values allowed                                                                                          |
| `invalid_color`      | Not a colour written `#RRGGBB`                                                                                         |
| `unsupported_logo`   | The logo is not a PNG or JPEG file, or one that cannot be read                                                         |
| `logo_too_large`     | The logo file is larger than 2 MB                                                                                      |
