import { describe, expect, it } from 'vitest';
import type { InvoiceIssue } from '../../src/invoice/invoice.types.js';
import { validateInvoice } from '../../src/invoice/invoice.validator.js';
import { INVOICE_LIMITS } from '../../src/invoice/limits.js';
import { IBAN, ISSUER, JPEG, PNG, QR_IBAN, QR_REFERENCE, RECIPIENT, UID, invoiceInput, text } from '../fixtures.js';

/** The issues of an invalid invoice, without their messages. */
function issuesOf(input: unknown): Pick<InvoiceIssue, 'code' | 'path'>[] {
  const result = validateInvoice(input);
  if (result.success) throw new Error('Expected an invalid invoice');
  return result.issues.map(({ code, path }) => ({ code, path }));
}

/** The data of a valid invoice. */
function dataOf(input: unknown) {
  const result = validateInvoice(input);
  if (!result.success) throw new Error(`Expected a valid invoice: ${JSON.stringify(result.issues)}`);
  return result.data;
}

describe('validateInvoice: a valid invoice', () => {
  it('normalizes a minimal invoice and fills in the defaults', () => {
    const data = dataOf(invoiceInput());
    expect(data).toEqual({
      language: 'fr',
      currency: 'CHF',
      title: 'Facture',
      date: '2026-11-20',
      extraFields: [],
      issuer: { ...ISSUER, extraLines: [], phones: [], vatRegistered: false },
      recipient: { ...RECIPIENT, extraLines: [] },
      lines: [{ description: 'Conseil', quantity: '6', unitPrice: '150.00', vatRate: '8.1' }],
      pricesIncludeVAT: false,
      totals: {
        lines: ['900.00'],
        subtotal: '900.00',
        vat: [{ rate: '8.1', base: '900.00', amount: '72.90' }],
        total: '972.90',
      },
      totalsProvided: false,
      mentions: {},
      notes: [],
      amountFormat: 'space',
      addressWindow: 'left',
      theme: { name: 'standard' },
    });
    expect(Object.isFrozen(data)).toBe(true);
    expect(Object.isFrozen(data.issuer)).toBe(true);
    expect(Object.isFrozen(data.lines[0])).toBe(true);
  });

  it('titles the invoice in its language by default', () => {
    const titles = (['de', 'fr', 'it', 'en', 'rm'] as const).map(
      (language) => dataOf(invoiceInput({ language })).title,
    );
    expect(titles).toEqual(['Rechnung', 'Facture', 'Fattura', 'Invoice', 'Quint']);
  });

  it('keeps every optional field, normalized', () => {
    const data = dataOf(
      invoiceInput({
        currency: 'CHF',
        title: '  Avoir ',
        number: '2026-042',
        dueDate: '2026-12-20',
        servicePeriod: 'Novembre 2026',
        customerReference: 'Commande 4711',
        extraFields: [{ label: 'N° client', value: '4711' }],
        subject: 'Prestations de novembre',
        introduction: 'Madame,\r\nvoici notre facture.',
        closing: 'Avec nos salutations.',
        issuer: {
          ...ISSUER,
          logo: PNG,
          extraLines: ['Service des membres', '  '],
          phones: ['+41 44 123 45 67', '+41 79 123 45 67'],
          email: 'info@muster.example',
          contact: 'www.muster.example',
          uid: 'che 123 456 788 tva',
          vatRegistered: true,
        },
        recipient: { ...RECIPIENT, salutation: 'Madame', extraLines: ['c/o Muster'], country: 'ch' },
        items: [
          { description: 'Conseil', quantity: '6', unit: 'h', unitPrice: '150', vatRate: '8.1' },
          { description: 'Une ligne de texte' },
        ],
        mentions: { notVatRegistered: false, vatExcluded: true, paymentDays: 30, thanks: true },
        notes: ['Merci.', ''],
        amountFormat: 'apostrophe',
        addressWindow: 'right',
        theme: { name: 'business', accent: '#0a7d3b' },
        payment: { account: QR_IBAN, reference: QR_REFERENCE },
      }),
    );
    expect(data).toMatchObject({
      title: 'Avoir',
      number: '2026-042',
      dueDate: '2026-12-20',
      servicePeriod: 'Novembre 2026',
      customerReference: 'Commande 4711',
      extraFields: [{ label: 'N° client', value: '4711' }],
      subject: 'Prestations de novembre',
      introduction: 'Madame,\nvoici notre facture.',
      closing: 'Avec nos salutations.',
      issuer: {
        logo: { format: 'png', bytes: PNG },
        extraLines: ['Service des membres'],
        phones: ['+41 44 123 45 67', '+41 79 123 45 67'],
        email: 'info@muster.example',
        contact: 'www.muster.example',
        uid: UID,
        vatRegistered: true,
      },
      recipient: { salutation: 'Madame', extraLines: ['c/o Muster'], country: 'CH' },
      lines: [{ description: 'Conseil', quantity: '6', unit: 'h' }, { description: 'Une ligne de texte' }],
      mentions: { notVatRegistered: false, vatExcluded: true, paymentDays: 30, thanks: true },
      notes: ['Merci.'],
      amountFormat: 'apostrophe',
      addressWindow: 'right',
      theme: { name: 'business', accent: '#0A7D3B' },
    });
    expect(data.bill).toMatchObject({
      amount: '972.90',
      message: 'Avoir 2026-042',
      creditor: { ...ISSUER, account: 'CH4431999123000889012' },
      debtor: RECIPIENT,
      reference: QR_REFERENCE,
    });
  });

  it('accepts an address without street nor building number, and mentions without payment days', () => {
    const data = dataOf(
      invoiceInput({
        recipient: { name: 'Simon Muster', postalCode: '8000', town: 'Seldwyla', country: 'CH' },
        mentions: { thanks: true },
      }),
    );
    expect(data.recipient).toEqual({
      name: 'Simon Muster',
      postalCode: '8000',
      town: 'Seldwyla',
      country: 'CH',
      extraLines: [],
    });
    expect(data.mentions).toEqual({ thanks: true });
  });

  it('accepts a JPEG logo, a theme given by its name, and a theme without name', () => {
    expect(dataOf(invoiceInput({ issuer: { ...ISSUER, logo: JPEG } })).issuer.logo?.format).toBe('jpeg');
    expect(dataOf(invoiceInput({ theme: 'modern' })).theme).toEqual({ name: 'modern' });
    expect(dataOf(invoiceInput({ theme: { accent: ' #ffffff ' } })).theme).toEqual({
      name: 'standard',
      accent: '#FFFFFF',
    });
  });

  it('prints totals given by the caller as they are', () => {
    const data = dataOf(
      invoiceInput({
        items: [{ description: 'Abonnement', amount: '100.00' }],
        totals: {
          subtotal: '100',
          vat: [
            { rate: 8.1, base: '100', amount: '8.10' },
            { rate: '0', amount: 0 },
          ],
          total: '108.10',
        },
        payment: { account: IBAN },
      }),
    );
    expect(data.totalsProvided).toBe(true);
    expect(data.totals).toEqual({
      lines: ['100.00'],
      subtotal: '100.00',
      vat: [
        { rate: '8.1', base: '100.00', amount: '8.10' },
        { rate: '0', amount: '0.00' },
      ],
      total: '108.10',
    });
    expect(data.bill?.amount).toBe('108.10');
    expect(dataOf(invoiceInput({ totals: { total: '5' } })).totals).toEqual({
      lines: ['900.00'],
      vat: [],
      total: '5.00',
    });
  });
});

describe('validateInvoice: the payment part', () => {
  it('pays the total of the invoice, with the title and number as message unless one is given', () => {
    expect(dataOf(invoiceInput({ number: '42', payment: { account: IBAN } })).bill).toMatchObject({
      amount: '972.90',
      message: 'Facture 42',
    });
    expect(dataOf(invoiceInput({ payment: { account: IBAN } })).bill).not.toHaveProperty('message');
    expect(dataOf(invoiceInput({ number: '42', payment: { account: IBAN, message: 'Merci' } })).bill?.message).toBe(
      'Merci',
    );
  });

  it('turns a total of 0.00 into a notification, in the language of the invoice (chapter 4.4)', () => {
    const bill = dataOf(
      invoiceInput({
        language: 'de',
        items: [{ description: 'Gutschrift', amount: '0' }],
        payment: { account: IBAN, message: 'Bitte bezahlen' },
      }),
    ).bill;
    expect(bill).toMatchObject({ amount: '0.00', message: 'NICHT ZUR ZAHLUNG VERWENDEN' });
  });

  it('has no payment part for a negative total (a credit note), nor without payment', () => {
    const credit = dataOf(
      invoiceInput({ items: [{ description: 'Avoir', amount: '-50' }], payment: { account: IBAN } }),
    );
    expect(credit.totals.total).toBe('-50.00');
    expect(credit.bill).toBeUndefined();
    expect(dataOf(invoiceInput()).bill).toBeUndefined();
  });

  it('reports the problems of the payment part where they are in the invoice', () => {
    expect(issuesOf(invoiceInput({ payment: { account: 'CH00' } }))).toEqual([
      { code: 'invalid_iban', path: ['payment', 'account'] },
    ]);
    expect(issuesOf(invoiceInput({ payment: {} }))).toEqual([{ code: 'required', path: ['payment', 'account'] }]);
    expect(issuesOf(invoiceInput({ payment: { account: IBAN, reference: QR_REFERENCE } }))).toEqual([
      { code: 'qr_reference_requires_qr_iban', path: ['payment', 'reference'] },
    ]);
    expect(issuesOf(invoiceInput({ currency: 'EUR', payment: { account: QR_IBAN, reference: QR_REFERENCE } }))).toEqual(
      [{ code: 'qr_iban_requires_chf', path: ['currency'] }],
    );
    expect(
      issuesOf(
        invoiceInput({
          payment: { account: IBAN, message: text(100), billingInformation: `//S1/10/${text(40, '1')}` },
        }),
      ),
    ).toEqual([{ code: 'additional_information_too_long', path: ['payment'] }]);
    expect(issuesOf(invoiceInput({ payment: 'CH44' }))).toEqual([{ code: 'invalid_type', path: ['payment'] }]);
  });

  it('reports a problem of the issuer or the recipient once, not again as creditor or debtor', () => {
    expect(issuesOf(invoiceInput({ issuer: { ...ISSUER, name: '' }, payment: { account: IBAN } }))).toEqual([
      { code: 'required', path: ['issuer', 'name'] },
    ]);
    expect(issuesOf(invoiceInput({ recipient: { ...RECIPIENT, town: 5 }, payment: { account: IBAN } }))).toEqual([
      { code: 'invalid_type', path: ['recipient', 'town'] },
    ]);
    expect(issuesOf(invoiceInput({ issuer: 'Max', recipient: 'Pia', payment: { account: IBAN } }))).toEqual([
      { code: 'invalid_type', path: ['issuer'] },
      { code: 'invalid_type', path: ['recipient'] },
    ]);
  });

  it('adds no problem of its own when the language or the total are wrong', () => {
    expect(
      issuesOf(
        invoiceInput({
          language: 'es',
          number: '1',
          items: [{ description: 'A', amount: '0' }],
          payment: { account: IBAN },
        }),
      ),
    ).toEqual([{ code: 'invalid_language', path: ['language'] }]);
    expect(
      issuesOf(
        invoiceInput({
          items: [
            { description: 'A', amount: '999999999.99' },
            { description: 'B', amount: '1' },
          ],
          payment: { account: IBAN },
        }),
      ),
    ).toEqual([{ code: 'out_of_range', path: ['items'] }]);
  });
});

describe('validateInvoice: problems', () => {
  it('rejects what is not an invoice', () => {
    for (const input of [null, undefined, 'invoice', [], 42]) {
      expect(issuesOf(input)).toEqual([{ code: 'invalid_type', path: [] }]);
    }
  });

  it('reports the required fields', () => {
    expect(issuesOf({ language: 'fr' })).toEqual([
      { code: 'required', path: ['date'] },
      { code: 'required', path: ['issuer'] },
      { code: 'required', path: ['recipient'] },
      { code: 'required', path: ['items'] },
    ]);
    expect(issuesOf(invoiceInput({ date: '  ', items: [] }))).toEqual([
      { code: 'required', path: ['date'] },
      { code: 'required', path: ['items'] },
    ]);
    expect(
      issuesOf(
        invoiceInput({
          extraFields: [{ label: ' ', value: '1' }],
          items: [{ description: '' }, { description: 'Hours', quantity: 2 }],
        }),
      ),
    ).toEqual([
      { code: 'required', path: ['extraFields', 0, 'label'] },
      { code: 'required', path: ['items', 0, 'description'] },
      { code: 'required', path: ['items', 1, 'unitPrice'] },
    ]);
    expect(issuesOf(invoiceInput({ totals: { vat: [{ base: '1' }] } }))).toEqual([
      { code: 'required', path: ['totals', 'total'] },
      { code: 'required', path: ['totals', 'vat', 0, 'rate'] },
      { code: 'required', path: ['totals', 'vat', 0, 'amount'] },
    ]);
  });

  it('reports values of the wrong type', () => {
    expect(
      issuesOf(
        invoiceInput({
          title: 5,
          items: 'Conseil',
          issuer: { ...ISSUER, street: 7, country: 41, logo: 'logo.png', extraLines: 'x', vatRegistered: 'yes' },
          recipient: 3,
          extraFields: ['x'],
          pricesIncludeVAT: 1,
          totals: 'x',
          mentions: 'x',
          theme: 5,
        }),
      ),
    ).toEqual([
      { code: 'invalid_type', path: ['title'] },
      { code: 'invalid_type', path: ['extraFields', 0] },
      { code: 'invalid_type', path: ['issuer', 'street'] },
      { code: 'invalid_type', path: ['issuer', 'country'] },
      { code: 'invalid_type', path: ['issuer', 'logo'] },
      { code: 'invalid_type', path: ['issuer', 'extraLines'] },
      { code: 'invalid_type', path: ['issuer', 'vatRegistered'] },
      { code: 'invalid_type', path: ['recipient'] },
      { code: 'invalid_type', path: ['items'] },
      { code: 'invalid_type', path: ['pricesIncludeVAT'] },
      { code: 'invalid_type', path: ['totals'] },
      { code: 'invalid_type', path: ['mentions'] },
      { code: 'invalid_type', path: ['theme'] },
    ]);
    expect(issuesOf(invoiceInput({ items: [5], totals: { total: '1', vat: ['x'] } }))).toEqual([
      { code: 'invalid_type', path: ['items', 0] },
      { code: 'invalid_type', path: ['totals', 'vat', 0] },
    ]);
  });

  it('reports texts that are too long, have too many lines or entries, or contain control characters', () => {
    const L = INVOICE_LIMITS;
    expect(
      issuesOf(
        invoiceInput({
          title: text(L.title + 1),
          introduction: Array.from({ length: L.introductionLines + 1 }, () => 'line').join('\n'),
          closing: text(L.closing + 1),
          issuer: { ...ISSUER, name: text(L.issuer.name + 1), phones: ['1', '2', '3'] },
          items: [
            { description: Array.from({ length: L.descriptionLines + 1 }, () => 'x').join('\n') },
            { description: 'Tab\tinside' },
            { description: 'Fine', unit: text(L.unit + 1) },
          ],
          notes: [text(L.note + 1), 'a\nb\nc\nd\ne'],
          subject: 'Two\nlines',
        }),
      ),
    ).toEqual([
      { code: 'too_long', path: ['title'] },
      { code: 'invalid_characters', path: ['subject'] },
      { code: 'too_many_lines', path: ['introduction'] },
      { code: 'too_long', path: ['closing'] },
      { code: 'too_long', path: ['issuer', 'name'] },
      { code: 'too_many', path: ['issuer', 'phones'] },
      { code: 'too_many_lines', path: ['items', 0, 'description'] },
      { code: 'invalid_characters', path: ['items', 1, 'description'] },
      { code: 'too_long', path: ['items', 2, 'unit'] },
      { code: 'too_long', path: ['notes', 0] },
      { code: 'too_many_lines', path: ['notes', 1] },
    ]);
    expect(
      issuesOf(
        invoiceInput({
          items: Array.from({ length: L.items + 1 }, () => ({ description: 'x' })),
          notes: ['1', '2', '3', '4'],
          extraFields: Array.from({ length: 4 }, () => ({ label: 'a', value: 'b' })),
          totals: { total: '1', vat: Array.from({ length: 11 }, () => ({ rate: '8.1', amount: '1' })) },
        }),
      ),
    ).toEqual([
      { code: 'too_many', path: ['extraFields'] },
      { code: 'too_many', path: ['items'] },
      { code: 'too_many', path: ['totals', 'vat'] },
      { code: 'too_many', path: ['notes'] },
    ]);
  });

  it('applies the rules of the QR-bill to the addresses: character set, country', () => {
    expect(issuesOf(invoiceInput({ recipient: { ...RECIPIENT, name: 'Pia 😀', country: 'CHE' } }))).toEqual([
      { code: 'invalid_characters', path: ['recipient', 'name'] },
      { code: 'invalid_country', path: ['recipient', 'country'] },
    ]);
    expect(issuesOf(invoiceInput({ issuer: { ...ISSUER, country: undefined } }))).toEqual([
      { code: 'required', path: ['issuer', 'country'] },
    ]);
  });

  it('reports a wrong language, currency, date, option, colour, UID or e-mail', () => {
    expect(
      issuesOf(
        invoiceInput({
          language: 'es',
          currency: 'USD',
          date: '2026-02-30',
          dueDate: '20.12.2026',
          issuer: { ...ISSUER, uid: 'CHE-123.456.789', email: 'info(at)muster.example' },
          amountFormat: 'comma',
          addressWindow: 'top',
          theme: { name: 'fancy', accent: 'blue' },
        }),
      ),
    ).toEqual([
      { code: 'invalid_language', path: ['language'] },
      { code: 'invalid_currency', path: ['currency'] },
      { code: 'invalid_date', path: ['date'] },
      { code: 'invalid_date', path: ['dueDate'] },
      { code: 'invalid_email', path: ['issuer', 'email'] },
      { code: 'invalid_uid', path: ['issuer', 'uid'] },
      { code: 'invalid_option', path: ['amountFormat'] },
      { code: 'invalid_option', path: ['addressWindow'] },
      { code: 'invalid_option', path: ['theme', 'name'] },
      { code: 'invalid_color', path: ['theme', 'accent'] },
    ]);
    expect(issuesOf(invoiceInput({ date: '2026-13-01', theme: 'fancy' }))).toEqual([
      { code: 'invalid_date', path: ['date'] },
      { code: 'invalid_option', path: ['theme'] },
    ]);
    expect(issuesOf(invoiceInput({ theme: { accent: 5 } }))).toEqual([
      { code: 'invalid_color', path: ['theme', 'accent'] },
    ]);
  });

  it('reports numbers with too many decimals or out of range', () => {
    expect(
      issuesOf(
        invoiceInput({
          items: [
            { description: 'A', quantity: '1.2345', unitPrice: 'abc', vatRate: '8.123', amount: 1e21 },
            { description: 'B', quantity: '2000000000', unitPrice: '1', vatRate: '101' },
            { description: 'C', amount: '1', vatRate: '-1' },
            { description: 'D', quantity: '1000000000', unitPrice: '1000' },
          ],
          totals: { total: 'x', subtotal: '10000000000' },
          mentions: { paymentDays: 0 },
        }),
      ),
    ).toEqual([
      { code: 'invalid_number', path: ['items', 0, 'quantity'] },
      { code: 'invalid_number', path: ['items', 0, 'unitPrice'] },
      { code: 'invalid_number', path: ['items', 0, 'vatRate'] },
      { code: 'invalid_number', path: ['items', 0, 'amount'] },
      { code: 'out_of_range', path: ['items', 1, 'quantity'] },
      { code: 'out_of_range', path: ['items', 1, 'vatRate'] },
      { code: 'out_of_range', path: ['items', 2, 'vatRate'] },
      { code: 'out_of_range', path: ['items', 3, 'amount'] },
      { code: 'out_of_range', path: ['totals', 'subtotal'] },
      { code: 'invalid_number', path: ['totals', 'total'] },
      { code: 'invalid_number', path: ['mentions', 'paymentDays'] },
    ]);
    for (const paymentDays of [366, 1.5, '30']) {
      expect(issuesOf(invoiceInput({ mentions: { paymentDays } }))).toEqual([
        { code: 'invalid_number', path: ['mentions', 'paymentDays'] },
      ]);
    }
  });

  it('accepts a PNG or JPEG logo up to the limit only', () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const large = new Uint8Array(INVOICE_LIMITS.logoBytes + 1);
    large.set(PNG);
    expect(issuesOf(invoiceInput({ issuer: { ...ISSUER, logo: gif } }))).toEqual([
      { code: 'unsupported_logo', path: ['issuer', 'logo'] },
    ]);
    expect(issuesOf(invoiceInput({ issuer: { ...ISSUER, logo: large } }))).toEqual([
      { code: 'logo_too_large', path: ['issuer', 'logo'] },
    ]);
  });

  it('explains each problem in its message', () => {
    const result = validateInvoice(invoiceInput({ title: text(40), items: [{ description: 'A', vatRate: '200' }] }));
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.issues.map((issue) => issue.message)).toEqual([
      'At most 35 characters, received 40',
      'Expected a number within ±100',
    ]);
  });
});
