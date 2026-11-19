import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createQRBill, parseQRBill, type QRBillInput, validateQRBill } from '../../src/index.js';

interface Example {
  id: string;
  description: string;
  input: QRBillInput;
  payload: string[];
}

interface InvalidExample {
  id: string;
  description: string;
  input: QRBillInput;
  issues: string[];
}

const { examples, invalid } = JSON.parse(
  readFileSync(new URL('../../../../conformance/six-ig-v2.4-examples.json', import.meta.url), 'utf8'),
) as { examples: Example[]; invalid: InvalidExample[] };

describe('conformance: invalid inputs', () => {
  it.each(invalid)('$id: $description', ({ input, issues }) => {
    const result = validateQRBill(input);
    expect(result.success ? [] : result.issues.map((issue) => issue.code)).toEqual(issues);
  });
});

describe('SIX IG QR-bill v2.4, Annex A examples', () => {
  it('covers the six examples', () => {
    expect(examples).toHaveLength(6);
  });

  describe.each(examples)('$id: $description', ({ input, payload }) => {
    const expected = payload.join('\n');

    it('produces the payload of the standard, line by line', () => {
      expect(createQRBill(input).payload.split('\n')).toEqual(payload);
    });

    it('parses the payload of the standard back to the same bill', () => {
      expect(parseQRBill(expected)).toEqual(createQRBill(input));
    });

    it('supports CR LF line endings in both directions', () => {
      const crlf = createQRBill(input, { lineEnding: '\r\n' });
      expect(crlf.payload).toBe(payload.join('\r\n'));
      expect(parseQRBill(crlf.payload).payload).toBe(crlf.payload);
    });
  });
});
