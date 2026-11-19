import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  QRBillValidationError,
  createQRBill,
  fromCents,
  parseQRBill,
  safeParseQRBill,
  validateQRBill,
} from '../../src/index.js';
import { CREDITOR_REFERENCE, IBAN, QR_IBAN, QR_REFERENCE } from '../fixtures.js';

const valid = createQRBill({
  currency: 'CHF',
  amount: '199.95',
  creditor: {
    account: IBAN,
    name: 'Max Muster & Söhne',
    street: 'Musterstrasse',
    buildingNumber: '123',
    postalCode: '8000',
    town: 'Seldwyla',
    country: 'CH',
  },
  reference: CREDITOR_REFERENCE,
}).payload;

/** The valid payload with line `index` (0-based) replaced. */
function withLine(index: number, value: string): string {
  const lines = valid.split('\n');
  lines[index] = value;
  return lines.join('\n');
}

function firstIssue(payload: string): string | undefined {
  const result = safeParseQRBill(payload);
  return result.success ? undefined : `${result.issues[0]?.code ?? ''}: ${result.issues[0]?.message ?? ''}`;
}

describe('parseQRBill (chapter 7.1)', () => {
  it('accepts empty trailing lines for unused alternative procedures', () => {
    expect(parseQRBill(`${valid}\n\n\n`).payload).toBe(valid);
  });

  it('throws a QRBillValidationError on invalid content', () => {
    expect(() => parseQRBill('hello')).toThrow(QRBillValidationError);
  });

  it.each([
    ['too few lines', 'SPC\n0200', 'invalid_payload: Expected 31 to 34 lines, found 2'],
    ['too many lines', `${valid}\n//S1\na\nb\nc`, 'invalid_payload: Expected 31 to 34 lines, found 35'],
    ['another QR type', withLine(0, 'BCD'), 'invalid_payload: QR type must be "SPC"'],
    ['another version', withLine(1, '0201'), 'invalid_payload: Version must be "0200"'],
    ['another coding', withLine(2, '2'), 'invalid_payload: Coding type must be "1"'],
    ['no trailer', withLine(30, 'END'), 'invalid_payload: Trailer "EPD" expected on line 31'],
    [
      'a combined address (type K)',
      withLine(4, 'K'),
      'invalid_payload: Creditor must be a structured address (type "S")',
    ],
    ['no creditor address type', withLine(4, ''), 'invalid_payload: Creditor must be a structured address (type "S")'],
    ['an ultimate creditor', withLine(12, 'Someone'), 'invalid_payload: Ultimate creditor must not be filled in'],
    [
      'debtor lines without type',
      withLine(21, 'Someone'),
      'invalid_payload: Debtor must be a structured address (type "S") or empty',
    ],
    ['an unknown reference type', withLine(27, 'ABC'), 'invalid_payload: Reference type must be QRR, SCOR or NON'],
    ['type NON with a reference', withLine(27, 'NON'), 'invalid_payload: Reference does not match reference type NON'],
    [
      'type QRR on a Creditor Reference',
      withLine(27, 'QRR'),
      'invalid_payload: Reference does not match reference type QRR',
    ],
    [
      'an invalid amount',
      withLine(18, '1,5'),
      'invalid_amount: Expected an amount with at most two decimals, "." as separator, e.g. "1949.75"',
    ],
  ])('rejects content with %s', (_, payload, expected) => {
    expect(firstIssue(payload)).toBe(expected);
  });
});

describe('round trip', () => {
  const text = (min: number, max: number) =>
    fc
      .string({
        unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzÄÖÜäöüéèàçßőŁ€ 0123456789-.,/&'),
        minLength: min,
        maxLength: max,
      })
      .map((value) => value.trim())
      .filter((value) => value.length >= min);
  const address = fc.record({
    name: text(1, 70),
    street: fc.option(text(1, 70), { nil: undefined }),
    buildingNumber: fc.option(text(1, 16), { nil: undefined }),
    postalCode: text(1, 16),
    town: text(1, 35),
    country: fc.constantFrom('CH', 'LI', 'DE', 'FR', 'IT', 'AT'),
  });

  it('parses every generated payload back to the same bill', () => {
    fc.assert(
      fc.property(
        address,
        fc.option(address, { nil: undefined }),
        fc.option(fc.integer({ min: 1, max: 99_999_999_999 }), { nil: undefined }),
        fc.constantFrom<[string, string | undefined]>(
          [IBAN, undefined],
          [IBAN, CREDITOR_REFERENCE],
          [QR_IBAN, QR_REFERENCE],
        ),
        fc.option(text(1, 60), { nil: undefined }),
        fc.option(
          text(1, 60).map((value) => `//S1/${value}`),
          { nil: undefined },
        ),
        fc.array(text(1, 100), { maxLength: 2 }),
        (creditor, debtor, cents, [account, reference], message, billingInformation, alternativeProcedures) => {
          const result = validateQRBill({
            currency: 'CHF',
            creditor: { ...creditor, account },
            debtor,
            amount: cents === undefined ? undefined : fromCents(cents),
            reference,
            message,
            billingInformation,
            alternativeProcedures,
          });
          if (!result.success) {
            // Only a legitimately oversized payload (many multi-byte characters) may fail.
            expect(result.issues.map((issue) => issue.code)).toEqual(['payload_too_long']);
            return;
          }
          expect(parseQRBill(result.data.payload)).toEqual(result.data);
        },
      ),
    );
  });
});
