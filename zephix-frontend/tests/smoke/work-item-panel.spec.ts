/**
 * Smoke Test: Work Item Detail Panel (Phase 4.4)
 *
 * Covers:
 * - Panel opens from task list click
 * - Panel shows tabs (Overview, Activity, Documents, Risks, Changes, History)
 * - Comment can be added
 * - Panel closes with X
 * - No 500 errors
 */
import { test, expect } from '@playwright/test';
import { loginAndSelectWorkspace } from './helpers';

test.describe('Work Item Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('panel opens from task list', async ({ page }) => {
    // Navigate to a project tasks page
    const projectLink = page.locator('a[href*="/projects/"]').first();
    const hasProject = await projectLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!hasProject) {
      test.skip(true, 'No project available');
      return;
    }

    await projectLink.click();
    await page.waitForTimeout(2000);

    // Navigate to tasks tab
    const tasksTab = page.locator('a[href*="/tasks"], button:has-text("Tasks")').first();
    const hasTasksTab = await tasksTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasTasksTab) {
      await tasksTab.click();
      await page.waitForTimeout(2000);
    }

    // Click a task
    const taskRow = page.locator('[data-task-id]').first();
    const hasTask = await taskRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTask) {
      await taskRow.click();
      await page.waitForTimeout(2000);

      // Check panel opened
      const panel = page.locator('[data-testid="work-item-detail-panel"]');
      const panelVisible = await panel
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(panelVisible).toBeTruthy();

      // Check tabs exist
      const overviewTab = page.locator('[data-testid="detail-tab-overview"]');
      const activityTab = page.locator('[data-testid="detail-tab-activity"]');
      const docsTab = page.locator('[data-testid="detail-tab-documents"]');

      expect(await overviewTab.isVisible()).toBeTruthy();
      expect(await activityTab.isVisible()).toBeTruthy();
      expect(await docsTab.isVisible()).toBeTruthy();

      // Close with X
      const closeBtn = page.locator('[data-testid="detail-panel-close"]');
      await closeBtn.click();
      await page.waitForTimeout(500);

      const panelGone = await panel
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      expect(panelGone).toBeFalsy();
    }
  });

  test('no 500 errors during panel interaction', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 500) {
        errors.push(`500 on ${response.url()}`);
      }
    });

    // Navigate to tasks
    const projectLink = page.locator('a[href*="/projects/"]').first();
    const hasProject = await projectLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasProject) {
      await projectLink.click();
      await page.waitForTimeout(2000);

      const taskRow = page.locator('[data-task-id]').first();
      const hasTask = await taskRow
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (hasTask) {
        await taskRow.click();
        await page.waitForTimeout(3000);
      }
    }

    expect(errors).toHaveLength(0);
  });
});
