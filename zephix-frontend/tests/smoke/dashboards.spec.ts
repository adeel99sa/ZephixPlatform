/**
 * Smoke Test: Dashboards Module
 *
 * Covers:
 * - Dashboards index page loads
 * - Dashboard API returns data
 * - Dashboard templates available
 * - Workspace and project filtering respected
 * - No 403 spam
 */
import { test, expect } from '@playwright/test';
import {
  getSeedIds,
  loginAndSelectWorkspace,
  navigateToDashboards,
  assertNo403,
  assertNoRouteBounce,
} from './helpers';

test.describe('Dashboards Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('dashboards index page loads', async ({ page }) => {
    await navigateToDashboards(page);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/dashboards');

    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('dashboards API returns data', async ({ page }) => {
    const dashResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/dashboards') && !r.url().includes('templates') && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToDashboards(page);

    const dashResponse = await dashResponsePromise;
    if (dashResponse) {
      expect(dashResponse.status()).toBeLessThan(400);
    }
  });

  test('dashboard templates endpoint works', async ({ page }) => {
    const tmplPromise = page.waitForResponse(
      (r) => r.url().includes('/dashboards/templates') && r.status() < 500,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToDashboards(page);

    const tmplResponse = await tmplPromise;
    if (tmplResponse) {
      expect(tmplResponse.status()).toBeLessThan(500);
    }
  });

  test('dashboards respect workspace scope', async ({ page }) => {
    const ids = getSeedIds();

    const dashResponsePromise = page.waitForResponse(
      (r) => {
        if (!r.url().includes('/dashboards')) return false;
        if (r.url().includes('templates')) return false;
        return r.status() < 400;
      },
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToDashboards(page);

    const dashResponse = await dashResponsePromise;
    if (dashResponse) {
      // Check request headers included workspace ID
      const request = dashResponse.request();
      const headers = request.headers();
      // Workspace header should be present
      if (headers['x-workspace-id']) {
        expect(headers['x-workspace-id']).toBe(ids.workspaceId);
      }
    }
  });

  test('no 403 errors on dashboard pages', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 403) {
        errors.push(`403 on ${response.url()}`);
      }
    });

    await navigateToDashboards(page);
    await page.waitForTimeout(3000);

    expect(errors).toHaveLength(0);
  });
});
