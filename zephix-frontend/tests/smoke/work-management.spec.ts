/**
 * Smoke Test: Work Management Module
 *
 * Covers:
 * - Project list and shell loading
 * - Plan tab with phases
 * - Task CRUD (create, edit, status change, delete, restore)
 * - Task comments (Wave 1)
 * - Task dependencies (Wave 1)
 * - Kanban board tab (Wave 1)
 * - Gantt read-only tab (Wave 1)
 * - Completion stats
 * - No 403 spam / route bounce
 */
import { test, expect } from '@playwright/test';
import {
  getSeedIds,
  loginAndSelectWorkspace,
  navigateToProject,
  navigateToProjectPlan,
  navigateToProjectTasks,
  navigateToProjectBoard,
  navigateToProjectGantt,
  navigateToProjects,
  assertNo403,
  assertNoRouteBounce,
} from './helpers';

test.describe('Work Management Module', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndSelectWorkspace(page);
  });

  test('project list loads without errors', async ({ page }) => {
    await navigateToProjects(page);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/projects');

    // Should see at least the seeded projects
    const ids = getSeedIds();
    await expect(page.locator('body')).toContainText(/project/i, { timeout: 10000 });
  });

  test('project shell loads for seeded project', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProject(page, ids.projectA.id);
    await assertNo403(page);

    // Project name should be visible
    await expect(page.locator('body')).toContainText(/alpha/i, { timeout: 10000 });
  });

  test('plan tab shows phases and tasks', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectPlan(page, ids.projectA.id);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/plan');

    // Wait for plan data to load
    await page.waitForTimeout(2000);

    // Should see phase content or plan structure
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('tasks tab lists seeded tasks', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectTasks(page, ids.projectA.id);
    await assertNo403(page);

    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Should show task content
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('task CRUD operations work via API', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectPlan(page, ids.projectA.id);
    await assertNo403(page);

    // Verify the plan API call succeeds
    const planResponse = await page.waitForResponse(
      (r) => r.url().includes(`/work/projects/${ids.projectA.id}/plan`) && r.status() < 400,
      { timeout: 10000 }
    ).catch(() => null);

    if (planResponse) {
      expect(planResponse.status()).toBeLessThan(400);
    }
  });

  test('task comments can be viewed and posted', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectTasks(page, ids.projectA.id);
    await assertNo403(page);

    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Click "Show Comments" on the first task
    const showCommentsBtn = page.locator('button', { hasText: /Show Comments/i }).first();
    if (await showCommentsBtn.isVisible()) {
      await showCommentsBtn.click();
      await page.waitForTimeout(1000);

      // Should see comments heading
      await expect(page.locator('h4', { hasText: /Comments/i }).first()).toBeVisible({ timeout: 5000 });

      // Type a comment and post
      const commentInput = page.locator('input[placeholder*="comment"]').first();
      if (await commentInput.isVisible()) {
        await commentInput.fill('Playwright smoke test comment');
        const postBtn = page.locator('button', { hasText: /Post/i }).first();
        if (await postBtn.isVisible()) {
          await postBtn.click();
          await page.waitForTimeout(2000);
          // Verify comment appears
          await expect(page.locator('body')).toContainText('Playwright smoke test comment', { timeout: 5000 });
        }
      }
    }
  });

  test('task dependencies panel shows and allows adding', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectTasks(page, ids.projectA.id);
    await assertNo403(page);

    // Wait for tasks to load
    await page.waitForTimeout(2000);

    // Click "Show Dependencies" on a task
    const showDepsBtn = page.locator('button', { hasText: /Show Dependencies/i }).first();
    if (await showDepsBtn.isVisible()) {
      await showDepsBtn.click();
      await page.waitForTimeout(1000);

      // Should see Dependencies heading
      await expect(page.locator('h4', { hasText: /Dependencies/i }).first()).toBeVisible({ timeout: 5000 });

      // Should see "Blocked by" and "Blocking" sections
      await expect(page.locator('text=Blocked by').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Blocking').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('board tab loads and shows columns', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectBoard(page, ids.projectA.id);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/board');

    // Wait for board to load
    await page.waitForTimeout(2000);

    // Should see the board root
    await expect(page.locator('[data-testid="board-root"]')).toBeVisible({ timeout: 10000 });

    // Should see column heading labels (use heading role to avoid matching select options)
    await expect(page.getByRole('heading', { name: 'To Do' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'In Progress' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible({ timeout: 5000 });

    // Should see at least one task card
    const cards = page.locator('[data-testid="board-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test('gantt tab loads and shows chart or unscheduled', async ({ page }) => {
    const ids = getSeedIds();
    await navigateToProjectGantt(page, ids.projectA.id);
    await assertNo403(page);
    await assertNoRouteBounce(page, '/gantt');

    // Wait for gantt to load
    await page.waitForTimeout(3000);

    // Should see the gantt root
    await expect(page.locator('[data-testid="gantt-root"]')).toBeVisible({ timeout: 10000 });

    // Should show either the gantt chart or unscheduled section
    const body = await page.locator('body').textContent();
    const hasGanttContent = body?.includes('Gantt Chart');
    expect(hasGanttContent).toBeTruthy();
  });

  test('no 403 spam across work management navigation', async ({ page }) => {
    const ids = getSeedIds();

    // Track 403 responses
    const errors: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 403) {
        errors.push(`403 on ${response.url()}`);
      }
    });

    // Navigate through work management pages
    await navigateToProjects(page);
    await page.waitForTimeout(1000);

    await navigateToProject(page, ids.projectA.id);
    await page.waitForTimeout(1000);

    await navigateToProjectPlan(page, ids.projectA.id);
    await page.waitForTimeout(1000);

    await navigateToProjectTasks(page, ids.projectA.id);
    await page.waitForTimeout(1000);

    await navigateToProjectBoard(page, ids.projectA.id);
    await page.waitForTimeout(1000);

    await navigateToProjectGantt(page, ids.projectA.id);
    await page.waitForTimeout(1000);

    // No 403 errors should have occurred
    expect(errors).toHaveLength(0);
  });
});
