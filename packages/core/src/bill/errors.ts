/**
 * The error thrown when a QR-bill is invalid.
 *
 * @module
 */

import type { QRBillIssue } from './bill.types.js';

/**
 * Thrown by {@link createQRBill} and {@link parseQRBill}. Lists every problem found, not just the first.
 *
 * @example
 * ```ts
 * try {
 *   createQRBill(input);
 * } catch (error) {
 *   if (error instanceof QRBillValidationError) {
 *     error.issues; // [{ code: 'invalid_iban', path: ['creditor', 'account'], message: '…' }, …]
 *   }
 * }
 * ```
 */
export class QRBillValidationError extends Error {
  /** Always "QRBillValidationError". */
  override readonly name = 'QRBillValidationError';

  /** Every problem found. */
  readonly issues: readonly QRBillIssue[];

  /**
   * @param issues - The problems found; the message of the error summarizes them.
   */
  constructor(issues: readonly QRBillIssue[]) {
    const summary = issues
      .map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('; ');
    super(`Invalid QR-bill: ${summary}`);
    this.issues = issues;
  }
}
