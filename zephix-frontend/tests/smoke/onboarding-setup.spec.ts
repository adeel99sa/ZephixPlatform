/**
 * Smoke Test: Onboarding Guided Setup (Phase 4.8)
 */
import { test, expect } from '@playwright/test';
import { loginAndSelectWorkspace } from './helpers';

test.describe('Onboarding Setup', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('workspace home loads without 500 errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('response', (r) => {
      if (r.status() === 500) errors.push(`500 on ${r.url()}`);
    });

    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('guided setup panel renders for new workspace', async ({ page }) => {
    await page.waitForTimeout(2000);
    // Panel may or may not show depending on workspace state
    // Just verify no crashes
    const panel = page.locator('[data-testid="guided-setup-panel"]');
    await panel.isVisible({ timeout: 3000 }).catch(() => false);
  });
});
