import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The tests of the adapters run against the sources of the core, so that no build is needed first.
  resolve: {
    alias: { '@qr-bill/core': fileURLToPath(new URL('packages/core/src/index.ts', import.meta.url)) },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    // Property-based tests and rasterisations take about a second alone, several times more when they run in parallel on
    // a busy machine: 30 s instead of 5 still catches a test that hangs.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
