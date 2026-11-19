// An application that imports a few functions must not carry the rest of the library. Bundles the public API the
// way an application bundler would (tree shaking on, module side effects assumed) and checks what ends up inside.
import { fileURLToPath } from 'node:url';
import { build } from 'rolldown';
import { describe, expect, it } from 'vitest';

const INDEX = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const ENTRY = 'virtual:entry';

/** Minified size of an application that imports `names` from the core, and its code. */
async function bundle(names: readonly string[]): Promise<string> {
  const output = await build({
    input: ENTRY,
    write: false,
    logLevel: 'silent',
    resolve: { extensionAlias: { '.js': ['.ts', '.js'] } },
    output: { format: 'esm', minify: true },
    plugins: [
      {
        name: 'entry',
        resolveId: (id) => (id === ENTRY ? id : null),
        load: (id) => (id === ENTRY ? `export { ${names.join(', ')} } from ${JSON.stringify(INDEX)};` : null),
      },
    ],
  });
  return output.output[0].code;
}

describe('tree shaking', () => {
  it('keeps an IBAN check small: no country list, no labels, no bill validation', async () => {
    const code = await bundle(['isValidIBAN']);
    expect(code).not.toContain('ZW'); // last country code
    expect(code).not.toContain('Zahlteil'); // labels
    expect(code).not.toContain('SPC'); // payload
    expect(code.length).toBeLessThan(1000);
  });

  it('carries the country list only with the country validator', async () => {
    expect(await bundle(['validateCountry'])).toContain('ZW');
  });
});
