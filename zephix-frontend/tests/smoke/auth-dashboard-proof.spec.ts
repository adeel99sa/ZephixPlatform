import { test, expect } from '@playwright/test';

const PROOF_EMAIL = process.env.PROOF_USER_EMAIL || 'proof.e2e@zephix.dev';
const PROOF_PASSWORD = process.env.PROOF_USER_PASSWORD || 'ProofPass123!@#';
test.describe.configure({ retries: 0 });

async function loginViaUi(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator('input[autocomplete="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() < 400),
    page.locator('button[type="submit"]').first().click(),
  ]);
}

test('proof: login onboarding home workspace dashboard canonical routes', async ({ page, context }) => {
  test.setTimeout(120_000);
  // Flow A. New user: login -> onboarding -> home -> workspace tree -> dashboard under workspace
  await loginViaUi(page, PROOF_EMAIL, PROOF_PASSWORD);

  const workspaceName = `Proof Workspace ${Date.now()}`;
  await expect(page).toHaveURL(/\/onboarding/);
  await page.locator('input[placeholder="Engineering"]').fill(workspaceName);
  await page.locator('input[placeholder="engineering"]').fill(`proof-${Date.now()}`);
  await page.getByRole('button', { name: /create workspace/i }).click();
  await expect(page.getByText(/create your project/i)).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/organizations/onboarding/skip') &&
        r.status() < 400,
    ),
    page.getByRole('button', { name: /skip setup/i }).click(),
  ]);
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await loginViaUi(page, PROOF_EMAIL, PROOF_PASSWORD);
  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();

  // Workspace created during onboarding appears in left tree
  const workspaceButtons = page.getByRole('button', { name: workspaceName });
  await expect(workspaceButtons.first()).toBeVisible();

  // Navigate to workspace and create dashboard in that workspace via workspace header "+" control
  await workspaceButtons.first().click();
  await expect(page).toHaveURL(/\/workspaces\/[0-9a-f-]+/);
  const workspaceIdFromUrl = page.url().match(/\/workspaces\/([0-9a-f-]+)/)?.[1];
  expect(workspaceIdFromUrl).toBeTruthy();

  const workspaceNode = page.locator('div.relative.group\\/ws').filter({
    has: page.getByRole('button', { name: workspaceName }),
  });
  const createDashboardResponse = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/workspaces/${workspaceIdFromUrl}/dashboards`) &&
      r.request().method() === 'POST' &&
      r.status() < 400,
  );
  await workspaceNode.locator('button[title="New dashboard"]').click({ force: true });
  const dashboardResponse = await createDashboardResponse;
  const createdDashboardJson = (await dashboardResponse.json()) as {
    data?: { id?: string };
    id?: string;
  };
  const createdDashboardId =
    createdDashboardJson?.data?.id || createdDashboardJson?.id;
  expect(createdDashboardId).toBeTruthy();
  if (!page.url().includes(`/dashboard/${createdDashboardId}`)) {
    await page.goto(`/workspaces/${workspaceIdFromUrl}/dashboard/${createdDashboardId}`);
  }
  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${workspaceIdFromUrl}/dashboard/${createdDashboardId}`),
  );

  const dashboardId = createdDashboardId;
  expect(dashboardId).toBeTruthy();

  // Verify dashboard appears in workspace-scoped listing
  await page.goto(`/workspaces/${workspaceIdFromUrl}/dashboards`);
  await expect(page).toHaveURL(`/workspaces/${workspaceIdFromUrl}/dashboards`);
  const workspaceDashboardsResponse = await page.request.get(
    `/api/workspaces/${workspaceIdFromUrl}/dashboards`,
  );
  expect(workspaceDashboardsResponse.ok()).toBeTruthy();
  const workspaceDashboardsJson = (await workspaceDashboardsResponse.json()) as {
    data?: Array<{ id?: string }>;
  };
  const dashboardIds = (workspaceDashboardsJson.data || [])
    .map((item) => item?.id)
    .filter(Boolean);
  expect(dashboardIds).toContain(dashboardId);

  // Flow B. Existing onboarded user: login -> /home (no onboarding redirect)
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/login');
  await loginViaUi(page, PROOF_EMAIL, PROOF_PASSWORD);
  await expect(page).toHaveURL(/\/home/);
  await expect(page).not.toHaveURL(/\/onboarding/);

  // Flow C. Legacy route safety and workspace-canonical route
  await page.goto('/dashboards');
  await expect(page).toHaveURL(/\/home/);

  await page.goto(`/workspaces/${workspaceIdFromUrl}/dashboard/${dashboardId}`);
  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${workspaceIdFromUrl}/dashboard/${dashboardId}`),
  );
});
