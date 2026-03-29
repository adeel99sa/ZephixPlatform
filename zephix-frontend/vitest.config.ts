import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    exclude: [
      ...configDefaults.exclude,
      'tests/**',
      'e2e/**',
      'playwright/**',
      '**/*.pw.spec.*',
      '**/*.spec.pw.*',
      '**/*.spec.e2e.*',
      '**/*.e2e.spec.*',
      /** Pre–V3 marketing components; run with `npm run test:landing:legacy` */
      'src/components/landing/legacy/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/components/landing/legacy/**',
      ],
    },
  },
});
