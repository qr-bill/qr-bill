import { describe, expect, it } from 'vitest';
import { formatDate } from '../../src/details/date.js';

describe('formatDate', () => {
  it('writes the day, the month and the year separated by points', () => {
    expect(formatDate('2026-11-20')).toBe('20.11.2026');
    expect(formatDate('2027-01-05')).toBe('05.01.2027');
  });
});
