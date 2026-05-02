import type { INestApplication } from '@nestjs/common';
import {
  createTestRequest,
  execRequest,
  expectAccessible,
  expectForbidden,
  expectUnauthenticated,
  runMatrixTest,
  type PermissionMatrixFixtures,
} from '../index';

export const RISK_QUERY: Record<string, string> = {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  limit: '10',
};

export function listIds(res: { body?: unknown }): string[] {
  const body = res.body as { data?: Array<{ id: string }> } | undefined;
  return (body?.data ?? []).map((w) => w.id);
}

/** Suite A / B shared: generated matrix for workspace read routes (AD-027 1a-i). */
export function registerWorkspaceReadMatrixTests(
  getApp: () => INestApplication,
  getFixtures: () => PermissionMatrixFixtures,
): void {
  runMatrixTest(
    'GET /api/workspaces/resolve/:slug',
    'GET',
    '/api/workspaces/resolve/:slug',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
      extraPathParams: (f) => ({ slug: f.workspaceA1.slug }),
      buildCrossTenantPath: (f) =>
        `/api/workspaces/resolve/${encodeURIComponent(f.workspaceA1.slug)}`,
    },
  );

  runMatrixTest(
    'GET /api/workspaces/slug/:slug',
    'GET',
    '/api/workspaces/slug/:slug',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
      extraPathParams: (f) => ({ slug: f.workspaceA1.slug }),
      buildCrossTenantPath: (f) =>
        `/api/workspaces/slug/${encodeURIComponent(f.workspaceA1.slug)}`,
    },
  );

  runMatrixTest(
    'GET /api/workspaces/slug/:slug/home',
    'GET',
    '/api/workspaces/slug/:slug/home',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
      extraPathParams: (f) => ({ slug: f.workspaceA1.slug }),
      forbiddenStatus: 404,
      crossTenantExpectedStatus: 404,
      buildCrossTenantPath: (f) =>
        `/api/workspaces/slug/${encodeURIComponent(f.workspaceA1.slug)}/home`,
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:id',
    'GET',
    '/api/workspaces/:id',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:id/settings (view_workspace)',
    'GET',
    '/api/workspaces/:id/settings',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:id/dashboard-config',
    'GET',
    '/api/workspaces/:id/dashboard-config',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:workspaceId/role',
    'GET',
    '/api/workspaces/:workspaceId/role',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:workspaceId/summary',
    'GET',
    '/api/workspaces/:workspaceId/summary',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:id/members',
    'GET',
    '/api/workspaces/:id/members',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:id/invite-link',
    'GET',
    '/api/workspaces/:id/invite-link',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
    },
  );

  runMatrixTest(
    'GET /api/workspaces/:id/resource-risk-summary',
    'GET',
    '/api/workspaces/:id/resource-risk-summary',
    {
      getApp,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
      query: RISK_QUERY,
    },
  );
}

/** Suite A only: org-scoped list (#4). */
export function registerOrgListTests(
  getApp: () => INestApplication,
  getFixtures: () => PermissionMatrixFixtures,
): void {
  describe('GET /api/workspaces (org-scoped list, #4)', () => {
    it('allows org member with workspace access (ownerA1) → 200 and includes workspaceA1', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', {
          app: getApp(),
          accessToken: f.tokens.ownerA1,
        }),
      );
      expectAccessible(res);
      const ids = listIds(res);
      expect(ids).toContain(f.workspaceA1.id);
    });

    it('member with no workspace membership → 200 with empty list (flag ON)', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', {
          app: getApp(),
          accessToken: f.tokens.memberNoWorkspace,
        }),
      );
      expectAccessible(res);
      expect(listIds(res)).toEqual([]);
    });

    it('unauthenticated → 401', async () => {
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', { app: getApp() }),
      );
      expectUnauthenticated(res);
    });

    it('user in org B does not see org A workspace ids', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', {
          app: getApp(),
          accessToken: f.tokens.ownerB1,
        }),
      );
      expectAccessible(res);
      const ids = listIds(res);
      expect(ids).not.toContain(f.workspaceA1.id);
      expect(ids).toContain(f.workspaceB1.id);
    });
  });
}
