// The public API is a contract: adding or removing an export must be a deliberate change, visible in this list.
import { describe, expect, it } from 'vitest';
import * as api from '../src/index.js';

describe('public API', () => {
  it('exports exactly these values', () => {
    expect(Object.keys(api).sort()).toEqual(['POINTS_PER_MM', 'attachTo', 'drawPaymentSlip', 'registerFonts']);
  });
});
