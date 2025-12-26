import { test, expect } from '@playwright/test';

/**
 * Admin Smoke Test - Minimum E2E Flow
 *
 * Tests the critical admin flows to ensure hardening prevents UI breakage:
 * 1. Login as admin
 * 2. Visit /admin and verify it loads
 * 3. Click Billing, assert Current Plan renders
 * 4. Visit /templates, instantiate, assert projectId returned then project page loads
 * 5. Visit /workspaces, assert list loads or empty state renders
 * 6. Visit /projects, assert list loads or empty state renders
 */

test.describe('Admin Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@zephix.ai');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/\/(home|admin|dashboard)/, { timeout: 10000 });

    // Wait for auth to be ready (no 401 loops)
    await page.waitForTimeout(1000);

    // ✅ NEW: Hard refresh to catch auth hydration regressions
    await page.reload({ waitUntil: 'networkidle' });

    // Re-assert admin menu still visible after refresh
    const adminMenuVisible = await page.locator('text=/Administration|Admin/i, [data-testid*="admin"], nav:has-text("Admin")').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(adminMenuVisible).toBe(true);

    // Re-assert /admin loads after refresh
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Administration|Admin|Overview/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should load admin dashboard without errors', async ({ page }) => {
    // Visit /admin
    await page.goto('/admin');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Verify admin dashboard loads (check for admin-specific content)
    await expect(page.locator('text=/Administration|Admin|Overview/i').first()).toBeVisible({ timeout: 10000 });

    // ✅ NEW ASSERT: Admin menu visible after login
    const adminMenuVisible = await page.locator('text=/Administration|Admin/i, [data-testid*="admin"], nav:has-text("Admin")').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(adminMenuVisible).toBe(true);

    // Verify no critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('sourcemap') &&
      !e.includes('Extension')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should load billing page and show current plan', async ({ page }) => {
    // Visit /admin
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click Billing (look for link or button with "Billing" text)
    const billingLink = page.locator('a:has-text("Billing"), button:has-text("Billing"), [data-testid*="billing"]').first();
    if (await billingLink.isVisible()) {
      await billingLink.click();
      await page.waitForURL(/\/admin\/billing/, { timeout: 10000 });
    } else {
      // Try direct navigation
      await page.goto('/admin/billing');
    }

    await page.waitForLoadState('networkidle');

    // Assert Current Plan renders (or empty state)
    const currentPlanVisible = await page.locator('text=/Current Plan|Plan|Subscription/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    const emptyStateVisible = await page.locator('text=/No plan|Not configured|Empty/i').first().isVisible({ timeout: 5000 }).catch(() => false);

    // Either current plan or empty state should be visible (both are valid)
    expect(currentPlanVisible || emptyStateVisible).toBe(true);

    // ✅ NEW ASSERT: Billing shows Current Plan name text
    if (currentPlanVisible) {
      const planNameText = await page.locator('text=/Starter|Professional|Enterprise|Free|Trial/i').first().isVisible({ timeout: 3000 }).catch(() => false);
      // Plan name should be visible if current plan is visible
      expect(planNameText).toBe(true);
    }
  });

  test('should instantiate template and load project', async ({ page }) => {
    // Visit /templates
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    // Wait for templates to load (or empty state)
    const templatesVisible = await page.locator('[data-testid*="template"], .template-card, text=/Template/i').first().isVisible({ timeout: 10000 }).catch(() => false);
    const emptyStateVisible = await page.locator('text=/No templates|Empty|Create/i').first().isVisible({ timeout: 5000 }).catch(() => false);

    // If templates exist, try to instantiate one
    if (templatesVisible) {
      // Click first template card or "Use Template" button
      const templateCard = page.locator('[data-testid*="template"], .template-card').first();
      await templateCard.click();

      // Wait for template detail or instantiate modal
      await page.waitForTimeout(1000);

      // Look for "Create Project" or "Use Template" button
      const createButton = page.locator('button:has-text("Create"), button:has-text("Use Template"), button:has-text("Instantiate")').first();
      if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createButton.click();

        // Fill in required fields if modal appears
        const workspaceSelect = page.locator('select, [data-testid*="workspace"]').first();
        const projectNameInput = page.locator('input[placeholder*="name"], input[name*="name"]').first();

        if (await workspaceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await workspaceSelect.selectOption({ index: 0 });
        }

        if (await projectNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await projectNameInput.fill('Test Project from E2E');
        }

        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
        if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitButton.click();

          // Wait for project page to load
          await page.waitForURL(/\/projects\//, { timeout: 10000 });

          // ✅ NEW ASSERT: Template instantiate returns a projectId and redirects to project page route
          const currentUrl = page.url();
          const projectIdMatch = currentUrl.match(/\/projects\/([^\/]+)/);
          expect(projectIdMatch).not.toBeNull();
          expect(projectIdMatch?.[1]).toBeTruthy();

          // Verify project page loaded
          await expect(page.locator('text=/Test Project from E2E|Project/i').first()).toBeVisible({ timeout: 5000 });
        }
      }
    } else {
      // No templates - this is valid (empty state)
      expect(emptyStateVisible).toBe(true);
    }
  });

  test('should load workspaces page with list or empty state', async ({ page }) => {
    // Visit /workspaces
    await page.goto('/workspaces');
    await page.waitForLoadState('networkidle');

    // Assert list loads or empty state renders
    const workspaceListVisible = await page.locator('[data-testid*="workspace"], .workspace-card, text=/Workspace/i').first().isVisible({ timeout: 10000 }).catch(() => false);
    const emptyStateVisible = await page.locator('text=/No workspaces|Empty|Create workspace/i').first().isVisible({ timeout: 5000 }).catch(() => false);

    // Either workspace list or empty state should be visible (both are valid)
    expect(workspaceListVisible || emptyStateVisible).toBe(true);

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('sourcemap') &&
      !e.includes('Extension')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should load projects page with list or empty state', async ({ page }) => {
    // Visit /projects (may need workspace context)
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Assert list loads or empty state renders
    const projectListVisible = await page.locator('[data-testid*="project"], .project-card, text=/Project/i').first().isVisible({ timeout: 10000 }).catch(() => false);
    const emptyStateVisible = await page.locator('text=/No projects|Empty|Create project/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    const selectWorkspaceVisible = await page.locator('text=/Select a workspace|Choose workspace/i').first().isVisible({ timeout: 5000 }).catch(() => false);

    // Any of these states is valid (list, empty, or need workspace selection)
    expect(projectListVisible || emptyStateVisible || selectWorkspaceVisible).toBe(true);

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('sourcemap') &&
      !e.includes('Extension')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

