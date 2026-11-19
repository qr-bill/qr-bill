import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MAX_PAYLOAD_BYTES, encodeSwissQRCode } from '../../src/index.js';
import { byteCapacity } from '../../src/qr-code/capacity.js';
import { encodeUTF8, utf8Length } from '../../src/text/utf8.js';
import { decode } from './decoder.js';
import { REFERENCE_BLOB_HASH, REFERENCE_FILE, referenceEncode } from './reference.js';

const { examples } = JSON.parse(
  readFileSync(new URL('../../../../conformance/six-ig-v2.4-examples.json', import.meta.url), 'utf8'),
) as { examples: { id: string; payload: string[] }[] };

/** A content of exactly `bytes` bytes. */
const ofBytes = (bytes: number): string => 'x'.repeat(bytes);

/** Contents made of characters of the Swiss QR Code, one to three bytes each in UTF-8, at most 997 bytes. */
const contents = fc
  .string({ unit: fc.constantFrom(...'SPC0200\n Max Muster & Söhne, Zürich 8000 €ŁőȘ-./:'), maxLength: 400 })
  .filter((content) => content !== '' && utf8Length(content) <= MAX_PAYLOAD_BYTES);

describe('encodeSwissQRCode (chapter 6)', () => {
  it.each(examples)('$id: read back by a real decoder, at level M, like the reference', async ({ payload }) => {
    const content = payload.join('\n');
    const qrCode = encodeSwissQRCode(content);
    expect(await decode(qrCode)).toEqual([{ text: content, version: String(qrCode.version), ecLevel: 'M' }]);
    expect(qrCode.modules).toEqual(referenceEncode(encodeUTF8(content)).modules);
  });

  it('uses the smallest version that holds the content, from 1 to 25 (chapter 6.4)', async () => {
    for (let version = 1; version <= 25; version++) {
      const full = encodeSwissQRCode(ofBytes(byteCapacity(version)));
      expect(full.version).toBe(version);
      expect(full.size).toBe(version * 4 + 17);
      expect(await decode(full)).toEqual([
        { text: ofBytes(byteCapacity(version)), version: String(version), ecLevel: 'M' },
      ]);
      if (version < 25) expect(encodeSwissQRCode(ofBytes(byteCapacity(version) + 1)).version).toBe(version + 1);
    }
  });

  it('holds 997 bytes, the limit of the standard, in version 25: 117 × 117 modules (chapter 6.2)', () => {
    expect(MAX_PAYLOAD_BYTES).toBe(byteCapacity(25));
    const qrCode = encodeSwissQRCode(ofBytes(997));
    expect(qrCode.version).toBe(25);
    expect(qrCode.size).toBe(117);
    expect(qrCode.modules).toHaveLength(117);
    expect(qrCode.modules[0]).toHaveLength(117);
  });

  it('counts the content in bytes, not in characters', () => {
    expect(encodeSwissQRCode('ő'.repeat(498)).version).toBe(25); // 996 bytes
    expect(() => encodeSwissQRCode('ő'.repeat(499))).toThrow(RangeError); // 998 bytes
  });

  it('refuses more than 997 bytes', () => {
    expect(() => encodeSwissQRCode(ofBytes(998))).toThrow(
      'The content of a Swiss QR Code is limited to 997 bytes (chapter 6.2), received 998',
    );
  });

  it('returns a frozen QR code', () => {
    const qrCode = encodeSwissQRCode('SPC');
    expect(Object.isFrozen(qrCode)).toBe(true);
    expect(Object.isFrozen(qrCode.modules)).toBe(true);
    expect(Object.isFrozen(qrCode.modules[0])).toBe(true);
  });

  it('produces exactly the modules of the reference, mask included, for any content', () => {
    fc.assert(
      fc.property(contents, (content) => {
        const reference = referenceEncode(encodeUTF8(content));
        const qrCode = encodeSwissQRCode(content);
        expect(qrCode.version).toBe(reference.version);
        expect(qrCode.modules).toEqual(reference.modules);
      }),
      { numRuns: 150 },
    );
  });

  it('produces QR codes that a real decoder reads back, for any content', async () => {
    await fc.assert(
      fc.asyncProperty(contents, async (content) => {
        expect((await decode(encodeSwissQRCode(content))).map((decoded) => decoded.text)).toEqual([content]);
      }),
      { numRuns: 40 },
    );
  });
});

describe('reference', () => {
  it('is the unmodified file of Project Nayuki', () => {
    const file = readFileSync(REFERENCE_FILE);
    const blobHash = createHash('sha1').update(`blob ${file.length}\0`).update(file).digest('hex');
    expect(blobHash).toBe(REFERENCE_BLOB_HASH);
  });
});
