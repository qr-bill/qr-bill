/**
 * The error thrown when an invoice is invalid.
 *
 * @module
 */

import type { InvoiceIssue } from './invoice.types.js';

/**
 * Thrown by {@link createInvoicePDF}. Lists every problem found, not just the first.
 *
 * @example
 * ```ts
 * try {
 *   await createInvoicePDF(input);
 * } catch (error) {
 *   if (error instanceof InvoiceValidationError) {
 *     error.issues; // [{ code: 'invalid_uid', path: ['issuer', 'uid'], message: '…' }, …]
 *   }
 * }
 * ```
 */
export class InvoiceValidationError extends Error {
  /** Always "InvoiceValidationError". */
  override readonly name = 'InvoiceValidationError';

  /** Every problem found. */
  readonly issues: readonly InvoiceIssue[];

  /**
   * @param issues - The problems found; the message of the error summarizes them.
   */
  constructor(issues: readonly InvoiceIssue[]) {
    const summary = issues
      .map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('; ');
    super(`Invalid invoice: ${summary}`);
    this.issues = issues;
  }
}
