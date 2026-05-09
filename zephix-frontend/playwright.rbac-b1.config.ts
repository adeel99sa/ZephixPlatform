import { defineConfig, devices } from '@playwright/test';

/**
 * PR screenshots + optional Lighthouse companion base URL.
 * Run preview: `npm run build && npx vite preview --host 127.0.0.1 --port 4173`
 * Then: `npx playwright test -c playwright.rbac-b1.config.ts`
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'off',
    ...devices['iPad Mini'],
  },
  projects: [{ name: 'chromium', use: { ...devices['iPad Mini'] } }],
});
