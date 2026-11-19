/**
 * Texts printed on the payment part and the receipt, in the five correspondence languages (SIX IG QR-bill v2.4,
 * Annex C, table 23).
 *
 * @module
 */

import type { Labels, Language } from './labels.types.js';

/**
 * The text literals of the payment part and the receipt, by language.
 *
 * @example
 * ```ts
 * LABELS.fr.paymentPart; // 'Section paiement'
 * ```
 */
export const LABELS: Readonly<Record<Language, Labels>> = {
  de: {
    paymentPart: 'Zahlteil',
    receipt: 'Empfangsschein',
    accountPayableTo: 'Konto / Zahlbar an',
    reference: 'Referenz',
    additionalInformation: 'Zusätzliche Informationen',
    payableBy: 'Zahlbar durch',
    payableByNameAddress: 'Zahlbar durch (Name/Adresse)',
    currency: 'Währung',
    amount: 'Betrag',
    acceptancePoint: 'Annahmestelle',
    separateBeforePayingIn: 'Vor der Einzahlung abzutrennen',
    doNotUseForPayment: 'NICHT ZUR ZAHLUNG VERWENDEN',
  },
  fr: {
    paymentPart: 'Section paiement',
    receipt: 'Récépissé',
    accountPayableTo: 'Compte / Payable à',
    reference: 'Référence',
    additionalInformation: 'Informations supplémentaires',
    payableBy: 'Payable par',
    payableByNameAddress: 'Payable par (nom/adresse)',
    currency: 'Monnaie',
    amount: 'Montant',
    acceptancePoint: 'Point de dépôt',
    separateBeforePayingIn: 'A détacher avant le versement',
    doNotUseForPayment: 'NE PAS UTILISER POUR LE PAIEMENT',
  },
  it: {
    paymentPart: 'Sezione pagamento',
    receipt: 'Ricevuta',
    accountPayableTo: 'Conto / Pagabile a',
    reference: 'Riferimento',
    additionalInformation: 'Informazioni supplementari',
    payableBy: 'Pagabile da',
    payableByNameAddress: 'Pagabile da (nome/indirizzo)',
    currency: 'Valuta',
    amount: 'Importo',
    acceptancePoint: 'Punto di accettazione',
    separateBeforePayingIn: 'Da staccare prima del versamento',
    doNotUseForPayment: 'NON UTILIZZARE PER IL PAGAMENTO',
  },
  en: {
    paymentPart: 'Payment part',
    receipt: 'Receipt',
    accountPayableTo: 'Account / Payable to',
    reference: 'Reference',
    additionalInformation: 'Additional information',
    payableBy: 'Payable by',
    payableByNameAddress: 'Payable by (name/address)',
    currency: 'Currency',
    amount: 'Amount',
    acceptancePoint: 'Acceptance point',
    separateBeforePayingIn: 'Separate before paying in',
    doNotUseForPayment: 'DO NOT USE FOR PAYMENT',
  },
  rm: {
    paymentPart: 'Part da pajament',
    receipt: 'Quittanza',
    accountPayableTo: 'Conto / Da pajar a',
    reference: 'Referenza',
    additionalInformation: 'Infurmaziuns supplementaras',
    payableBy: 'Da pajar da',
    payableByNameAddress: 'Da pajar da (num/adressa)',
    currency: 'Valuta',
    amount: 'Import',
    acceptancePoint: 'Post da recepziun',
    separateBeforePayingIn: 'Da distatgar avant che pajar',
    doNotUseForPayment: 'BETG DUVRAR PER IL PAJAMENT',
  },
};

/**
 * The five "DO NOT USE FOR PAYMENT" texts (chapter 4.4, table 10). A bill with the amount 0.00 is a notification
 * and must carry one of them, exactly, as its message.
 */
export const DO_NOT_USE_FOR_PAYMENT: readonly string[] = Object.values(LABELS).map(
  (labels) => labels.doNotUseForPayment,
);
