// The original QR Code generator of Project Nayuki, kept unmodified in reference/qrcodegen.ts (see the README there)
// and compiled on the fly: the witness that the reduced encoder of qr-bill produces exactly the same QR codes.
import { readFileSync } from 'node:fs';
import ts from 'typescript';

/** The original file, byte for byte. */
export const REFERENCE_FILE = new URL('reference/qrcodegen.ts', import.meta.url);

/** Git blob hash of typescript-javascript/qrcodegen.ts at commit 9a217d4 of nayuki/QR-Code-generator. */
export const REFERENCE_BLOB_HASH = 'e2ef90b2eede8b3ce36fc03dc21d9e4f66b06fdd';

/** The part of the original API that the tests use. */
interface Reference {
  readonly QrCode: {
    readonly Ecc: { readonly MEDIUM: unknown };
    encodeSegments(
      segments: readonly unknown[],
      ecl: unknown,
      minVersion: number,
      maxVersion: number,
      mask: number,
      boostEcl: boolean,
    ): { readonly version: number; readonly size: number; getModule(x: number, y: number): boolean };
  };
  readonly QrSegment: { makeBytes(data: readonly number[]): unknown };
}

const source = readFileSync(REFERENCE_FILE, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the reference file kept in this repository
const load = new Function(`${compiled}\nreturn qrcodegen;`) as () => Reference;
const reference = load();

/**
 * Encodes bytes the way a Swiss QR Code is encoded, with the original library: byte mode, level M, **without**
 * raising the error correction level when the version has room left (its default, which chapter 6.1 forbids),
 * automatic mask.
 */
export function referenceEncode(bytes: Uint8Array): { version: number; modules: boolean[][] } {
  const { QrCode, QrSegment } = reference;
  const qrCode = QrCode.encodeSegments([QrSegment.makeBytes([...bytes])], QrCode.Ecc.MEDIUM, 1, 40, -1, false);
  return {
    version: qrCode.version,
    modules: Array.from({ length: qrCode.size }, (_row, y) =>
      Array.from({ length: qrCode.size }, (_column, x) => qrCode.getModule(x, y)),
    ),
  };
}
