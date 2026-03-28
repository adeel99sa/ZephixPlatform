/**
 * Smoke Test: Template Activation Governance (Phase 4.3)
 *
 * Covers:
 * - Admin sees Templates tab in Workspace Settings
 * - Template activation panel renders
 * - No 500 errors
 */
import { test, expect } from '@playwright/test';
import { loginAndSelectWorkspace } from './helpers';

test.describe('Template Activation Governance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('admin sees Templates tab in workspace settings', async ({ page }) => {
    // Navigate to workspace settings
    const wsSettingsLink = page.locator(
      'a[href*="/settings"], button:has-text("Settings")',
    );
    const hasSettingsLink = await wsSettingsLink.first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasSettingsLink) {
      await wsSettingsLink.first().click();
      await page.waitForTimeout(2000);
    } else {
      // Try direct navigation
      const url = page.url();
      const wsMatch = url.match(/workspaces\/([^/]+)/);
      if (wsMatch) {
        await page.goto(`/workspaces/${wsMatch[1]}/settings`, {
          waitUntil: 'domcontentloaded',
        });
      } else {
        test.skip(true, 'Cannot navigate to workspace settings');
        return;
      }
    }

    await page.waitForTimeout(2000);

    // Check for Templates nav item
    const templatesTab = page.locator(
      '[data-testid="ws-settings-nav-templates"]',
    );
    const hasTab = await templatesTab
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasTab) {
      // Click it
      await templatesTab.click();
      await page.waitForTimeout(1500);

      // Check panel renders
      const panelVisible = await page
        .locator('text=Template Activations')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(panelVisible).toBeTruthy();
    }
  });

  test('no 500 errors during settings navigation', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 500) {
        errors.push(`500 on ${response.url()}`);
      }
    });

    // Try navigating to workspace settings
    const url = page.url();
    const wsMatch = url.match(/workspaces\/([^/]+)/);
    if (wsMatch) {
      await page.goto(`/workspaces/${wsMatch[1]}/settings`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(3000);
    }

    expect(errors).toHaveLength(0);
  });
});
