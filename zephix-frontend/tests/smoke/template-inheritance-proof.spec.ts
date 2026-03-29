import { expect, test } from '@playwright/test';

const PROOF_EMAIL = process.env.PROOF_USER_EMAIL || 'proof.e2e@zephix.dev';
const PROOF_PASSWORD = process.env.PROOF_USER_PASSWORD || 'ProofPass123!@#';

async function loginViaUi(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  const csrfResp = await page.request.get('/api/auth/csrf');
  if (!csrfResp.ok()) {
    throw new Error(`CSRF failed: ${csrfResp.status()}`);
  }
  const csrfBody = await csrfResp.json();
  const csrfToken = csrfBody.csrfToken || csrfBody.token;
  const loginResp = await page.request.post('/api/auth/login', {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: { email, password },
  });
  if (!loginResp.ok()) {
    throw new Error(`Login API failed: ${loginResp.status()}`);
  }
  await page.goto('/home');
  await page.waitForLoadState('networkidle');
}

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function getCsrfToken(page: import('@playwright/test').Page): Promise<string> {
  const csrfRes = await page.request.get('/api/auth/csrf');
  if (!csrfRes.ok()) {
    throw new Error(`CSRF failed: ${csrfRes.status()}`);
  }
  const csrfJson = await csrfRes.json();
  return csrfJson.csrfToken || csrfJson.token;
}

async function createTemplate(
  page: import('@playwright/test').Page,
  csrfToken: string,
  name: string,
  category: string,
) {
  const response = await page.request.post('/api/templates', {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: {
      name,
      description: 'Template created by inheritance smoke proof',
      category,
      templateScope: 'ORG',
      kind: 'project',
      structure: {
        views: ['List', 'Board'],
        statuses: ['Todo', 'In Progress', 'Done'],
        requiredArtifacts: ['Risk Register', 'Lessons Learned'],
      },
    },
  });
  if (!response.ok()) {
    throw new Error(`Template create failed: ${response.status()}`);
  }
  const payload = await response.json();
  return unwrapData<{ id: string; name: string; category: string }>(payload);
}

async function markOnboardingSkipped(page: import('@playwright/test').Page) {
  const csrfToken = await getCsrfToken(page);
  const response = await page.request.post('/api/organizations/onboarding/skip', {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  });
  if (!response.ok()) {
    throw new Error(`Onboarding skip failed: ${response.status()}`);
  }
}

test('proof: workspace inheritance template governance flow', async ({ page }) => {
  test.setTimeout(180_000);

  await loginViaUi(page, PROOF_EMAIL, PROOF_PASSWORD);
  const csrfToken = await getCsrfToken(page);
  const allowedTemplate = await createTemplate(
    page,
    csrfToken,
    `Smoke Allowed Template ${Date.now()}`,
    'Software Development',
  );
  const disallowedTemplate = await createTemplate(
    page,
    csrfToken,
    `Smoke Disallowed Template ${Date.now()}`,
    'Operations',
  );

  const workspaceName = `Inheritance Proof ${Date.now()}`;
  const createWorkspaceRes = await page.request.post('/api/workspaces', {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    data: {
      name: workspaceName,
      visibility: 'OPEN',
      defaultTemplateId: allowedTemplate.id,
    },
  });
  expect(createWorkspaceRes.ok()).toBeTruthy();
  const createdWorkspace = unwrapData<{ workspaceId: string }>(
    await createWorkspaceRes.json(),
  );
  const workspaceId = createdWorkspace.workspaceId;
  expect(workspaceId).toBeTruthy();

  await markOnboardingSkipped(page);
  // useOnboardingCheck relies on AuthContext in-memory user state; reload remounts auth and picks updated flag.
  await page.goto('/home');
  await page.reload();
  // RequireWorkspace guard also requires active workspace in client store.
  await page.getByRole('button', { name: workspaceName }).first().click();
  await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}`));

  await page.goto(`/workspaces/${workspaceId}/settings`);
  await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaceId}/settings$`));
  await expect(page.getByTestId('ws-settings-root')).toBeVisible();
  await expect(page.getByTestId('ws-settings-nav-general')).toBeVisible();

  await page.selectOption(
    '[data-testid="ws-settings-default-template-select"]',
    allowedTemplate.id,
  );
  await page.selectOption(
    '[data-testid="ws-settings-governance-inheritance-select"]',
    'ORG_DEFAULT',
  );
  const inheritCheckbox = page.getByTestId(
    'ws-settings-inherit-org-default-checkbox',
  );
  if (!(await inheritCheckbox.isChecked())) {
    await inheritCheckbox.click();
  }
  if (disallowedTemplate) {
    await page.getByTestId(
      `ws-settings-allowed-template-${allowedTemplate.id}`,
    ).check();
    const disallowedCheckbox = page.getByTestId(
      `ws-settings-allowed-template-${disallowedTemplate.id}`,
    );
    if (await disallowedCheckbox.isChecked()) {
      await disallowedCheckbox.uncheck();
    }
  }

  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(`/api/workspaces/${workspaceId}/settings`) &&
        r.request().method() === 'PATCH' &&
        r.status() < 400,
    ),
    page.getByTestId('ws-settings-general-save').click(),
  ]);

  // Deep link opens modal over Home (no full-page Template Center)
  await page.goto(`/templates?workspaceId=${workspaceId}`);
  await page.waitForURL(/\/home/);
  await expect(page.getByRole('heading', { name: /template center/i })).toBeVisible();
  await expect(page.getByText('Waterfall Project Management')).toBeVisible();
  await expect(page.getByText(allowedTemplate.name).first()).toBeVisible();
  // Modal catalog does not replicate full-page workspace allowlist filtering (removed with TemplateCenterPage).

  await page.getByRole('button', { name: 'Use Template' }).first().click();
  await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click(); // step 1
  await page.getByRole('button', { name: 'Continue' }).click(); // step 2
  await page
    .locator('input[placeholder="Project name"]')
    .fill(`Governance Project ${Date.now()}`);
  await page.getByRole('button', { name: 'Continue' }).click(); // step 3
  await page.getByRole('button', { name: 'Continue' }).click(); // step 4

  await expect(page.getByText('Governance summary')).toBeVisible();
  await expect(page.getByText(/Capacity policy:/)).toBeVisible();
  await expect(page.getByText(/Risk model:/)).toBeVisible();

  const createFromTemplateResponsePromise = page.waitForResponse(
    (r) =>
      r.url().includes('/api/projects/from-template') &&
      r.request().method() === 'POST' &&
      r.status() < 400,
  );
  await page.getByRole('button', { name: 'Create project' }).click();
  const createFromTemplateResponse = await createFromTemplateResponsePromise;
  const createdProjectPayload = unwrapData<{ id: string }>(
    await createFromTemplateResponse.json(),
  );
  const projectId = createdProjectPayload.id;
  expect(projectId).toBeTruthy();

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`));
  await expect(page.getByText(workspaceName).first()).toBeVisible();

  const projectReadRes = await page.request.get(`/api/projects/${projectId}`);
  expect(projectReadRes.ok()).toBeTruthy();
  const projectReadJson = await projectReadRes.json();
  const projectData = unwrapData<any>(projectReadJson);
  expect(projectData?.templateSnapshot?.governanceSnapshot).toBeTruthy();
  expect(
    projectData?.templateSnapshot?.governanceSnapshot?.policyEvaluation?.decision,
  ).toBeTruthy();
});
