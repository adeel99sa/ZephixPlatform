/**
 * Smoke Test: Budget Tab (Phase 4.7)
 */
import { test, expect } from '@playwright/test';
import { loginAndSelectWorkspace } from './helpers';

test.describe('Budget Tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('budget tab loads without 500 errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 500) errors.push(`500 on ${response.url()}`);
    });

    const projectLink = page.locator('a[href*="/projects/"]').first();
    const hasProject = await projectLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasProject) {
      await projectLink.click();
      await page.waitForTimeout(2000);
      const budgetTab = page.locator('a[href*="/budget"], button:has-text("Budget")');
      const visible = await budgetTab.first().isVisible({ timeout: 5000 }).catch(() => false);
      if (visible) {
        await budgetTab.first().click();
        await page.waitForTimeout(2000);
        const tab = page.locator('[data-testid="budget-tab"]');
        expect(await tab.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy();
      }
    }
    expect(errors).toHaveLength(0);
  });
});
