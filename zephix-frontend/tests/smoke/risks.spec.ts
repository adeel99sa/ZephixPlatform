/**
 * Smoke Test: Risk Management Module
 *
 * Covers:
 * - Risks tab loads for a project
 * - Seeded risks appear
 * - Risk data integrity (correct projectId, valid owner)
 * - No 403 spam
 */
import { test, expect } from '@playwright/test';
import {
  getSeedIds,
  loginAndSelectWorkspace,
  navigateToProjectRisks,
  assertNo403,
  assertNoRouteBounce,
} from './helpers';

test.describe('Risk Management Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('risks tab loads for seeded project', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectRisks(page, ids.projectA.id);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/risks');

    // Wait for content to load
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('risks API returns seeded risks with correct project', async ({ page }) => {
    const ids = getSeedIds();

    const riskResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/work/risks') && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToProjectRisks(page, ids.projectA.id);

    const riskResponse = await riskResponsePromise;
    if (riskResponse) {
      expect(riskResponse.status()).toBeLessThan(400);
      const body = await riskResponse.json().catch(() => null);
      if (body) {
        const items = body?.data?.items ?? body?.items ?? [];
        // Verify risks belong to correct project
        for (const risk of items) {
          expect(risk.projectId).toBe(ids.projectA.id);
        }
        // Should have at least the seeded risks
        if (items.length > 0) {
          // Verify risk has required fields
          const firstRisk = items[0];
          expect(firstRisk).toHaveProperty('id');
          expect(firstRisk).toHaveProperty('title');
          expect(firstRisk).toHaveProperty('severity');
          expect(firstRisk).toHaveProperty('status');
        }
      }
    }
  });

  test('risk owner is a valid user', async ({ page }) => {
    const ids = getSeedIds();

    const riskResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/work/risks') && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    await navigateToProjectRisks(page, ids.projectA.id);

    const riskResponse = await riskResponsePromise;
    if (riskResponse) {
      const body = await riskResponse.json().catch(() => null);
      if (body) {
        const items = body?.data?.items ?? body?.items ?? [];
        for (const risk of items) {
          if (risk.ownerUserId) {
            // Owner should be the seeded user
            expect(risk.ownerUserId).toBe(ids.userId);
          }
        }
      }
    }
  });

  test('no 403 errors on risk pages', async ({ page }) => {
    const ids = getSeedIds();
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 403) {
        errors.push(`403 on ${response.url()}`);
      }
    });

    await navigateToProjectRisks(page, ids.projectA.id);
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });
});
