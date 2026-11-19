// Test data shared by the test files. Names and addresses are the fictional ones of the SIX examples.
import type { IssueCode, QRBillInput } from '../src/index.js';
import { validateQRBill } from '../src/index.js';

/** A regular IBAN (IID 00791). */
export const IBAN = 'CH5800791123000889012';
/** A QR-IBAN (QR-IID 31999). */
export const QR_IBAN = 'CH4431999123000889012';
/** The QR reference of the worked example of Annex B. */
export const QR_REFERENCE = '210000000003139471430009017';
/** A Creditor Reference of the SIX examples. */
export const CREDITOR_REFERENCE = 'RF18539007547034';

/** A valid bill with a regular IBAN and no reference. */
export const base: QRBillInput = {
  currency: 'CHF',
  amount: '1949.75',
  creditor: {
    account: IBAN,
    name: 'Muster Krankenkasse',
    street: 'Musterstrasse',
    buildingNumber: '12',
    postalCode: '8000',
    town: 'Seldwyla',
    country: 'CH',
  },
  debtor: {
    name: 'Pia Rutschmann',
    street: 'Marktgasse',
    buildingNumber: '28',
    postalCode: '9400',
    town: 'Rorschach',
    country: 'CH',
  },
};

/** The codes of every issue found in `input`, in order; empty when the bill is valid. */
export function codes(input: unknown): IssueCode[] {
  const result = validateQRBill(input);
  return result.success ? [] : result.issues.map((issue) => issue.code);
}

/** The codes of the issues found at `path` (e.g. "creditor.account"). */
export function issueAt(input: unknown, path: string): IssueCode[] {
  const result = validateQRBill(input);
  return result.success
    ? []
    : result.issues.filter((issue) => issue.path.join('.') === path).map((issue) => issue.code);
}
