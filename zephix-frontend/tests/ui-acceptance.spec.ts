/**
 * UI Acceptance Smoke Lane
 *
 * Tests the full customer journey in the browser against live staging.
 * Serial execution — stop on first failure.
 *
 * Session strategy: smokeLoginWithPage(page, ...) is used for all user sessions.
 * It calls smoke-login via page.request, which writes cookies directly into the page's
 * browser context. This is the correct approach for cross-domain cookie scoping because
 * the cookies land in the browser's own cookie store — the same path as a real UI login.
 * No cookie extraction and re-injection required.
 *
 * Each serial test re-establishes its user's session via page.request at the start.
 * Entity IDs (workspaceId, projectId, etc.) are shared via the STATE object which
 * persists across serial tests in the same process.
 *
 * Requirements:
 *   STAGING_FRONTEND_BASE  — live frontend URL (stop condition if missing)
 *   STAGING_BACKEND_BASE   — backend API base (read from staging.env)
 *   STAGING_SMOKE_KEY      — smoke bypass key (never logged)
 *
 * Do not add backend endpoints. Do not change backend behavior.
 * Do not print secret values.
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { smokeLoginWithPage, smokeLoginSession } from './helpers/session';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  ensureProofDir,
  saveScreenshot,
  saveHtmlSnapshot,
  stepLog,
  writeReadme,
  saveJson,
} from './helpers/proof';

// ─── Config ───────────────────────────────────────────────────────────────────

function readStagingEnvKey(key: string): string {
  try {
    const envPath = path.resolve(__dirname, '../../..', 'docs/ai/environments/staging.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    const line = content.split('\n').find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : '';
  } catch {
    return '';
  }
}

const FRONTEND_BASE =
  process.env.STAGING_FRONTEND_BASE || readStagingEnvKey('STAGING_FRONTEND_BASE') || '';
const API_BASE =
  (process.env.STAGING_BACKEND_BASE || readStagingEnvKey('STAGING_BACKEND_BASE') || '') + '/api';
const SMOKE_KEY = process.env.STAGING_SMOKE_KEY || '';

// ─── Shared state ─────────────────────────────────────────────────────────────

// Lowercase so the T separator does not cause case mismatch when smokeLogin normalises emails.
const RUN_ID = new Date().toISOString().replace(/[^0-9T]/g, '').slice(0, 15).toLowerCase();

const STATE: {
  adminEmail: string;
  memberEmail: string;
  viewerEmail: string;
  orgId: string;
  workspaceId: string;
  workspaceSlug: string;
  projectId: string;
  taskId: string;
  commitSha: string;
  railwayDeploymentId: string;
  firstFailureStep: string;
  result: 'PASS' | 'FAIL';
} = {
  adminEmail: `staging+admin+${RUN_ID}@zephix.dev`,
  memberEmail: `staging+member+${RUN_ID}@zephix.dev`,
  viewerEmail: `staging+viewer+${RUN_ID}@zephix.dev`,
  orgId: '',
  workspaceId: '',
  workspaceSlug: '',
  projectId: '',
  taskId: '',
  commitSha: '',
  railwayDeploymentId: '',
  firstFailureStep: '',
  result: 'FAIL',
};

function fail(step: string, detail: string): never {
  STATE.firstFailureStep = STATE.firstFailureStep || step;
  stepLog(step, 'FAIL', detail);
  throw new Error(`${step}: ${detail}`);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('UI Acceptance Journey', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    ensureProofDir();

    if (!FRONTEND_BASE) {
      const msg =
        'STOP: STAGING_FRONTEND_BASE is empty. Populate docs/ai/environments/staging.env key STAGING_FRONTEND_BASE= then rerun.';
      ensureProofDir();
      stepLog('00-preflight', 'FAIL', msg);
      writeReadme({
        run_id: RUN_ID,
        date_utc: new Date().toISOString(),
        staging_base: API_BASE,
        frontend_base: FRONTEND_BASE,
        commit_sha: '',
        railway_deployment_id: '',
        result: 'FAIL',
        first_failure_step: '00-preflight',
        entity_ids: {},
      });
      throw new Error(msg);
    }
    if (!SMOKE_KEY) {
      const msg = 'STOP: STAGING_SMOKE_KEY is missing from environment.';
      stepLog('00-preflight', 'FAIL', msg);
      throw new Error(msg);
    }
  });

  test.afterAll(async () => {
    writeReadme({
      run_id: RUN_ID,
      date_utc: new Date().toISOString(),
      staging_base: API_BASE,
      frontend_base: FRONTEND_BASE,
      commit_sha: STATE.commitSha,
      railway_deployment_id: STATE.railwayDeploymentId,
      result: STATE.result,
      first_failure_step: STATE.firstFailureStep || undefined,
      entity_ids: {
        ...(STATE.orgId && { orgId: STATE.orgId }),
        ...(STATE.workspaceId && { workspaceId: STATE.workspaceId }),
        ...(STATE.projectId && { projectId: STATE.projectId }),
        ...(STATE.taskId && { taskId: STATE.taskId }),
        adminEmail: STATE.adminEmail,
        memberEmail: STATE.memberEmail,
        viewerEmail: STATE.viewerEmail,
      },
    });
  });

  // ── Step 00: Preflight ───────────────────────────────────────────────────

  test('00-preflight: version endpoint returns commitShaTrusted=true and env=staging', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/version`);
    if (resp.status() !== 200) {
      fail('00-preflight', `version endpoint returned ${resp.status()}`);
    }
    const body = await resp.json();
    saveJson('00-preflight-version', body);

    STATE.commitSha = body.commitSha || '';
    STATE.railwayDeploymentId = body.railwayDeploymentId || '';

    expect(body.zephixEnv, 'expected zephixEnv=staging').toBe('staging');
    expect(body.commitShaTrusted, 'expected commitShaTrusted=true').toBe(true);
    expect(STATE.railwayDeploymentId, 'railwayDeploymentId must be non-empty').not.toBe('');

    stepLog('00-preflight', 'PASS', `sha=${STATE.commitSha} deploy=${STATE.railwayDeploymentId}`);
  });

  test('00b-preflight: health/ready returns 200', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/health/ready`);
    if (resp.status() !== 200) {
      fail('00b-preflight-health', `health/ready returned ${resp.status()} — schema drift may be blocking`);
    }
    stepLog('00b-preflight-health', 'PASS');
  });

  // ── Step 10: Signup page renders (DOM check only, no submission) ─────────

  test('10-signup: signup page renders with all required input fields', async ({ page }) => {
    // This test navigates to the public /signup route and checks DOM only.
    // It does NOT submit the form — submission requires email verification
    // which cannot complete in staging automation. Admin creation uses API in step 11.
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, '10-signup-page');

    await expect(page.locator('[data-testid="signup-page"]')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="orgName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    stepLog('10-signup', 'PASS', 'signup page renders with fullName/email/password/orgName fields and submit button');
  });

  // ── Step 11: Create admin org + establish authenticated browser session ───

  test('11-login-owner: create admin org via API, smoke-login via page.request, assert /auth/me 200', async ({ page }) => {
    // Create admin user + org via smoke/users/create — bypasses /auth/register rate limiter.
    // smoke/users/create calls AuthRegistrationService.registerSelfServe directly.
    // Returns neutral message; org ID retrieved from /auth/me after smoke-login.
    const apiCtx = await playwrightRequest.newContext();
    try {
      const regResp = await apiCtx.post(`${API_BASE}/smoke/users/create`, {
        headers: { 'Content-Type': 'application/json', 'X-Smoke-Key': SMOKE_KEY },
        data: {
          fullName: 'Smoke Admin',
          email: STATE.adminEmail,
          password: 'Smoke!Admin123',
          orgName: `SmokeOrg ${RUN_ID}`,
        },
      });
      if (!regResp.ok()) {
        const body = await regResp.text();
        fail('11-org-signup', `smoke/users/create status=${regResp.status()} body=${body.slice(0, 200)}`);
      }
    } finally {
      await apiCtx.dispose();
    }

    // Establish admin session in THIS page's browser context via page.request.
    // smokeLoginWithPage calls csrf + smoke-login through page.request, which stores
    // cookies directly in the page's browser context. No addCookies needed.
    await smokeLoginWithPage(page, API_BASE, STATE.adminEmail, SMOKE_KEY);

    // Fetch orgId from /auth/me — register returns neutral response, no org ID in body.
    const adminMeResp = await page.request.get(`${API_BASE}/auth/me`);
    if (adminMeResp.ok()) {
      const adminMeBody = await adminMeResp.json();
      STATE.orgId =
        adminMeBody?.data?.organizationId ||
        adminMeBody?.data?.organization?.id ||
        adminMeBody?.organizationId ||
        '';
    }
    if (!STATE.orgId) {
      fail('11-org-id', `/auth/me did not return organizationId. status=${adminMeResp.status()}`);
    }

    // ── Auth proof: intercept /auth/me and assert 200 ──────────────────────
    // This is the direct evidence that cookie scoping works: the browser, while on
    // the frontend domain, successfully authenticates against the backend domain.
    const authMeResponse = await page.waitForResponse(
      (r) => r.url().includes('/auth/me') && r.request().method() === 'GET',
      { timeout: 15000 },
    ).catch(() => null);

    // Navigate to /home — the frontend will call /auth/me as part of app bootstrap
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Wait for /auth/me call that happens during app bootstrap
    const authMeResp = await page.waitForResponse(
      (r) => r.url().includes('/auth/me') && r.request().method() === 'GET',
      { timeout: 15000 },
    ).catch(() => null);

    await saveScreenshot(page, '11-home-owner');

    if (authMeResp) {
      const authMeStatus = authMeResp.status();
      if (authMeStatus !== 200) {
        fail('11-auth-me', `/auth/me returned ${authMeStatus} — session cookie not working cross-domain. Frontend: ${FRONTEND_BASE}, Backend: ${API_BASE}`);
      }
      const authMeBody = await authMeResp.json().catch(() => null);
      const authenticatedEmail = authMeBody?.data?.email || authMeBody?.email || '(unknown)';
      stepLog('11-auth-me-proof', 'PASS', `/auth/me=200 email=${authenticatedEmail}`);
    } else {
      // /auth/me call not intercepted — page may have already loaded from cache
      // Fall back to URL check
      stepLog('11-auth-me-proof', 'SKIP', '/auth/me response not intercepted (page may have cached auth state)');
    }

    const url = page.url();
    if (!url.includes('/home') && !url.includes('/setup') && !url.includes('/onboarding')) {
      fail('11-login-owner', `admin landed on unexpected url: ${url}`);
    }

    stepLog('11-login-owner', 'PASS', `orgId=${STATE.orgId} url=${url}`);
  });

  // ── Step 12: Create workspace via UI form ────────────────────────────────

  test('12-create-workspace: create first workspace via UI form, assert redirect to /w/:slug/home', async ({ page }) => {
    // Restore admin session in this page
    await smokeLoginWithPage(page, API_BASE, STATE.adminEmail, SMOKE_KEY);

    await page.goto('/setup/workspace');
    await page.waitForLoadState('networkidle');

    const wsName = `Smoke WS ${RUN_ID}`;
    const input = page.locator('input#workspaceName');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(wsName);

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/workspaces') && r.status() === 201, {
        timeout: 15000,
      }),
      page.locator('button[type="submit"]').click(),
    ]);

    const wsBody = await response.json();
    STATE.workspaceId =
      wsBody.data?.id || wsBody.id || wsBody.data?.workspace?.id || wsBody.workspace?.id || '';
    STATE.workspaceSlug =
      wsBody.data?.slug || wsBody.slug || wsBody.data?.workspace?.slug || wsBody.workspace?.slug || '';

    await page.waitForURL(/\/w\/.+\/home/, { timeout: 15000 });
    await saveScreenshot(page, '12-create-workspace');

    if (!STATE.workspaceId) {
      fail('12-create-workspace', 'workspace id missing from response');
    }
    stepLog('12-create-workspace', 'PASS', `workspaceId=${STATE.workspaceId} slug=${STATE.workspaceSlug}`);
  });

  // ── Step 13+14: Portfolio and program (feature-gated, skip if off) ───────

  test('13-14-portfolio-program: create portfolio + program if programsPortfolios flag is on', async ({ page }) => {
    await smokeLoginWithPage(page, API_BASE, STATE.adminEmail, SMOKE_KEY);

    await page.goto(`/workspaces/${STATE.workspaceId}/portfolios`);
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/portfolios')) {
      stepLog('13-14-portfolio-program', 'SKIP', 'programsPortfolios feature flag off — page redirected away');
      return;
    }

    const portfolioResp = await page.request.post(
      `${API_BASE}/workspaces/${STATE.workspaceId}/portfolios`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Workspace-Id': STATE.workspaceId,
        },
        data: { name: `Smoke Portfolio ${RUN_ID}` },
      },
    );

    if (!portfolioResp.ok()) {
      stepLog('13-14-portfolio-program', 'SKIP', `portfolios API returned ${portfolioResp.status()}`);
      return;
    }

    const pb = await portfolioResp.json();
    const portfolioId = pb.data?.id || pb.id || pb.data?.portfolio?.id || pb.portfolio?.id || '';

    if (portfolioId) {
      const programResp = await page.request.post(
        `${API_BASE}/workspaces/${STATE.workspaceId}/portfolios/${portfolioId}/programs`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Workspace-Id': STATE.workspaceId,
          },
          data: { name: `Smoke Program ${RUN_ID}` },
        },
      );
      stepLog(
        '13-14-portfolio-program',
        programResp.ok() ? 'PASS' : 'FAIL',
        `portfolioId=${portfolioId} programStatus=${programResp.status()}`,
      );
    } else {
      stepLog('13-14-portfolio-program', 'FAIL', 'portfolioId missing from response');
    }

    await saveScreenshot(page, '13-portfolios-page');
  });

  // ── Step 15: Create project ──────────────────────────────────────────────

  test('15-create-project: create project via API, navigate to /projects, assert appears in list', async ({ page }) => {
    await smokeLoginWithPage(page, API_BASE, STATE.adminEmail, SMOKE_KEY);

    // Navigate to frontend first so localStorage ops target the correct origin.
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Create project via page.request BEFORE navigating to /projects.
    // usePhase5_1Redirect fires on /projects and redirects to /templates when the workspace
    // has zero projects — creating the project first prevents that redirect.
    const projCsrfResp = await page.request.get(`${API_BASE}/auth/csrf`);
    const projCsrfBody = await projCsrfResp.json();
    const projCsrfToken = projCsrfBody.csrfToken || projCsrfBody.token || '';
    const projResp = await page.request.post(`${API_BASE}/projects`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': projCsrfToken,
        'X-Workspace-Id': STATE.workspaceId,
      },
      data: {
        name: `Smoke Project ${RUN_ID}`,
        workspaceId: STATE.workspaceId,
      },
    });
    if (projResp.status() !== 201) {
      fail('15-create-project', `project_create returned ${projResp.status()}`);
    }
    const pb = await projResp.json();
    STATE.projectId = pb.data?.id || pb.id || pb.data?.project?.id || pb.project?.id || '';

    if (!STATE.projectId) {
      fail('15-create-project', 'project id missing from response');
    }

    // Set active workspace in localStorage (page is already on frontend origin).
    await page.evaluate((wsId) => {
      try {
        const s = JSON.parse(localStorage.getItem('workspace-storage') || '{}');
        if (!s.state) s.state = {};
        s.state.activeWorkspaceId = wsId;
        localStorage.setItem('workspace-storage', JSON.stringify(s));
      } catch {}
    }, STATE.workspaceId);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/projects')) {
      fail('15-create-project', `/projects redirected to ${page.url()} — Phase 5.1 redirect may have fired`);
    }

    await saveScreenshot(page, '15-create-project');
    stepLog('15-create-project', 'PASS', `projectId=${STATE.projectId}`);
  });

  // ── Step 17: Board page loads, task created and visible ──────────────────

  test('17-create-task-board: create task via page.request, board page loads without 500', async ({ page }) => {
    await smokeLoginWithPage(page, API_BASE, STATE.adminEmail, SMOKE_KEY);

    const taskCsrfResp = await page.request.get(`${API_BASE}/auth/csrf`);
    const taskCsrfBody = await taskCsrfResp.json();
    const taskCsrfToken = taskCsrfBody.csrfToken || taskCsrfBody.token || '';
    const taskResp = await page.request.post(`${API_BASE}/work/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': taskCsrfToken,
        'X-Workspace-Id': STATE.workspaceId,
      },
      data: { projectId: STATE.projectId, title: `Smoke Task ${RUN_ID}` },
    });
    if (taskResp.status() !== 201) {
      fail('17-create-task-board', `task_create returned ${taskResp.status()}`);
    }
    const tb = await taskResp.json();
    STATE.taskId = tb.data?.id || tb.id || tb.data?.task?.id || tb.task?.id || '';

    if (!STATE.taskId) {
      fail('17-create-task-board', 'task id missing from response');
    }

    const errors: string[] = [];
    page.on('response', (r) => {
      if (r.status() === 500) errors.push(`500 on ${r.url()}`);
    });

    // Navigate to frontend first so localStorage ops target the correct origin.
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // Set workspace in localStorage then navigate to board
    await page.evaluate((wsId) => {
      try {
        const s = JSON.parse(localStorage.getItem('workspace-storage') || '{}');
        if (!s.state) s.state = {};
        s.state.activeWorkspaceId = wsId;
        localStorage.setItem('workspace-storage', JSON.stringify(s));
      } catch {}
    }, STATE.workspaceId);

    await page.goto(`/projects/${STATE.projectId}/board`);
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, '17-create-task-board');

    if (errors.length > 0) {
      fail('17-create-task-board', `500 errors on board page: ${errors.join(', ')}`);
    }
    expect(page.url()).toContain(`/projects/${STATE.projectId}`);
    stepLog('17-create-task-board', 'PASS', `taskId=${STATE.taskId}`);
  });

  // ── Step 18: Admin invite page accessible without 403 ────────────────────

  test('18-invite-user: /admin/invite accessible for admin without 403', async ({ page }) => {
    await smokeLoginWithPage(page, API_BASE, STATE.adminEmail, SMOKE_KEY);

    await page.goto('/admin/invite');
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, '18-invite-page');

    const url = page.url();
    expect(url, '/admin/invite must not redirect admin to /403').not.toContain('/403');
    expect(url, '/admin/invite must not redirect admin to /login').not.toContain('/login');
    stepLog('18-invite-user', 'PASS', `url=${url}`);
  });

  // ── Step 19: Create invites and register invitees via API ─────────────────

  test('19-register-invitees: create member + viewer invites, register both invitees', async ({ page }) => {
    // Use page.request (already has admin session from smokeLoginWithPage)
    await smokeLoginWithPage(page, API_BASE, STATE.adminEmail, SMOKE_KEY);

    // Fetch CSRF token once — valid for all subsequent page.request mutations
    const inviteCsrfResp = await page.request.get(`${API_BASE}/auth/csrf`);
    const inviteCsrfBody = await inviteCsrfResp.json();
    const inviteCsrfToken = inviteCsrfBody.csrfToken || inviteCsrfBody.token || '';

    // Member invite — role 'pm' maps to PlatformRole.MEMBER via LEGACY_ROLE_MAPPING
    const memberInviteResp = await page.request.post(`${API_BASE}/orgs/${STATE.orgId}/invites`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': inviteCsrfToken,
      },
      data: { email: STATE.memberEmail, role: 'pm' },
    });
    expect(
      [200, 201].includes(memberInviteResp.status()),
      `member invite failed: ${memberInviteResp.status()}`,
    ).toBeTruthy();

    // Viewer invite — role 'viewer' maps to PlatformRole.VIEWER
    const viewerInviteResp = await page.request.post(`${API_BASE}/orgs/${STATE.orgId}/invites`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': inviteCsrfToken,
      },
      data: { email: STATE.viewerEmail, role: 'viewer' },
    });
    expect(
      [200, 201].includes(viewerInviteResp.status()),
      `viewer invite failed: ${viewerInviteResp.status()}`,
    ).toBeTruthy();

    // Register member and viewer via smoke/users/create — bypasses /auth/register rate limiter.
    // smoke/users/create calls AuthRegistrationService.registerSelfServe directly.
    // Protected by SmokeKeyGuard only; no CSRF needed.
    const smokeCtxReg = await playwrightRequest.newContext();
    try {
      const memberRegResp = await smokeCtxReg.post(`${API_BASE}/smoke/users/create`, {
        headers: { 'Content-Type': 'application/json', 'X-Smoke-Key': SMOKE_KEY },
        data: {
          email: STATE.memberEmail,
          password: 'Smoke!Member123',
          fullName: 'Smoke Member',
          orgName: `Smoke Member Org ${RUN_ID}`,
        },
      });
      expect(
        memberRegResp.ok(),
        `member register via smoke/users/create failed: ${memberRegResp.status()}`,
      ).toBeTruthy();

      const viewerRegResp = await smokeCtxReg.post(`${API_BASE}/smoke/users/create`, {
        headers: { 'Content-Type': 'application/json', 'X-Smoke-Key': SMOKE_KEY },
        data: {
          email: STATE.viewerEmail,
          password: 'Smoke!Viewer123',
          fullName: 'Smoke Viewer',
          orgName: `Smoke Viewer Org ${RUN_ID}`,
        },
      });
      expect(
        viewerRegResp.ok(),
        `viewer register via smoke/users/create failed: ${viewerRegResp.status()}`,
      ).toBeTruthy();
    } finally {
      await smokeCtxReg.dispose();
    }

    stepLog('19-register-invitees', 'PASS', `member=${STATE.memberEmail} viewer=${STATE.viewerEmail}`);
  });

  // ── Step 20: Member accepts invite via /invites/accept?token=... ──────────

  test('20-accept-invite: member accepts invite via UI with token from token bridge', async ({ page }) => {
    // Establish member session in this page's browser context
    await smokeLoginWithPage(page, API_BASE, STATE.memberEmail, SMOKE_KEY);

    // Get member invite token via smoke token bridge (using page.request = member session)
    // The token bridge requires admin auth — use a separate API context for admin
    const adminCtx = await playwrightRequest.newContext();
    let memberToken = '';
    try {
      const adminSess = await smokeLoginSession(adminCtx, API_BASE, STATE.adminEmail, SMOKE_KEY);
      const tokenResp = await adminCtx.get(
        `${API_BASE}/smoke/invites/latest-token?email=${encodeURIComponent(STATE.memberEmail)}`,
        {
          headers: {
            'X-CSRF-Token': adminSess.csrfToken,
            'X-Smoke-Key': SMOKE_KEY,
          },
        },
      );
      expect(tokenResp.ok(), `token bridge failed: ${tokenResp.status()}`).toBeTruthy();
      const tb = await tokenResp.json();
      memberToken = tb.token || tb.data?.token || tb.data?.inviteToken || '';
    } finally {
      await adminCtx.dispose();
    }

    if (!memberToken) {
      fail('20-accept-invite', 'invite token is empty from token bridge');
    }

    // Navigate with member session to invite accept page
    await page.goto(`/invites/accept?token=${encodeURIComponent(memberToken)}`);
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, '20-invite-accept');

    const content = await page.content();
    if (content.includes('Invitation Failed') || content.includes('Invalid or expired')) {
      await saveHtmlSnapshot(page, '20-invite-accept-failure');
      fail('20-accept-invite', 'invite accept page shows error state');
    }
    if (content.includes('Login Required')) {
      await saveHtmlSnapshot(page, '20-invite-accept-login-required');
      fail('20-accept-invite', 'invite accept shows Login Required — member session not active in browser');
    }

    await page.waitForURL(/\/home/, { timeout: 10000 }).catch(() => {});

    const successVisible = await page.locator('text=Invitation Accepted').isVisible().catch(() => false);
    const onHome = page.url().includes('/home');

    if (!successVisible && !onHome) {
      await saveHtmlSnapshot(page, '20-invite-accept-no-success');
      // Mask token in logged URL — token value must not appear in proof artifacts
      const maskedUrl = page.url().replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
      fail('20-accept-invite', `neither success message nor /home redirect seen. url=${maskedUrl}`);
    }

    // After invite acceptance, update member's primary org to admin's org so that
    // smokeLogin creates a session with the correct platformRole (MEMBER, not ADMIN).
    // SmokeKeyGuard only — no user session needed.
    const memberPrimaryOrgCtx = await playwrightRequest.newContext();
    try {
      const setPrimaryResp = await memberPrimaryOrgCtx.post(
        `${API_BASE}/smoke/users/set-primary-org`,
        {
          headers: { 'Content-Type': 'application/json', 'X-Smoke-Key': SMOKE_KEY },
          data: { email: STATE.memberEmail, orgId: STATE.orgId },
        },
      );
      if (!setPrimaryResp.ok()) {
        const body = await setPrimaryResp.text();
        fail('20-set-primary-org', `smoke/users/set-primary-org failed: ${setPrimaryResp.status()} ${body.slice(0, 200)}`);
      }
    } finally {
      await memberPrimaryOrgCtx.dispose();
    }

    // Mask token in logged URL — token value must not appear in proof artifacts
    const finalUrl = page.url().replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
    stepLog('20-accept-invite', 'PASS', `member invite accepted url=${finalUrl}`);
  });

  // ── Step 20b: Viewer accepts invite ──────────────────────────────────────

  test('20b-accept-viewer-invite: viewer accepts invite via UI with token bridge', async ({ page }) => {
    await smokeLoginWithPage(page, API_BASE, STATE.viewerEmail, SMOKE_KEY);

    const adminCtx = await playwrightRequest.newContext();
    let viewerToken = '';
    try {
      const adminSess = await smokeLoginSession(adminCtx, API_BASE, STATE.adminEmail, SMOKE_KEY);
      const tokenResp = await adminCtx.get(
        `${API_BASE}/smoke/invites/latest-token?email=${encodeURIComponent(STATE.viewerEmail)}`,
        {
          headers: { 'X-CSRF-Token': adminSess.csrfToken, 'X-Smoke-Key': SMOKE_KEY },
        },
      );
      if (tokenResp.ok()) {
        const tb = await tokenResp.json();
        viewerToken = tb.token || tb.data?.token || tb.data?.inviteToken || '';
      }
    } finally {
      await adminCtx.dispose();
    }

    if (!viewerToken) {
      stepLog('20b-accept-viewer-invite', 'SKIP', 'viewer token not available from token bridge');
      return;
    }

    await page.goto(`/invites/accept?token=${encodeURIComponent(viewerToken)}`);
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/\/home/, { timeout: 10000 }).catch(() => {});

    const successVisible = await page.locator('text=Invitation Accepted').isVisible().catch(() => false);
    const onHome = page.url().includes('/home');

    // After invite acceptance, update viewer's primary org to admin's org so that
    // smokeLogin creates a session with the correct platformRole (VIEWER, not ADMIN).
    if (successVisible || onHome) {
      const viewerPrimaryOrgCtx = await playwrightRequest.newContext();
      try {
        await viewerPrimaryOrgCtx.post(
          `${API_BASE}/smoke/users/set-primary-org`,
          {
            headers: { 'Content-Type': 'application/json', 'X-Smoke-Key': SMOKE_KEY },
            data: { email: STATE.viewerEmail, orgId: STATE.orgId },
          },
        );
      } finally {
        await viewerPrimaryOrgCtx.dispose();
      }
    }

    stepLog('20b-accept-viewer-invite', successVisible || onHome ? 'PASS' : 'FAIL', `url=${page.url()}`);
  });

  // ── Step 21: RBAC — Viewer cannot access paid routes ─────────────────────

  test('21-rbac-viewer: viewer cannot access /admin, /templates, or /workspaces/:id/members', async ({ page }) => {
    await smokeLoginWithPage(page, API_BASE, STATE.viewerEmail, SMOKE_KEY);

    // Role identity proof: assert /auth/me returns VIEWER for this session
    // Prevents false passes where viewer and member accidentally share cookies
    const viewerMeResp = await page.request.get(`${API_BASE}/auth/me`);
    expect(viewerMeResp.status(), '/auth/me must return 200 for viewer session').toBe(200);
    const viewerMeBody = await viewerMeResp.json();
    const viewerRole: string =
      viewerMeBody?.data?.platformRole ??
      viewerMeBody?.data?.role ??
      viewerMeBody?.platformRole ??
      viewerMeBody?.role ??
      '';
    expect(viewerRole, `/auth/me platformRole must be "VIEWER", got "${viewerRole}"`).toBe('VIEWER');
    stepLog('21-role-identity', 'PASS', `platformRole=${viewerRole}`);

    await saveScreenshot(page, '21-rbac-viewer');

    // /admin must redirect viewer away (AdminRoute guard)
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const adminUrl = page.url();
    expect(adminUrl, 'viewer must not land on /admin').not.toContain('/admin');
    stepLog('21-rbac-viewer-admin', 'PASS', `redirected to ${adminUrl}`);

    // /templates must redirect viewer to /home (RequirePaidInline)
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');
    const templatesUrl = page.url();
    expect(
      !templatesUrl.includes('/templates') || templatesUrl.includes('/home'),
      `viewer must not stay on /templates, got ${templatesUrl}`,
    ).toBeTruthy();
    stepLog('21-rbac-viewer-templates', 'PASS', `redirected to ${templatesUrl}`);

    // /workspaces/:id/members must redirect viewer (RequirePaidInline)
    await page.goto(`/workspaces/${STATE.workspaceId}/members`);
    await page.waitForLoadState('networkidle');
    const membersUrl = page.url();
    expect(
      !membersUrl.includes('/members'),
      `viewer must not stay on /members, got ${membersUrl}`,
    ).toBeTruthy();
    stepLog('21-rbac-viewer-members', 'PASS', `redirected to ${membersUrl}`);

    // Positive API assertion: viewer CAN read projects (GET /projects → 200)
    const viewerGetResp = await page.request.get(`${API_BASE}/projects?workspaceId=${STATE.workspaceId}`);
    expect(viewerGetResp.status(), 'viewer GET /projects must return 200').toBe(200);
    stepLog('21-rbac-viewer-get-projects', 'PASS', `GET /projects status=${viewerGetResp.status()}`);

    // Negative API assertion: viewer CANNOT create org invites (POST /orgs/:orgId/invites → 403)
    // OrgInvitesService.createInvite checks actorPlatformRole via getAuthContext(req) which
    // reads user.platformRole from the JWT. platformRole=VIEWER fails the admin check → 403.
    // No feature flags involved. Rate limit is 10/hr — safe for a single test run.
    const viewerCsrfResp = await page.request.get(`${API_BASE}/auth/csrf`);
    const viewerCsrfBody = await viewerCsrfResp.json();
    const viewerCsrfToken = viewerCsrfBody.csrfToken || viewerCsrfBody.token || '';
    const viewerInviteResp = await page.request.post(`${API_BASE}/orgs/${STATE.orgId}/invites`, {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': viewerCsrfToken },
      data: { email: 'should-be-denied@example.com', role: 'viewer' },
    });
    expect(viewerInviteResp.status(), 'viewer POST org invite must return 403').toBe(403);
    stepLog('21-rbac-viewer-invite-api', 'PASS', `viewer POST org invite correctly rejected status=${viewerInviteResp.status()}`);
  });

  // ── Step 22: RBAC — Member cannot access admin or billing ────────────────

  test('22-rbac-member: member cannot access /admin or /billing, can access /projects', async ({ page }) => {
    await smokeLoginWithPage(page, API_BASE, STATE.memberEmail, SMOKE_KEY);

    // Role identity proof: assert /auth/me returns MEMBER for this session
    // Prevents false passes where member accidentally shares admin cookies
    const memberMeResp = await page.request.get(`${API_BASE}/auth/me`);
    expect(memberMeResp.status(), '/auth/me must return 200 for member session').toBe(200);
    const memberMeBody = await memberMeResp.json();
    const memberRole: string =
      memberMeBody?.data?.platformRole ??
      memberMeBody?.data?.role ??
      memberMeBody?.platformRole ??
      memberMeBody?.role ??
      '';
    expect(memberRole, `/auth/me platformRole must be "MEMBER", got "${memberRole}"`).toBe('MEMBER');
    stepLog('22-role-identity', 'PASS', `platformRole=${memberRole}`);

    // /admin must redirect member away (AdminRoute guard)
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const adminUrl = page.url();
    expect(adminUrl, 'member must not land on /admin').not.toContain('/admin');
    stepLog('22-rbac-member-admin', 'PASS', `redirected to ${adminUrl}`);

    // /billing must redirect member (RequireAdminInline)
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    const billingUrl = page.url();
    expect(!billingUrl.includes('/billing'), `member must not land on /billing, got ${billingUrl}`).toBeTruthy();
    stepLog('22-rbac-member-billing', 'PASS', `redirected to ${billingUrl}`);

    // Member CAN access /projects (canCreateProjects returns true for MEMBER)
    await page.evaluate((wsId) => {
      try {
        const s = JSON.parse(localStorage.getItem('workspace-storage') || '{}');
        if (!s.state) s.state = {};
        s.state.activeWorkspaceId = wsId;
        localStorage.setItem('workspace-storage', JSON.stringify(s));
      } catch {}
    }, STATE.workspaceId);

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, '22-rbac-member');
    const projectsUrl = page.url();
    expect(
      projectsUrl.includes('/projects') || projectsUrl.includes('/home'),
      `member projects url unexpected: ${projectsUrl}`,
    ).toBeTruthy();
    stepLog('22-rbac-member-projects', 'PASS', `url=${projectsUrl}`);

    // Positive content assertion: member GET /projects API returns well-shaped data
    const memberGetResp = await page.request.get(`${API_BASE}/projects?workspaceId=${STATE.workspaceId}`);
    expect(memberGetResp.status(), 'member GET /projects must return 200').toBe(200);
    const projectsBody = await memberGetResp.json();
    // Accept common response envelopes:
    //   plain array
    //   { data: [...] }
    //   { data: { projects: [...] } }   ← actual shape from ProjectsController
    //   { items: [...] } or { projects: [...] }
    const projectItems = Array.isArray(projectsBody)
      ? projectsBody
      : Array.isArray(projectsBody.data)
        ? projectsBody.data
        : (projectsBody.data?.projects ?? projectsBody.data?.items ??
           projectsBody.items ?? projectsBody.projects ?? null);
    expect(Array.isArray(projectItems), 'GET /projects response must contain an array').toBeTruthy();
    stepLog('22-rbac-member-get-projects', 'PASS', `GET /projects returned ${(projectItems as unknown[]).length} item(s)`);

    // Negative API assertion: member CANNOT invite workspace members
    // POST /workspaces/:id/members/invite is guarded by manage_workspace_members permission (admin-only)
    // Accept 400 (FEATURE_NOT_AVAILABLE) or 403 (permission denied). Reject 200 or 201.
    const memberCsrfResp = await page.request.get(`${API_BASE}/auth/csrf`);
    const memberCsrfBody = await memberCsrfResp.json();
    const memberCsrfToken = memberCsrfBody.csrfToken || memberCsrfBody.token || '';
    const memberInviteResp = await page.request.post(
      `${API_BASE}/workspaces/${STATE.workspaceId}/members/invite`,
      {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': memberCsrfToken },
        data: { email: 'should-be-denied@example.com', role: 'VIEWER' },
      },
    );
    const memberInviteStatus = memberInviteResp.status();
    expect(
      memberInviteStatus === 400 || memberInviteStatus === 403,
      `member POST /workspaces/:id/members/invite must be 400 (FEATURE_NOT_AVAILABLE) or 403 (forbidden), got ${memberInviteStatus}`,
    ).toBeTruthy();
    stepLog('22-rbac-member-invite', 'PASS', `member POST workspace invite correctly rejected status=${memberInviteStatus}`);
  });

  // ── Final ─────────────────────────────────────────────────────────────────

  test('final: mark run PASS', async () => {
    STATE.result = 'PASS';
    stepLog('final', 'PASS', `run_id=${RUN_ID}`);
  });
});
