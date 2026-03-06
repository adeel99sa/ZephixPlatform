/**
 * Playwright config for the UI acceptance smoke lane.
 *
 * Targets the live staging frontend — no local dev server required.
 * STAGING_FRONTEND_BASE must be set in env or docs/ai/environments/staging.env.
 * STAGING_BACKEND_BASE and STAGING_SMOKE_KEY must also be available.
 *
 * Run via:
 *   npx playwright test tests/ui-acceptance.spec.ts --config playwright.acceptance.config.ts
 */
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function readStagingEnvKey(key: string): string {
  try {
    const envPath = path.resolve(__dirname, '../docs/ai/environments/staging.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    const line = content.split('\n').find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : '';
  } catch {
    return '';
  }
}

const frontendBase =
  process.env.STAGING_FRONTEND_BASE || readStagingEnvKey('STAGING_FRONTEND_BASE') || '';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90000, // 90 s per test — staging frontend cold-start can be slow
  reporter: [
    ['html', { outputFolder: 'playwright-acceptance-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: frontendBase || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
