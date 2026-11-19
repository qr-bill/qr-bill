/// <reference types="zxing-wasm/imageData" />
// Reads QR codes back with a real decoder, ZXing (C++, compiled to WebAssembly by zxing-wasm), the way a phone or a
// scanner would: the modules are drawn as pixels, with the quiet zone of four modules around them (chapter 6.4.1).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import type { QRCode } from '../../src/index.js';

const QUIET_ZONE = 4;
const PIXELS_PER_MODULE = 2;

// Load the WebAssembly binary from node_modules: by default zxing-wasm would download it from a CDN.
const wasm = readFileSync(createRequire(import.meta.url).resolve('zxing-wasm/reader/zxing_reader.wasm'));
await prepareZXingModule({
  overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) },
  fireImmediately: true,
});

/** What the decoder reads: the text, the version and the error correction level it found. */
export interface Decoded {
  readonly text: string;
  readonly version: string;
  readonly ecLevel: string;
}

/** Draws the QR code as black and white pixels and decodes it; an empty list when nothing can be read. */
export async function decode(qrCode: QRCode): Promise<Decoded[]> {
  const side = (qrCode.size + 2 * QUIET_ZONE) * PIXELS_PER_MODULE;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (const [y, row] of qrCode.modules.entries()) {
    for (const [x, dark] of row.entries()) {
      if (!dark) continue;
      for (let py = 0; py < PIXELS_PER_MODULE; py++) {
        for (let px = 0; px < PIXELS_PER_MODULE; px++) {
          const pixel = ((y + QUIET_ZONE) * PIXELS_PER_MODULE + py) * side + (x + QUIET_ZONE) * PIXELS_PER_MODULE + px;
          data.fill(0, pixel * 4, pixel * 4 + 3);
        }
      }
    }
  }
  const image: ImageData = { data, width: side, height: side };
  const results = await readBarcodes(image, { formats: ['QRCode'], tryHarder: false, maxNumberOfSymbols: 1 });
  return results.map(({ text, extra }) => {
    // extra is JSON, e.g. {"DataMask":2,"UEC":1.00,"Version":"1","ECLevel":"M"}
    const { Version, ECLevel } = JSON.parse(extra) as { Version: string; ECLevel: string };
    return { text, version: Version, ecLevel: ECLevel };
  });
}
