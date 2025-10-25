import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    setupFiles: ['./__tests__/setup.ts'],
  },
  coverage: {
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/**',
      '.next/**',
      '**/*.d.ts',
      '**/*.config.{js,ts}',
      '__tests__/**',
    ],
  },
});