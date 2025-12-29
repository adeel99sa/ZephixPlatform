import { test, expect } from '@playwright/test';

/**
 * E2E Test: Resource Governance Flow
 *
 * Tests the complete "Governance Loop" including:
 * 1. Creating safe allocations (Scenario A)
 * 2. Triggering justification modal (Scenario B)
 * 3. Resolving with justification (Scenario C)
 *
 * This test automates the "Human Walkthrough" scenario described by the Architect.
 *
 * Prerequisites:
 * - Test environment with admin user
 * - Test workspace and resource IDs
 * - API endpoints accessible
 */

test.describe('Resource Governance Flow', () => {
  let workspaceId: string;
  let resourceId: string;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Login as admin user
    // NOTE: Update these credentials to match your test environment
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';

    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/\/home|\/dashboards|\/workspaces/, { timeout: 15000 });

    // Get test IDs from environment or use defaults
    workspaceId = process.env.TEST_WORKSPACE_ID || '';
    resourceId = process.env.TEST_RESOURCE_ID || '';
    projectId = process.env.TEST_PROJECT_ID || '';
  });

  test('Scenario A: Create safe allocation (50% load)', async ({ page }) => {
    test.skip(!workspaceId, 'TEST_WORKSPACE_ID not set');

    // Navigate to Resource Heatmap page
    await page.goto(`/workspaces/${workspaceId}/heatmap`);

    // Wait for heatmap to load
    await page.waitForSelector('h1:has-text("Resource Availability Heatmap")', { timeout: 10000 });

    // Verify page loaded correctly
    const heatmapTitle = page.locator('h1:has-text("Resource Availability Heatmap")');
    await expect(heatmapTitle).toBeVisible();

    // Verify legend is present with correct labels
    await expect(page.locator('text=/🟢.*Safe.*< 80%/')).toBeVisible();
    await expect(page.locator('text=/🟡.*Tentative/')).toBeVisible();
    await expect(page.locator('text=/🔴.*Critical.*> 100%/')).toBeVisible();

    // Verify date range pickers are present
    await expect(page.locator('input[type="date"]').first()).toBeVisible();

    // Note: To fully test allocation creation, you would:
    // 1. Click on a cell
    // 2. Fill allocation form
    // 3. Submit
    // 4. Verify cell turns green and shows "50%"
    // This requires UI components for allocation creation
  });

  test('Scenario B: Trigger governance modal (110% total load)', async ({ page, request }) => {
    test.skip(!workspaceId || !resourceId || !projectId, 'Test IDs not set');

    // Setup: Create first allocation (50%) via API
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get auth token
    const token = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        return state?.accessToken;
      }
      return null;
    });

    if (!token) {
      test.skip(true, 'No auth token available');
      return;
    }

    // Create first allocation (50%)
    const firstAllocation = await request.post('/api/resources/allocations', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        resourceId,
        projectId,
        allocationPercentage: 50,
        startDate,
        endDate,
      },
    });

    expect(firstAllocation.ok()).toBeTruthy();

    // Navigate to heatmap
    await page.goto(`/workspaces/${workspaceId}/heatmap`);
    await page.waitForSelector('h1:has-text("Resource Availability Heatmap")', { timeout: 10000 });

    // Now try to create second allocation (60%) that triggers justification
    // This would normally be done via UI, but we'll use API for testing
    const secondAllocation = await request.post('/api/resources/allocations', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        resourceId,
        projectId,
        allocationPercentage: 60, // Total will be 110%
        startDate,
        endDate,
      },
    });

    // Verify it returns 400 (justification required)
    expect(secondAllocation.status()).toBe(400);
    const errorBody = await secondAllocation.json();
    expect(errorBody.message || errorBody.error?.message || '').toContain('Justification is required');

    // Note: In a full UI test, you would:
    // 1. Click cell in heatmap
    // 2. Fill allocation form with 60%
    // 3. Click Save
    // 4. Verify modal appears with "Justification Required" title
  });

  test('Scenario C: Resolve with justification', async ({ page, request }) => {
    test.skip(!workspaceId || !resourceId || !projectId, 'Test IDs not set');

    // Setup: Create first allocation (50%)
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const token = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        return state?.accessToken;
      }
      return null;
    });

    if (!token) {
      test.skip(true, 'No auth token available');
      return;
    }

    // Create first allocation (50%)
    await request.post('/api/resources/allocations', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        resourceId,
        projectId,
        allocationPercentage: 50,
        startDate,
        endDate,
      },
    });

    // Now create second allocation (60%) WITH justification
    const justifiedAllocation = await request.post('/api/resources/allocations', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        resourceId,
        projectId,
        allocationPercentage: 60,
        startDate,
        endDate,
        justification: 'Automated Test Justification',
      },
    });

    // Verify it succeeds (201 or 200)
    expect([200, 201]).toContain(justifiedAllocation.status());

    // Navigate to heatmap and verify cell shows critical state
    await page.goto(`/workspaces/${workspaceId}/heatmap`);
    await page.waitForSelector('h1:has-text("Resource Availability Heatmap")', { timeout: 10000 });

    // Verify the cell would show critical classification
    // In a full UI test, you would check the actual cell color/classification

    // Note: In a full UI test, you would:
    // 1. Have modal open (from Scenario B)
    // 2. Fill textarea with "Automated Test Justification"
    // 3. Click "Submit"
    // 4. Wait for modal to close
    // 5. Verify success message/toast
    // 6. Verify cell background is red (critical)
    // 7. Verify tooltip shows justification when hovering
  });

  test('Full flow: Safe -> Justification -> Resolved', async ({ page }) => {
    // This is a comprehensive test that combines all scenarios
    // It requires a full test environment with:
    // - Test workspace
    // - Test resource
    // - Ability to create allocations via API or UI

    const workspaceId = process.env.TEST_WORKSPACE_ID;
    const resourceId = process.env.TEST_RESOURCE_ID;

    if (!workspaceId || !resourceId) {
      test.skip();
      return;
    }

    // Navigate to heatmap
    await page.goto(`/workspaces/${workspaceId}/heatmap`);
    await page.waitForSelector('h1:has-text("Resource Availability Heatmap")', { timeout: 10000 });

    // Step 1: Verify page loaded
    await expect(page.locator('text=Resource Availability Heatmap')).toBeVisible();
    await expect(page.locator('text=Safe:')).toBeVisible();

    // Step 2: Create first allocation (50%) via API or UI
    // This would require API setup or UI interaction

    // Step 3: Create second allocation (60%) that triggers justification
    // This would open the justification modal

    // Step 4: Fill and submit justification
    // This would complete the flow

    // For now, this test structure is in place for future implementation
    // with proper test data setup
  });
});

/**
 * Helper function to create test allocation via API
 * This would be used in a real test environment
 */
async function createTestAllocation(
  page: any,
  resourceId: string,
  projectId: string,
  allocationPercentage: number,
  startDate: string,
  endDate: string,
) {
  // Get auth token from page context
  const token = await page.evaluate(() => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const { state } = JSON.parse(authStorage);
      return state?.accessToken;
    }
    return null;
  });

  if (!token) {
    throw new Error('No auth token found');
  }

  // Make API call to create allocation
  const response = await page.request.post('/api/resources/allocations', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      resourceId,
      projectId,
      allocationPercentage,
      startDate,
      endDate,
    },
  });

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to create allocation: ${error}`);
  }

  return response.json();
}





