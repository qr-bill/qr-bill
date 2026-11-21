/**
 * The geometry of the invoice, in millimetres from the top left corner of an A4 page. The zones of each part are
 * defined where the part is drawn.
 *
 * @module
 */

/** Left edge of the content. */
export const LEFT = 20;
/** Right edge of the content. */
export const RIGHT = 190;
/** Width of the content. */
export const CONTENT_WIDTH: number = RIGHT - LEFT;
/** How far a band of colour (the header of the table, a striped row) reaches beyond the content, on each side. */
export const BAND_OVERHANG = 2;
/** Lowest point the content may reach before a new page. */
export const CONTENT_BOTTOM = 282;
/** Where the content starts on the pages after the first, under their short header. */
export const CONTINUED_TOP = 28;
