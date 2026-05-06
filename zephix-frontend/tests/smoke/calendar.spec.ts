/**
 * Smoke: Project Calendar tab (Calendar MVP PR 1)
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
});
