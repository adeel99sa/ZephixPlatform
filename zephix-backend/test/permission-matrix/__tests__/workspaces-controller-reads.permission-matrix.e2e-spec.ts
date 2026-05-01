/**
 * AD-027 batch 1a-i — workspace read endpoints permission matrix.
 *
 * Suite A: ZEPHIX_WS_MEMBERSHIP_V1=1 before app bootstrap (canonical strict mode).
 * Suite B: flag unset before separate bootstrap (permissive / production-compatible).
 *
 * Requires DATABASE_URL (skipped when unset). Uses two-bootstrap pattern because
 * ConfigModule reads env at startup (runtime process.env toggles are unreliable).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import {
  buildPermissionMatrixFixtures,
  runMatrixTest,
  createTestRequest,
  execRequest,
  expectAccessible,
  expectForbidden,
  expectUnauthenticated,
  type PermissionMatrixFixtures,
} from '../index';

const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

const RISK_QUERY: Record<string, string> = {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  limit: '10',
};

function listIds(res: { body?: unknown }): string[] {
  const body = res.body as { data?: Array<{ id: string }> } | undefined;
  return (body?.data ?? []).map((w) => w.id);
}

async function bootstrapApp(): Promise<{
  app: INestApplication;
  fixtures: PermissionMatrixFixtures;
}> {
  process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = 'true';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  await app.init();

  const fixtures = await buildPermissionMatrixFixtures(app);
  return { app, fixtures };
}

describeOrSkip('AD-027 1a-i — workspace reads (Suite A: ZEPHIX_WS_MEMBERSHIP_V1=1)', () => {
  jest.setTimeout(180000);

  let app: INestApplication;
  let fixtures: PermissionMatrixFixtures;
  let savedWsFlag: string | undefined;
  let savedResourceAi: string | undefined;

  beforeAll(async () => {
    savedWsFlag = process.env.ZEPHIX_WS_MEMBERSHIP_V1;
    savedResourceAi = process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;
    process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';
    const boot = await bootstrapApp();
    app = boot.app;
    fixtures = boot.fixtures;
  });

  afterAll(async () => {
    if (savedWsFlag === undefined) delete process.env.ZEPHIX_WS_MEMBERSHIP_V1;
    else process.env.ZEPHIX_WS_MEMBERSHIP_V1 = savedWsFlag;
    if (savedResourceAi === undefined) {
      delete process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;
    } else {
      process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = savedResourceAi;
    }
    try {
      await app?.close();
    } catch {
      /* ignore */
    }
  });

  const getFixtures = () => fixtures;

  runMatrixTest(
    'GET /api/workspaces/resolve/:slug',
    'GET',
    '/api/workspaces/resolve/:slug',
    {
      app,
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
      app,
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
      app,
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
      app,
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
      app,
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
      app,
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
      app,
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
      app,
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
      app,
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
      app,
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
      app,
      getFixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_viewer',
      targetWorkspace: 'workspaceA1',
      query: RISK_QUERY,
    },
  );

  describe('GET /api/workspaces (org-scoped list, #4)', () => {
    it('allows org member with workspace access (ownerA1) → 200 and includes workspaceA1', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', {
          app,
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
          app,
          accessToken: f.tokens.memberNoWorkspace,
        }),
      );
      expectAccessible(res);
      expect(listIds(res)).toEqual([]);
    });

    it('unauthenticated → 401', async () => {
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', { app }),
      );
      expectUnauthenticated(res);
    });

    it('user in org B does not see org A workspace ids', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', {
          app,
          accessToken: f.tokens.ownerB1,
        }),
      );
      expectAccessible(res);
      const ids = listIds(res);
      expect(ids).not.toContain(f.workspaceA1.id);
      expect(ids).toContain(f.workspaceB1.id);
    });
  });
});

describeOrSkip(
  'AD-027 1a-i — flag parity (Suite B: ZEPHIX_WS_MEMBERSHIP_V1 unset)',
  () => {
    jest.setTimeout(180000);

    let app: INestApplication;
    let fixtures: PermissionMatrixFixtures;
    let savedWsFlag: string | undefined;
    let savedResourceAi: string | undefined;

    beforeAll(async () => {
      savedWsFlag = process.env.ZEPHIX_WS_MEMBERSHIP_V1;
      savedResourceAi = process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;
      delete process.env.ZEPHIX_WS_MEMBERSHIP_V1;
      const boot = await bootstrapApp();
      app = boot.app;
      fixtures = boot.fixtures;
    });

    afterAll(async () => {
      if (savedWsFlag === undefined) delete process.env.ZEPHIX_WS_MEMBERSHIP_V1;
      else process.env.ZEPHIX_WS_MEMBERSHIP_V1 = savedWsFlag;
      if (savedResourceAi === undefined) {
        delete process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1;
      } else {
        process.env.ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 = savedResourceAi;
      }
      try {
        await app?.close();
      } catch {
        /* ignore */
      }
    });

    const getFixtures = () => fixtures;

    it('memberNoWorkspace GET /api/workspaces/:id → 200 (permissive)', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', `/api/workspaces/${f.workspaceA1.id}`, {
          app,
          accessToken: f.tokens.memberNoWorkspace,
        }),
      );
      expectAccessible(res);
    });

    it('memberNoWorkspace GET /api/workspaces/resolve/:slug → 200', async () => {
      const f = getFixtures();
      const path = `/api/workspaces/resolve/${encodeURIComponent(f.workspaceA1.slug)}`;
      const res = await execRequest(
        createTestRequest('GET', path, {
          app,
          accessToken: f.tokens.memberNoWorkspace,
        }),
      );
      expectAccessible(res);
    });

    it('memberNoWorkspace GET /api/workspaces/slug/:slug/home → 200', async () => {
      const f = getFixtures();
      const path = `/api/workspaces/slug/${encodeURIComponent(f.workspaceA1.slug)}/home`;
      const res = await execRequest(
        createTestRequest('GET', path, {
          app,
          accessToken: f.tokens.memberNoWorkspace,
        }),
      );
      expectAccessible(res);
    });

    it('GET /api/workspaces memberNoWorkspace sees org workspaces (non-empty)', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', {
          app,
          accessToken: f.tokens.memberNoWorkspace,
        }),
      );
      expectAccessible(res);
      const ids = listIds(res);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain(f.workspaceA1.id);
    });

    it('ownerB1 still isolated from org A workspace ids on GET /api/workspaces', async () => {
      const f = getFixtures();
      const res = await execRequest(
        createTestRequest('GET', '/api/workspaces', {
          app,
          accessToken: f.tokens.ownerB1,
        }),
      );
      expectAccessible(res);
      expect(listIds(res)).not.toContain(f.workspaceA1.id);
    });
  },
);
