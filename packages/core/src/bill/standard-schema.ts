/**
 * The validation of a QR-bill as a Standard Schema v1 (https://standardschema.dev), so that any library that
 * accepts one (Hono, tRPC, TanStack Form, Valibot, Zod…) can validate a QR-bill.
 *
 * The interfaces are copied from the specification, as its authors intend, so that no dependency is needed.
 *
 * @module
 */

import { validateQRBill } from './bill.validator.js';
import type { QRBill, QRBillInput } from './bill.types.js';

/** A Standard Schema v1: an object with a `~standard` property. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly '~standard': StandardSchemaV1Props<Input, Output>;
}

/** The properties of a Standard Schema v1. */
export interface StandardSchemaV1Props<Input, Output> {
  /** Version of the Standard Schema specification: 1. */
  readonly version: 1;
  /** Name of the library that provides the schema. */
  readonly vendor: string;
  /** Validates a value. */
  readonly validate: (value: unknown) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
  /** Input and output types, for type inference only. */
  readonly types?:
    | {
        /** Type of the value to validate. */
        readonly input: Input;
        /** Type of the validated value. */
        readonly output: Output;
      }
    | undefined;
}

/** The result of a validation: the output value, or the issues. */
export type StandardSchemaV1Result<Output> =
  | {
      /** The validated value. */
      readonly value: Output;
      /** No issues. */
      readonly issues?: undefined;
    }
  | {
      /** The problems found. */
      readonly issues: readonly StandardSchemaV1Issue[];
    };

/** A problem found by a Standard Schema. */
export interface StandardSchemaV1Issue {
  /** Explanation of the problem. */
  readonly message: string;
  /** Where the problem is. */
  readonly path?: readonly (PropertyKey | StandardSchemaV1PathSegment)[] | undefined;
}

/** A segment of the path of a {@link StandardSchemaV1Issue}, as an object. */
export interface StandardSchemaV1PathSegment {
  /** The property name or array index. */
  readonly key: PropertyKey;
}

/**
 * Validates a QR-bill input and outputs the normalized {@link QRBill}; same rules as {@link validateQRBill}.
 *
 * @example
 * ```ts
 * import { sValidator } from '@hono/standard-validator';
 *
 * app.post('/bills', sValidator('json', qrBillSchema), (c) => {
 *   const bill = c.req.valid('json'); // a QRBill
 * });
 * ```
 */
export const qrBillSchema: StandardSchemaV1<QRBillInput, QRBill> = {
  '~standard': {
    version: 1,
    vendor: 'qr-bill',
    validate(value) {
      const result = validateQRBill(value);
      return result.success
        ? { value: result.data }
        : { issues: result.issues.map(({ message, path }) => ({ message, path })) };
    },
  },
};
