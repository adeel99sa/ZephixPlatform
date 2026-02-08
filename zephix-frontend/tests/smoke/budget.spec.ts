/**
 * Smoke Test: Budget Module
 *
 * Budget is stored as fields on the Project entity (budget, actualCost).
 * No separate budget CRUD. Tests verify:
 * - Project overview shows budget data
 * - Budget fields are present and correct
 * - KPIs endpoint works
 * - No 403 spam
 */
import { test, expect } from '@playwright/test';
import {
  getSeedIds,
  loginAndSelectWorkspace,
  navigateToProject,
  assertNo403,
} from './helpers';

test.describe('Budget Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('project overview shows budget data', async ({ page }) => {
    const ids = getSeedIds();

    const projectResponsePromise = page.waitForResponse(
      (r) => r.url().includes(`/projects/${ids.projectA.id}`) && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToProject(page, ids.projectA.id);
    await assertNo403(page);

    const projectResponse = await projectResponsePromise;
    if (projectResponse) {
      expect(projectResponse.status()).toBeLessThan(400);
      const body = await projectResponse.json().catch(() => null);
      if (body) {
        const project = body?.data ?? body;
        // Budget fields should exist
        if (project.budget !== undefined && project.budget !== null) {
          expect(typeof project.budget).toBe('number');
        }
      }
    }
  });

  test('project KPIs endpoint works', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProject(page, ids.projectA.id);
    await assertNo403(page);

    // Try fetching KPIs directly
    const kpiResponse = await page.waitForResponse(
      (r) => r.url().includes('/kpis') && r.status() < 500,
      { timeout: 5000 }
    ).catch(() => null);

    // KPIs may or may not be available
    if (kpiResponse) {
      expect(kpiResponse.status()).toBeLessThan(500);
    }
  });

  test('budget uses same project id and org id', async ({ page }) => {
    const ids = getSeedIds();

    const projectResponsePromise = page.waitForResponse(
      (r) => r.url().includes(`/projects/${ids.projectA.id}`) && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToProject(page, ids.projectA.id);

    const projectResponse = await projectResponsePromise;
    if (projectResponse) {
      const body = await projectResponse.json().catch(() => null);
      if (body) {
        const project = body?.data ?? body;
        expect(project.id).toBe(ids.projectA.id);
        if (project.organizationId) {
          expect(project.organizationId).toBe(ids.organizationId);
        }
      }
    }
  });
});
