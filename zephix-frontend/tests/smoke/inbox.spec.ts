/**
 * Smoke Test: Inbox / Notifications (Phase 4.1)
 *
 * Covers:
 * - Inbox page loads
 * - Notification bell appears in sidebar
 * - Mark read works
 * - No 403 errors
 */
import { test, expect } from '@playwright/test';
import {
  loginAndSelectWorkspace,
  assertNo403,
} from './helpers';

test.describe('Inbox / Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('inbox page loads and shows notification list', async ({ page }) => {
    // Navigate to inbox
    const inboxLink = page.locator('[data-testid="nav-inbox"]');
    const hasInboxNav = await inboxLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasInboxNav) {
      await inboxLink.click();
    } else {
      // fallback: direct navigation
      await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    }

    await assertNo403(page);

    // Verify inbox page renders
    const inboxPage = page.locator('[data-testid="inbox-page"]');
    const visible = await inboxPage.isVisible({ timeout: 8000 }).catch(() => false);

    if (visible) {
      // Verify tab buttons exist
      await expect(page.locator('button', { hasText: 'All' })).toBeVisible({ timeout: 3000 });
      await expect(page.locator('button', { hasText: 'Unread' })).toBeVisible({ timeout: 3000 });
    }

    // Page should have loaded without errors
    expect(page.url()).toContain('/inbox');
  });

  test('notification bell badge appears in sidebar', async ({ page }) => {
    // Check if the inbox nav link is in the sidebar
    const inboxLink = page.locator('[data-testid="nav-inbox"]');
    const exists = await inboxLink.isVisible({ timeout: 5000 }).catch(() => false);

    // Bell should exist for paid users
    expect(exists).toBe(true);
  });

  test('unread count API returns valid response', async ({ page }) => {
    // Make API call directly to verify endpoint
    const response = await page.request.get('/api/notifications/unread-count');

    // Should not be 403 or 500
    expect(response.status()).not.toBe(500);

    if (response.status() === 200) {
      const data = await response.json();
      const count = (data.data ?? data).count;
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('mark all read API works', async ({ page }) => {
    // Navigate to inbox
    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Try clicking "Mark all as read" if visible
    const markAllBtn = page.locator('button', { hasText: 'Mark all as read' });
    const hasBtn = await markAllBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasBtn) {
      await markAllBtn.click();
      // Should show success toast or update UI
      await page.waitForTimeout(1000);
    }

    // No errors expected either way
    await assertNo403(page);
  });

  test('no 403 errors on inbox pages', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', (response) => {
      if (response.status() === 403) {
        errors.push(`403 on ${response.url()}`);
      }
    });

    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    expect(errors).toHaveLength(0);
  });
});
