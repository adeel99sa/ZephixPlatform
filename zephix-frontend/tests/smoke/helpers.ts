/**
 * Shared helpers for Zephix E2E smoke tests.
 * Handles login, workspace selection, and common navigation.
 */
import { type Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ─── Seed data ─────────────────────────────────────────────────────────────

interface SeedIds {
  timestamp: string;
  baseUrl: string;
  auth: { email: string; password: string };
  userId: string;
  organizationId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  templateAId: string;
  templateBId: string;
  projectA: {
    id: string;
    name: string;
    phases: string;
    tasks: string;
    risks: string;
    allocations: string;
    budget: number;
    actualCost: number;
  };
  projectB: {
    id: string;
    name: string;
    phases: string;
    tasks: string;
    risks: string;
    allocations: string;
    budget: number;
    actualCost: number;
  };
  firstTaskA: string;
  firstTaskB: string;
  firstPhaseA: string;
  firstPhaseB: string;
  firstAllocA: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IDS_PATH = path.resolve(__dirname, '../../../scripts/smoke/e2e-ids.json');

let _ids: SeedIds | null = null;

export function getSeedIds(): SeedIds {
  if (!_ids) {
    if (!fs.existsSync(IDS_PATH)) {
      throw new Error(
        `Seed IDs not found at ${IDS_PATH}. Run scripts/smoke/e2e-seed.sh first.`
      );
    }
    _ids = JSON.parse(fs.readFileSync(IDS_PATH, 'utf-8'));
  }
  return _ids!;
}

// ─── Auth helpers ──────────────────────────────────────────────────────────

/**
 * Login via the UI login page.
 * Waits for redirect to home/hub after login.
 */
export async function login(page: Page, email?: string, password?: string) {
  const ids = getSeedIds();
  const e = email ?? ids.auth.email;
  const p = password ?? ids.auth.password;

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill credentials using attribute selectors (form uses <div> labels, not <label>)
  // Email input has no type="email" — uses autocomplete="email" instead
  const emailInput = page.locator('input[autocomplete="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(e);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(p);

  // Submit — button text is "Sign In Securely"
  const submitBtn = page.locator('button[type="submit"]').first();

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.status() < 400,
      { timeout: 15000 }
    ).catch(() => null),
    submitBtn.click(),
  ]);

  // Wait for navigation away from login
  await page.waitForURL(/\/(home|hub|onboarding|select-workspace|dashboards|projects)/, {
    timeout: 15000,
  }).catch(() => {
    // May already be on a valid page
  });
}

/**
 * Select workspace by setting it in localStorage (fastest approach).
 * Falls back to UI selection if needed.
 */
export async function selectWorkspace(page: Page, workspaceId?: string) {
  const ids = getSeedIds();
  const wsId = workspaceId ?? ids.workspaceId;

  // Set workspace in Zustand persisted storage
  await page.evaluate((id) => {
    const existing = localStorage.getItem('workspace-storage');
    let state = { state: { activeWorkspaceId: id }, version: 0 };
    if (existing) {
      try {
        state = JSON.parse(existing);
        state.state = state.state || {};
        state.state.activeWorkspaceId = id;
      } catch {
        // Use default
      }
    }
    localStorage.setItem('workspace-storage', JSON.stringify(state));
  }, wsId);

  // Reload to pick up workspace
  await page.reload({ waitUntil: 'networkidle' });
}

/**
 * Full login + workspace selection flow.
 */
export async function loginAndSelectWorkspace(page: Page) {
  await login(page);
  await selectWorkspace(page);
}

// ─── Navigation helpers ────────────────────────────────────────────────────

export async function navigateToProjects(page: Page) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
}

export async function navigateToProject(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToProjectPlan(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/plan`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToProjectTasks(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/tasks`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToProjectRisks(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/risks`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToProjectResources(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/resources`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToProjectBoard(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/board`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToProjectGantt(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/gantt`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToProjectSprints(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/sprints`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToTemplates(page: Page) {
  await page.goto('/templates');
  await page.waitForLoadState('networkidle');
}

export async function navigateToDashboards(page: Page) {
  await page.goto('/dashboards');
  await page.waitForLoadState('networkidle');
}

export async function navigateToWorkspaceMembers(page: Page, workspaceId: string) {
  await page.goto(`/workspaces/${workspaceId}/members`);
  await page.waitForLoadState('networkidle');
}

// ─── Assertion helpers ─────────────────────────────────────────────────────

/**
 * Assert no 403 error toast or redirect appeared.
 */
export async function assertNo403(page: Page) {
  // Check we're not on the forbidden page
  const url = page.url();
  expect(url).not.toContain('/403');

  // Check no visible 403 error message
  const forbidden = page.locator('text=403').first();
  const visible = await forbidden.isVisible().catch(() => false);
  if (visible) {
    // Could be a legitimate "403" in content; check for error context
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /403|forbidden/i });
    expect(await errorBanner.count()).toBe(0);
  }
}

/**
 * Assert no route bounce (page didn't redirect unexpectedly).
 */
export async function assertNoRouteBounce(page: Page, expectedPathSubstring: string) {
  const url = page.url();
  expect(url).toContain(expectedPathSubstring);
}

/**
 * Wait for API response and check status.
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus = 200,
  timeout = 10000
) {
  const response = await page.waitForResponse(
    (r) => {
      const matches = typeof urlPattern === 'string'
        ? r.url().includes(urlPattern)
        : urlPattern.test(r.url());
      return matches && r.status() === expectedStatus;
    },
    { timeout }
  );
  return response;
}
