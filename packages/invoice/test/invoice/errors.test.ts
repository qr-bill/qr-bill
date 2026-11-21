import { describe, expect, it } from 'vitest';
import { InvoiceValidationError } from '../../src/index.js';

describe('InvoiceValidationError', () => {
  it('keeps every issue and summarizes them in its message', () => {
    const issues = [
      { code: 'invalid_uid', path: ['issuer', 'uid'], message: 'Invalid UID' },
      { code: 'invalid_type', path: [], message: 'Expected an invoice object' },
    ] as const;
    const error = new InvoiceValidationError(issues);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvoiceValidationError');
    expect(error.issues).toBe(issues);
    expect(error.message).toBe('Invalid invoice: issuer.uid: Invalid UID; Expected an invoice object');
  });
});
