/**
 * Texts printed on the invoice, in the five languages of the QR-bill. The Romansh texts are a draft, to be reviewed
 * by a native speaker. The VAT number is followed by MWST, TVA or IVA, the suffixes of the Swiss Federal Tax
 * Administration; English and Romansh use MWST.
 *
 * @module
 */

import type { Language } from '@qr-bill/core';
import type { InvoiceLabels } from './labels.types.js';

/** The texts of an invoice, by language. */
export const INVOICE_LABELS: Readonly<Record<Language, InvoiceLabels>> = {
  de: {
    invoice: 'Rechnung',
    number: 'Rechnungsnummer',
    date: 'Datum',
    dueDate: 'Fällig am',
    servicePeriod: 'Leistungszeitraum',
    customerReference: 'Ihre Referenz',
    subject: 'Betreff: ',
    description: 'Bezeichnung',
    quantity: 'Menge',
    unit: 'Einheit',
    unitPrice: 'Preis',
    vat: 'MWST',
    amount: 'Betrag',
    subtotal: 'Zwischensumme',
    vatOn: 'MWST {rate} % auf {base}',
    vatIncluded: 'Inkl. MWST {rate} % auf {base}',
    vatRate: 'MWST {rate} %',
    rounding: 'Rundung',
    total: 'Total',
    page: 'Seite {page}/{pages}',
    vatNumberSuffix: 'MWST',
    notVatRegistered: 'Nicht MWST-pflichtig.',
    vatExcluded: 'Von der MWST ausgenommene Leistung.',
    paymentDays: 'Zahlbar innert {days} Tagen.',
    thanks: 'Vielen Dank für Ihr Vertrauen.',
  },
  fr: {
    invoice: 'Facture',
    number: 'N° de facture',
    date: 'Date',
    dueDate: 'Échéance',
    servicePeriod: 'Période',
    customerReference: 'Votre référence',
    subject: 'Objet : ',
    description: 'Désignation',
    quantity: 'Qté',
    unit: 'Unité',
    unitPrice: 'Prix unit.',
    vat: 'TVA',
    amount: 'Montant',
    subtotal: 'Sous-total',
    vatOn: 'TVA {rate} % sur {base}',
    vatIncluded: 'Dont TVA {rate} % sur {base}',
    vatRate: 'TVA {rate} %',
    rounding: 'Arrondi',
    total: 'Total',
    page: 'Page {page}/{pages}',
    vatNumberSuffix: 'TVA',
    notVatRegistered: 'Non assujetti à la TVA.',
    vatExcluded: 'Prestation exclue du champ de la TVA.',
    paymentDays: 'Payable dans les {days} jours.',
    thanks: 'Merci pour votre confiance.',
  },
  it: {
    invoice: 'Fattura',
    number: 'N. fattura',
    date: 'Data',
    dueDate: 'Scadenza',
    servicePeriod: 'Periodo',
    customerReference: 'Vostro riferimento',
    subject: 'Oggetto: ',
    description: 'Descrizione',
    quantity: 'Qtà',
    unit: 'Unità',
    unitPrice: 'Prezzo unit.',
    vat: 'IVA',
    amount: 'Importo',
    subtotal: 'Subtotale',
    vatOn: 'IVA {rate} % su {base}',
    vatIncluded: 'Di cui IVA {rate} % su {base}',
    vatRate: 'IVA {rate} %',
    rounding: 'Arrotondamento',
    total: 'Totale',
    page: 'Pagina {page}/{pages}',
    vatNumberSuffix: 'IVA',
    notVatRegistered: "Non assoggettato all'IVA.",
    vatExcluded: "Prestazione esclusa dall'IVA.",
    paymentDays: 'Pagabile entro {days} giorni.',
    thanks: 'Grazie per la vostra fiducia.',
  },
  en: {
    invoice: 'Invoice',
    number: 'Invoice no.',
    date: 'Date',
    dueDate: 'Due date',
    servicePeriod: 'Period',
    customerReference: 'Your reference',
    subject: 'Subject: ',
    description: 'Description',
    quantity: 'Qty',
    unit: 'Unit',
    unitPrice: 'Unit price',
    vat: 'VAT',
    amount: 'Amount',
    subtotal: 'Subtotal',
    vatOn: 'VAT {rate} % on {base}',
    vatIncluded: 'Incl. VAT {rate} % on {base}',
    vatRate: 'VAT {rate} %',
    rounding: 'Rounding',
    total: 'Total',
    page: 'Page {page}/{pages}',
    vatNumberSuffix: 'MWST',
    notVatRegistered: 'Not registered for VAT.',
    vatExcluded: 'Supply excluded from VAT.',
    paymentDays: 'Payable within {days} days.',
    thanks: 'Thank you for your trust.',
  },
  rm: {
    invoice: 'Quint',
    number: 'Nr. dal quint',
    date: 'Data',
    dueDate: 'Termin da pajament',
    servicePeriod: 'Perioda',
    customerReference: 'Vossa referenza',
    subject: 'Object: ',
    description: 'Descripziun',
    quantity: 'Quantitad',
    unit: 'Unitad',
    unitPrice: 'Pretsch unitar',
    vat: 'TPV',
    amount: 'Import',
    subtotal: 'Subtotal',
    vatOn: 'TPV {rate} % sin {base}',
    vatIncluded: 'Incl. TPV {rate} % sin {base}',
    vatRate: 'TPV {rate} %',
    rounding: 'Arrundaziun',
    total: 'Total',
    page: 'Pagina {page}/{pages}',
    vatNumberSuffix: 'MWST',
    notVatRegistered: 'Betg suttamess a la TPV.',
    vatExcluded: 'Prestaziun exclusa da la TPV.',
    paymentDays: 'Da pajar entaifer {days} dis.',
    thanks: 'Grazia fitg per Vossa fidanza.',
  },
};

/**
 * Fills the placeholders of a template, written in braces.
 *
 * @param template - A text of {@link InvoiceLabels} such as `"VAT {rate} % on {base}"`.
 * @param values - The value of each placeholder.
 * @returns The text.
 * @example
 * ```ts
 * fill('Page {page}/{pages}', { page: 1, pages: 3 }); // 'Page 1/3'
 * ```
 */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}
