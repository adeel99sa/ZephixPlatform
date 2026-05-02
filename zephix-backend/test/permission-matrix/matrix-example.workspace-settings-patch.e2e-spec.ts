/**
 * Canonical AD-027 example: matrix tests against a real workspace-scoped endpoint
 * that requires `workspace_owner` via `RequireWorkspacePermissionGuard`
 * (`edit_workspace_settings`).
 *
 * Requires DATABASE_URL (same as other E2E-style tests). Skipped when unset.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import {
  buildPermissionMatrixFixtures,
  runMatrixTest,
  type PermissionMatrixFixtures,
} from './index';

/** Requires a reachable DB (use `npm run test:permission-matrix:example` when DATABASE_URL is set). */
const describeOrSkip = process.env.DATABASE_URL ? describe : describe.skip;

describeOrSkip('AD-027 matrix example — PATCH /api/workspaces/:id/settings', () => {
  jest.setTimeout(120000);

  let app: INestApplication;
  let fixtures: PermissionMatrixFixtures;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    fixtures = await buildPermissionMatrixFixtures(app);
  });

  afterAll(async () => {
    try {
      await app?.close();
    } catch {
      /* ignore */
    }
  });

  runMatrixTest(
    'PATCH /api/workspaces/:id/settings (workspace_owner, edit_workspace_settings)',
    'PATCH',
    '/api/workspaces/:id/settings',
    {
      getApp: () => app,
      getFixtures: () => fixtures,
      scope: 'workspace',
      requiredWorkspaceRole: 'workspace_owner',
      targetWorkspace: 'workspaceA1',
      action: 'config',
      body: { name: `matrix-example-${Date.now()}` },
    },
  );
});
