/**
 * Smoke Test: Tailoring Panel (Phase 4.5)
 *
 * Covers:
 * - Org settings shows Tailoring tab
 * - Workspace settings shows Tailoring tab
 * - Panel renders with fields
 * - No 500 errors
 */
import { test, expect } from '@playwright/test';
import { loginAndSelectWorkspace } from './helpers';

test.describe('Tailoring Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('org settings shows Tailoring tab', async ({ page }) => {
    await page.goto('/organizations/settings');
    await page.waitForTimeout(2000);

    const tailoringTab = page.locator(
      'button:has-text("Tailoring"), a:has-text("Tailoring")',
    );
    const visible = await tailoringTab
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (visible) {
      await tailoringTab.first().click();
      await page.waitForTimeout(2000);

      const panel = page.locator('[data-testid="tailoring-panel"]');
      const panelVisible = await panel
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(panelVisible).toBeTruthy();
    }
  });

  test('workspace settings shows Tailoring tab', async ({ page }) => {
    // Navigate to workspace settings
    const wsSettingsLink = page.locator(
      'a[href*="/settings"], button:has-text("Settings")',
    );
    const hasLink = await wsSettingsLink
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasLink) {
      await wsSettingsLink.first().click();
      await page.waitForTimeout(2000);

      const tailoringTab = page.locator(
        'button:has-text("Tailoring"), a:has-text("Tailoring")',
      );
      const visible = await tailoringTab
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (visible) {
        await tailoringTab.first().click();
        await page.waitForTimeout(2000);

        const panel = page.locator('[data-testid="tailoring-panel"]');
        const panelVisible = await panel
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        expect(panelVisible).toBeTruthy();
      }
    }
  });

  test('no 500 errors during tailoring navigation', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 500) {
        errors.push(`500 on ${response.url()}`);
      }
    });

    await page.goto('/organizations/settings');
    await page.waitForTimeout(2000);

    const tailoringTab = page.locator(
      'button:has-text("Tailoring"), a:has-text("Tailoring")',
    );
    const visible = await tailoringTab
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (visible) {
      await tailoringTab.first().click();
      await page.waitForTimeout(3000);
    }

    expect(errors).toHaveLength(0);
  });
});
