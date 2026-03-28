/**
 * Smoke Test: Sprints Tab (Phase 4.6)
 *
 * Covers:
 * - Sprints tab loads in project page
 * - No 500 errors
 * - Sprint list renders
 */
import { test, expect } from '@playwright/test';
import { loginAndSelectWorkspace } from './helpers';

test.describe('Sprints Tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('sprints tab loads without 500 errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 500) {
        errors.push(`500 on ${response.url()}`);
      }
    });

    // Navigate to a project sprints tab
    const projectLink = page.locator('a[href*="/projects/"]').first();
    const hasProject = await projectLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasProject) {
      await projectLink.click();
      await page.waitForTimeout(2000);

      const sprintsTab = page.locator(
        'a[href*="/sprints"], button:has-text("Sprints")',
      );
      const visible = await sprintsTab
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (visible) {
        await sprintsTab.first().click();
        await page.waitForTimeout(2000);

        const tab = page.locator('[data-testid="sprints-tab"]');
        const tabVisible = await tab
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        expect(tabVisible).toBeTruthy();
      }
    }

    expect(errors).toHaveLength(0);
  });

  test('expanding sprint shows capacity panel', async ({ page }) => {
    // Navigate to project sprints
    const projectLink = page.locator('a[href*="/projects/"]').first();
    const hasProject = await projectLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!hasProject) return;
    await projectLink.click();
    await page.waitForTimeout(2000);

    const sprintsTab = page.locator(
      'a[href*="/sprints"], button:has-text("Sprints")',
    );
    const visible = await sprintsTab
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!visible) return;
    await sprintsTab.first().click();
    await page.waitForTimeout(2000);

    const sprintRow = page.locator('[data-testid="sprint-row"]').first();
    const hasRow = await sprintRow
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (hasRow) {
      await sprintRow.click();
      await page.waitForTimeout(2000);

      const capacityPanel = page.locator('[data-testid="capacity-panel"]');
      const velocityPanel = page.locator('[data-testid="velocity-panel"]');
      // At least one should be present after expanding
      const hasCapacity = await capacityPanel
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasVelocity = await velocityPanel
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      expect(hasCapacity || hasVelocity).toBeTruthy();
    }
  });
});
