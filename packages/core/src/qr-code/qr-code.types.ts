/**
 * Types of the QR code.
 *
 * @module
 */

/**
 * A QR code: a square grid of dark and light modules, without its quiet zone. Plain data, frozen: a renderer draws
 * a square for every dark module.
 */
export interface QRCode {
  /** Version, from 1 to 25 for a Swiss QR Code. */
  readonly version: number;
  /** Number of modules on each side: 4 × version + 17, so from 21 to 117. */
  readonly size: number;
  /** The rows of modules from the top, each from the left; `true` for a dark module. */
  readonly modules: readonly (readonly boolean[])[];
}
