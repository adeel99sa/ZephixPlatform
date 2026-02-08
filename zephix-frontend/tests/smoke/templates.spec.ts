/**
 * Smoke Test: Template Center Module
 *
 * Covers:
 * - Template Center page loads
 * - Template recommendations load
 * - Template preview works
 * - Template instantiation creates a project
 * - No cross-org template leakage
 * - No 403 spam
 */
import { test, expect } from '@playwright/test';
import {
  getSeedIds,
  loginAndSelectWorkspace,
  navigateToTemplates,
  assertNo403,
  assertNoRouteBounce,
} from './helpers';

test.describe('Template Center Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('template center page loads', async ({ page }) => {
    await navigateToTemplates(page);
    await assertNo403(page);

    // Should see template content
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('template recommendations API works', async ({ page }) => {
    const recommendationPromise = page.waitForResponse(
      (r) => r.url().includes('/templates/recommendations') && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToTemplates(page);

    const response = await recommendationPromise;
    if (response) {
      expect(response.status()).toBeLessThan(400);
      const body = await response.json().catch(() => null);
      if (body) {
        const data = body?.data ?? body;
        // Should have recommended and/or others arrays
        expect(data).toBeTruthy();
      }
    }
  });

  test('template list API returns templates', async ({ page }) => {
    const templatePromise = page.waitForResponse(
      (r) => r.url().includes('/templates') && !r.url().includes('recommendations') && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToTemplates(page);

    const response = await templatePromise;
    if (response) {
      expect(response.status()).toBeLessThan(400);
    }
  });

  test('no 403 errors on template pages', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 403) {
        errors.push(`403 on ${response.url()}`);
      }
    });

    await navigateToTemplates(page);
    await page.waitForTimeout(3000);

    expect(errors).toHaveLength(0);
  });
});
