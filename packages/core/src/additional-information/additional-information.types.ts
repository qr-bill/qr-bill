/**
 * Types of the additional information: message, billing information, alternative procedures.
 *
 * @module
 */

import type { OptionalTextStatus } from '../text/text.types.js';

/**
 * Result of the validation of the billing information: like {@link OptionalTextStatus}, plus
 * `invalid_billing_information` when it does not start with "//" followed by the two-character code of its syntax
 * (e.g. "//S1/" for Swico).
 */
export type BillingInformationStatus = OptionalTextStatus | 'invalid_billing_information';
