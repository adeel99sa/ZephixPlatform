/**
 * Smoke: Project Calendar tab (Calendar MVP PR 1 + PR 2 views)
 */
import { test, expect } from '@playwright/test';
import {
  getSeedIds,
  loginAndSelectWorkspace,
  navigateToProjectCalendar,
  assertNo403,
  assertNoRouteBounce,
} from './helpers';

test.describe('Project Calendar tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('calendar tab loads for seeded project', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectCalendar(page, ids.projectA.id);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/calendar');

    await expect(page.locator('[data-testid="calendar-root"]')).toBeVisible({ timeout: 15000 });

    const body = await page.locator('body').textContent();
    expect(body).toMatch(/Calendar/i);
  });

  test('calendar toolbar switches to week and sets view=week in URL', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectCalendar(page, ids.projectA.id);
    await assertNo403(page);

    const weekBtn = page.locator('button.fc-timeGridWeek-button');
    await expect(weekBtn).toBeVisible({ timeout: 20000 });
    await weekBtn.click();
    await expect(page).toHaveURL(/view=week/, { timeout: 15000 });
  });

  test('calendar deep link view=week shows week grid', async ({ page }) => {
    const ids = getSeedIds();
    await page.goto(`/projects/${ids.projectA.id}/calendar?view=week`);
    await page.waitForLoadState('networkidle');
    await assertNo403(page);

    await expect(page.locator('[data-testid="calendar-root"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible({ timeout: 20000 });
  });

  test('calendar preserves filter query params in URL (status + view)', async ({ page }) => {
    const ids = getSeedIds();
    await page.goto(`/projects/${ids.projectA.id}/calendar?view=month&status=TODO`);
    await page.waitForLoadState('networkidle');
    await assertNo403(page);

    await expect(page.locator('[data-testid="calendar-root"]')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/status=TODO/);
    await expect(page).toHaveURL(/view=month/);
  });
});
