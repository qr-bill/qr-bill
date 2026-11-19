import { describe, expect, it } from 'vitest';
import { QRBillValidationError, createQRBill } from '../../src/index.js';
import { CREDITOR_REFERENCE, IBAN, base } from '../fixtures.js';

describe('createQRBill', () => {
  it('normalizes the input', () => {
    const bill = createQRBill({
      ...base,
      amount: 1949.75,
      creditor: {
        ...base.creditor,
        account: 'ch58 0079 1123 0008 8901 2',
        name: '  Muster Krankenkasse ',
        country: 'ch',
      },
      reference: 'rf18 5390 0754 7034',
    });
    expect(bill.amount).toBe('1949.75');
    expect(bill.creditor.account).toBe(IBAN);
    expect(bill.creditor.name).toBe('Muster Krankenkasse');
    expect(bill.creditor.country).toBe('CH');
    expect(bill.reference).toBe(CREDITOR_REFERENCE);
    expect(bill.referenceType).toBe('SCOR');
  });

  it('turns decomposed Unicode (as typed on macOS) into the allowed composed form', () => {
    const decomposed = `Zu${String.fromCharCode(0x308)}rich`;
    expect(createQRBill({ ...base, creditor: { ...base.creditor, town: decomposed } }).creditor.town).toBe('Zürich');
  });

  it('leaves out empty optional fields instead of keeping empty strings', () => {
    const bill = createQRBill({ ...base, amount: '', reference: '', message: '  ', debtor: undefined });
    expect(bill).not.toHaveProperty('amount');
    expect(bill).not.toHaveProperty('message');
    expect(bill).not.toHaveProperty('debtor');
    expect(bill.referenceType).toBe('NON');
    expect(bill).not.toHaveProperty('reference');
  });

  it('returns a deeply frozen bill', () => {
    const bill = createQRBill({ ...base, alternativeProcedures: ['eBill/B/a@b.ch'] });
    expect(Object.isFrozen(bill)).toBe(true);
    expect(Object.isFrozen(bill.creditor)).toBe(true);
    expect(Object.isFrozen(bill.alternativeProcedures)).toBe(true);
  });

  it('throws a QRBillValidationError listing every issue', () => {
    const create = () => createQRBill({ ...base, currency: 'USD' as never, amount: '-1' });
    expect(create).toThrow(QRBillValidationError);
    expect(create).toThrow(
      'Invalid QR-bill: currency: Currency must be "CHF" or "EUR"; amount: Expected an amount with at most two decimals, "." as separator, e.g. "1949.75"',
    );
    try {
      create();
    } catch (error) {
      expect(error).toBeInstanceOf(QRBillValidationError);
      expect((error as QRBillValidationError).name).toBe('QRBillValidationError');
      expect((error as QRBillValidationError).issues.map((issue) => issue.code)).toEqual([
        'invalid_currency',
        'invalid_amount',
      ]);
    }
  });

  it('summarizes an issue on the bill as a whole without a path', () => {
    expect(() => createQRBill(null as never)).toThrow('Invalid QR-bill: Expected a QR-bill object');
  });
});
