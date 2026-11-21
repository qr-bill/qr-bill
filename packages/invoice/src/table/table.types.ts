/**
 * Types of the table of the lines.
 *
 * @module
 */

/** A column of the table, other than the descriptions. */
export interface Column {
  /** Its label. */
  readonly label: string;
  /** The text of each line. */
  readonly cells: readonly (string | undefined)[];
  /** How its texts are aligned. */
  readonly align: 'left' | 'right';
}

/** A column placed: where its texts start (aligned left) or end (aligned right). */
export interface PlacedColumn extends Column {
  /** Left edge of its texts. */
  readonly left: number;
  /** Right edge of its texts. */
  readonly right: number;
}
