import { describe, expect, it } from 'vitest';
import { createQRBill, qrBillSchema } from '../../src/index.js';
import { base } from '../fixtures.js';

describe('qrBillSchema (Standard Schema v1)', () => {
  it('outputs the normalized bill', async () => {
    const result = await qrBillSchema['~standard'].validate(base);
    expect(result.issues).toBeUndefined();
    expect('value' in result && result.value.payload).toBe(createQRBill(base).payload);
  });

  it('outputs the issues with their message and path', async () => {
    const result = await qrBillSchema['~standard'].validate({ ...base, currency: 'USD' });
    expect(result.issues).toEqual([{ message: 'Currency must be "CHF" or "EUR"', path: ['currency'] }]);
  });

  it('declares itself as a Standard Schema v1', () => {
    expect(qrBillSchema['~standard'].version).toBe(1);
    expect(qrBillSchema['~standard'].vendor).toBe('qr-bill');
  });
});
