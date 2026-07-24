/**
 * ROUTE-SHADOW-2 — regression: two previously-shadowed routes now resolve.
 *
 * Real HTTP → real controllers → real Postgres. Each route was captured by an
 * earlier parameterized route and 404'd silently; after the reorder each must
 * reach its own handler.
 *
 *   GET  /resources/heatmap/timeline           (was shadowed by :id/timeline)
 *   DELETE /workspaces/:id/invite-link/active   (was shadowed by :linkId)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
}
if (
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.toLowerCase().includes('production')
) {
  throw new Error('❌ DATABASE_URL appears to be production. Use test DB only.');
}

import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { WorkspaceMembershipFeatureGuard } from './modules/workspaces/guards/feature-flag.guard';
import { RequireWorkspacePermissionGuard } from './modules/workspaces/guards/require-workspace-permission.guard';

jest.setTimeout(120000);

const authStub: CanActivate = {
  canActivate: (ctx: ExecutionContext): boolean => {
    const req = ctx.switchToHttp().getRequest();
    const uid = req.headers['x-test-user-id'] as string | undefined;
    const org = req.headers['x-test-org-id'] as string | undefined;
    if (uid) {
      req.user = {
        id: uid,
        userId: uid,
        sub: uid,
        email: 'tester@zephix.dev',
        organizationId: org,
        platformRole: 'ADMIN',
        role: 'admin',
      };
    }
    return true;
  },
};

describe('ROUTE-SHADOW-2 regression — previously-shadowed routes resolve', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let ds: DataSource;

  const sfx = randomUUID().slice(0, 8);
  const org = randomUUID();
  const user = randomUUID();
  const ws = randomUUID();

  const asActor = (r: request.Test) =>
    r
      .set('x-test-user-id', user)
      .set('x-test-org-id', org)
      .set('Cookie', 'XSRF-TOKEN=rs2csrf')
      .set('X-CSRF-Token', 'rs2csrf');

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authStub)
      .overrideGuard(WorkspaceMembershipFeatureGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequireWorkspacePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    ds = moduleRef.get<DataSource>(DataSource);
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    await ds.query(
      `INSERT INTO organizations (id, name, slug, plan_code) VALUES ($1,$2,$3,'free')`,
      [org, `O ${sfx}`, `rs2-${sfx}`],
    );
    await ds.query(
      `INSERT INTO users (id, email, password) VALUES ($1,$2,'x')`,
      [user, `u-${sfx}@rs2.dev`],
    );
    await ds.query(
      `INSERT INTO workspaces (id, organization_id, name, created_by) VALUES ($1,$2,$3,$4)`,
      [ws, org, `WS ${sfx}`, user],
    );
  });

  afterAll(async () => {
    await ds
      .query(`DELETE FROM workspaces WHERE id = $1`, [ws])
      .catch(() => undefined);
    await ds
      .query(`DELETE FROM users WHERE id = $1`, [user])
      .catch(() => undefined);
    await ds
      .query(`DELETE FROM organizations WHERE id = $1`, [org])
      .catch(() => undefined);
    if (app) await app.close();
  });

  it('GET /resources/heatmap/timeline reaches its own handler (not shadowed to :id/timeline)', async () => {
    const res = await asActor(
      request(app.getHttpServer()).get(
        '/api/resources/heatmap/timeline?fromDate=2026-01-01&toDate=2026-12-31',
      ),
    );
    // The DEFINITIVE un-shadow proof for this route is the static route-shadow
    // guard (route-shadow.guard — empty allowlist, so it fails if this route is
    // re-shadowed). An HTTP 200 is not observable in the test env: getHeatmap
    // uses raw createQueryBuilder, which the dev/test tenant guardrail rejects
    // (prod: guardrail off → 200) — out of scope for ROUTE-SHADOW-2. We assert
    // the request reaches a controller handler rather than a router-level 404.
    expect(res.status).not.toBe(404);
  });

  it('DELETE /workspaces/:id/invite-link/active reaches the active-revoke handler (200 ok, not the shadowed :linkId 404)', async () => {
    const res = await asActor(
      request(app.getHttpServer()).delete(
        `/api/workspaces/${ws}/invite-link/active`,
      ),
    );
    // revokeActiveInviteLink is idempotent → { ok: true } even with no active
    // link. The shadow would have routed to revokeInviteLink(linkId='active'),
    // which does not return a clean 200 ok.
    expect(res.status).toBe(200);
    const body = res.body?.data ?? res.body;
    expect(body?.ok).toBe(true);
  });
});
