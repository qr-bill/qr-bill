/**
 * Types of the texts printed on the payment part and the receipt.
 *
 * @module
 */

/** Correspondence languages of the QR-bill (chapter 3.2): German, French, Italian, English and, since v2.4, Romansh. */
export type Language = 'de' | 'fr' | 'it' | 'en' | 'rm';

/** Text literals of the payment part and the receipt in one language (SIX IG QR-bill v2.4, Annex C, table 23). */
export interface Labels {
  /** Title of the payment part: "Payment part". */
  readonly paymentPart: string;
  /** Title of the receipt: "Receipt". */
  readonly receipt: string;
  /** Heading of the creditor's account and address: "Account / Payable to". */
  readonly accountPayableTo: string;
  /** Heading of the reference: "Reference". */
  readonly reference: string;
  /** Heading of the message and billing information: "Additional information". */
  readonly additionalInformation: string;
  /** Heading of the debtor's address: "Payable by". */
  readonly payableBy: string;
  /** Heading of the blank field left for the debtor's address: "Payable by (name/address)". */
  readonly payableByNameAddress: string;
  /** Heading of the currency: "Currency". */
  readonly currency: string;
  /** Heading of the amount: "Amount". */
  readonly amount: string;
  /** Heading of the receipt's bottom-right field: "Acceptance point". */
  readonly acceptancePoint: string;
  /** Text above the perforation when the bill is printed on paper: "Separate before paying in". */
  readonly separateBeforePayingIn: string;
  /** Message of a notification with amount 0.00 (chapter 4.4): "DO NOT USE FOR PAYMENT". */
  readonly doNotUseForPayment: string;
}
