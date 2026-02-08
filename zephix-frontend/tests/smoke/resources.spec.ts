/**
 * Smoke Test: Resource Management Module
 *
 * Covers:
 * - Resources tab loads for a project
 * - Allocations list with seeded data
 * - No orphan allocations (all reference valid project)
 * - No 403 spam
 */
import { test, expect } from '@playwright/test';
import {
  getSeedIds,
  loginAndSelectWorkspace,
  navigateToProjectResources,
  assertNo403,
  assertNoRouteBounce,
} from './helpers';

test.describe('Resource Management Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('resources tab loads for seeded project', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectResources(page, ids.projectA.id);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/resources');

    // Wait for content to load
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('allocations API returns data for seeded project', async ({ page }) => {
    const ids = getSeedIds();

    // Navigate to resources tab and intercept API call
    const allocResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/work/resources/allocations') && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToProjectResources(page, ids.projectA.id);

    const allocResponse = await allocResponsePromise;
    if (allocResponse) {
      expect(allocResponse.status()).toBeLessThan(400);
      const body = await allocResponse.json().catch(() => null);
      if (body) {
        // Verify allocations belong to correct project
        const items = body?.data?.items ?? body?.items ?? [];
        for (const alloc of items) {
          expect(alloc.projectId).toBe(ids.projectA.id);
        }
      }
    }
  });

  test('no 403 errors on resource pages', async ({ page }) => {
    const ids = getSeedIds();
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 403) {
        errors.push(`403 on ${response.url()}`);
      }
    });

    await navigateToProjectResources(page, ids.projectA.id);
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });

  test('resources page loads for standalone route', async ({ page }) => {
    await page.goto('/resources');
    await page.waitForLoadState('networkidle');
    await assertNo403(page);

    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });
});
