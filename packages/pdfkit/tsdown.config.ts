import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  // Node: the adapter reads its fonts from the package.
  platform: 'node',
  // .js and .d.ts, like the core: the package is "type": "module".
  fixedExtension: false,
  target: 'es2022',
  tsconfig: 'tsconfig.build.json',
  dts: true,
  sourcemap: true,
  clean: true,
});
