// PDFKit 0.17.0, installed under another name to test the oldest version the adapter supports. It has no types of
// its own: those of the current version describe it well enough for the tests.
declare module 'pdfkit-0.17' {
  import PDFDocument from 'pdfkit';

  export default PDFDocument;
}
