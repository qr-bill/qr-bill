/**
 * Texts printed on the invoice, in the five languages of the QR-bill. The Romansh texts are to be reviewed by a
 * native speaker.
 *
 * @module
 */

import type { Language } from '@qr-bill/core';
import type { InvoiceLabels } from './labels.types.js';

/** The texts of an invoice, by language. */
export const INVOICE_LABELS: Readonly<Record<Language, InvoiceLabels>> = {
  de: { invoice: 'Rechnung' },
  fr: { invoice: 'Facture' },
  it: { invoice: 'Fattura' },
  en: { invoice: 'Invoice' },
  rm: { invoice: 'Quint' },
};
