/**
 * How dates are written on the invoice: as in Switzerland, in every language.
 *
 * @module
 */

/**
 * Writes a date as in Switzerland, whatever the language: day, month and year separated by points.
 *
 * @param date - A date written `YYYY-MM-DD`.
 * @returns The date, e.g. `20.11.2026`.
 * @example
 * ```ts
 * formatDate('2026-11-20'); // '20.11.2026'
 * ```
 */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}
