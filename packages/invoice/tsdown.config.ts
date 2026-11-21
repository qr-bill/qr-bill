import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  // Node: the fonts come from @qr-bill/pdfkit, which reads them from its package.
  platform: 'node',
  // .js and .d.ts, like the other packages: the package is "type": "module".
  fixedExtension: false,
  target: 'es2022',
  tsconfig: 'tsconfig.build.json',
  dts: true,
  sourcemap: true,
  clean: true,
});
