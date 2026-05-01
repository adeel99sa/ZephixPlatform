/**
 * AD-027 batch 1a-i — Suite B only (one AppModule bootstrap per file).
 * ZEPHIX_WS_MEMBERSHIP_V1 unset before bootstrap (permissive / parity).
 */
import { INestApplication } from '@nestjs/common';
import {
  createTestRequest,
  execRequest,
  expectAccessible,
  type PermissionMatrixFixtures,
} from '../index';
import {
  bootstrapWorkspaceReadsApp,
  closeWorkspaceReadsApp,
} from './workspaces-controller-reads.bootstrap';
import { listIds } from './workspaces-controller-reads.register-matrix';

const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

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
      const boot = await bootstrapWorkspaceReadsApp();
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
      await closeWorkspaceReadsApp(app);
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
