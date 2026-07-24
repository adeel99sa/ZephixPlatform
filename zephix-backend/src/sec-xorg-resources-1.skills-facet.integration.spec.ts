/**
 * SEC-XORG-RESOURCES-1 — getSkillsFacet workspace scoping (integration)
 *
 * Real HTTP (supertest) → real controller/service → real Postgres. ONE org,
 * TWO workspaces — an intra-org permissions test, a different fixture shape
 * from the cross-tenant (#501/#502) specs.
 *
 * getSkillsFacet computed accessibleWorkspaceIds and discarded them. Fixed to
 * apply them with the #501 null semantics:
 *   null  (platform admin / membership flag off) → no workspace filter
 *   [ids]                                          → filter to those + org-level
 *   []    (member of no workspace)                 → org-level resources ONLY
 * Org-level resources (workspace_id NULL) are account-tier: visible to every
 * org member (ruled).
 *
 * Only the JWT guard is overridden (injects req.user verbatim). The workspace-
 * membership flag is enabled so getAccessibleWorkspaceIds actually filters;
 * membership is read from the real workspace_members table.
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
if (process.env.NODE_ENV !== 'test') {
  throw new Error(`❌ NODE_ENV must be 'test', got: ${process.env.NODE_ENV}`);
}
// getAccessibleWorkspaceIds only filters when the membership flag is on.
process.env.ZEPHIX_WS_MEMBERSHIP_V1 = '1';

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

jest.setTimeout(120000);

const authStub: CanActivate = {
  canActivate: (ctx: ExecutionContext): boolean => {
    const req = ctx.switchToHttp().getRequest();
    const uid = req.headers['x-test-user-id'] as string | undefined;
    const org = req.headers['x-test-org-id'] as string | undefined;
    const prole = (req.headers['x-test-platform-role'] as string) || 'MEMBER';
    if (uid) {
      req.user = {
        id: uid,
        userId: uid,
        sub: uid,
        email: 'tester@zephix.dev',
        organizationId: org,
        platformRole: prole,
        role: prole ? prole.toLowerCase() : undefined,
      };
    }
    return true;
  },
};

describe('SEC-XORG-RESOURCES-1 getSkillsFacet workspace scoping (integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let ds: DataSource;

  const sfx = randomUUID().slice(0, 8);
  const org = randomUUID();
  const wsA = randomUUID();
  const wsB = randomUUID();
  const adminU = randomUUID();
  const memberA = randomUUID(); // member of wsA only
  const memberNone = randomUUID(); // member of no workspace
  const resA = randomUUID();
  const resB = randomUUID();
  const resOrg = randomUUID();

  const SKILL_A = `skill-a-${sfx}`;
  const SKILL_B = `skill-b-${sfx}`;
  const SKILL_ORG = `skill-org-${sfx}`;

  const asActor = (
    r: request.Test,
    actor: { user: string; role?: string },
  ) =>
    r
      .set('x-test-user-id', actor.user)
      .set('x-test-org-id', org)
      .set('x-test-platform-role', actor.role ?? 'MEMBER')
      .set('Cookie', 'XSRF-TOKEN=sxrescsrf')
      .set('X-CSRF-Token', 'sxrescsrf');

  const skillNames = (res: request.Response): string[] => {
    const body = res.body;
    const list = Array.isArray(body) ? body : body?.data ?? body?.skills ?? [];
    return (list as Array<{ name: string }>).map((s) => s.name);
  };

  const getSkills = (actor: { user: string; role?: string }) =>
    asActor(request(app.getHttpServer()).get('/api/resources/skills'), actor);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authStub)
      .compile();

    ds = moduleRef.get<DataSource>(DataSource);
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await seed();
  });

  afterAll(async () => {
    await cleanup().catch(() => undefined);
    if (app) await app.close();
  });

  async function seed(): Promise<void> {
    await ds.query(
      `INSERT INTO organizations (id, name, slug, plan_code) VALUES ($1,$2,$3,'free')`,
      [org, `O ${sfx}`, `sxres-${sfx}`],
    );
    await ds.query(
      `INSERT INTO users (id, email, password) VALUES ($1,$2,'x'),($3,$4,'x'),($5,$6,'x')`,
      [
        adminU, `admin-${sfx}@sxres.dev`,
        memberA, `memberA-${sfx}@sxres.dev`,
        memberNone, `memberNone-${sfx}@sxres.dev`,
      ],
    );
    await ds.query(
      `INSERT INTO workspaces (id, organization_id, name, created_by)
       VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [wsA, org, `WSA ${sfx}`, adminU, wsB, org, `WSB ${sfx}`, adminU],
    );
    // memberA is a member of wsA only; memberNone has no membership.
    await ds.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, organization_id)
       VALUES ($1,$2,'workspace_member',$3)`,
      [wsA, memberA, org],
    );
    // Three resources: one in wsA, one in wsB, one org-level (workspace_id NULL).
    await ds.query(
      `INSERT INTO resources (id, organization_id, name, email, role, workspace_id, skills, is_active)
       VALUES
         ($1,$2,$3,$4,'engineer',$5,$6::jsonb,true),
         ($7,$2,$8,$9,'engineer',$10,$11::jsonb,true),
         ($12,$2,$13,$14,'engineer',NULL,$15::jsonb,true)`,
      [
        resA, org, `RA ${sfx}`, `ra-${sfx}@sxres.dev`, wsA, JSON.stringify([SKILL_A]),
        resB, `RB ${sfx}`, `rb-${sfx}@sxres.dev`, wsB, JSON.stringify([SKILL_B]),
        resOrg, `ROrg ${sfx}`, `rorg-${sfx}@sxres.dev`, JSON.stringify([SKILL_ORG]),
      ],
    );
  }

  async function cleanup(): Promise<void> {
    await ds.query(`DELETE FROM resources WHERE organization_id = $1`, [org]);
    await ds.query(`DELETE FROM workspace_members WHERE organization_id = $1`, [org]);
    await ds.query(`DELETE FROM workspaces WHERE id IN ($1,$2)`, [wsA, wsB]);
    await ds.query(`DELETE FROM users WHERE id IN ($1,$2,$3)`, [adminU, memberA, memberNone]);
    await ds.query(`DELETE FROM organizations WHERE id = $1`, [org]);
  }

  it('(a) member of wsA does NOT see ws-B-scoped resources', async () => {
    const res = await getSkills({ user: memberA, role: 'MEMBER' });
    expect(res.status).toBe(200);
    expect(skillNames(res)).not.toContain(SKILL_B);
  });

  it('(b) member of wsA sees ws-A resources', async () => {
    const res = await getSkills({ user: memberA, role: 'MEMBER' });
    expect(res.status).toBe(200);
    expect(skillNames(res)).toContain(SKILL_A);
  });

  it('(c) member of wsA sees org-level (workspace_id NULL) resources', async () => {
    const res = await getSkills({ user: memberA, role: 'MEMBER' });
    expect(res.status).toBe(200);
    expect(skillNames(res)).toContain(SKILL_ORG);
  });

  it('(d) platform-ADMIN sees all (null-branch regression)', async () => {
    const res = await getSkills({ user: adminU, role: 'ADMIN' });
    expect(res.status).toBe(200);
    const names = skillNames(res);
    expect(names).toEqual(expect.arrayContaining([SKILL_A, SKILL_B, SKILL_ORG]));
  });

  it('(e) member of NO workspace sees org-level only, not everything', async () => {
    const res = await getSkills({ user: memberNone, role: 'MEMBER' });
    expect(res.status).toBe(200);
    const names = skillNames(res);
    expect(names).toContain(SKILL_ORG);
    expect(names).not.toContain(SKILL_A);
    expect(names).not.toContain(SKILL_B);
  });

  // Regression for the route-shadow defect: these four single-segment static
  // GETs were declared after @Get(':id'), so Express matched them to :id and
  // they 404'd silently. After the reorder each must resolve to its handler
  // (200), not 404. Run as platform ADMIN to avoid unrelated auth branches.
  describe('shadow regression — static routes resolve (200, not the pre-fix 404)', () => {
    const admin = { user: adminU, role: 'ADMIN' };
    const g = (url: string) =>
      asActor(request(app.getHttpServer()).get(url), admin);

    it('GET /resources/skills → 200', async () => {
      expect((await g('/api/resources/skills')).status).toBe(200);
    });
    it('GET /resources/my-capacity → 200', async () => {
      expect((await g('/api/resources/my-capacity')).status).toBe(200);
    });
    it('GET /resources/capacity-summary → 200', async () => {
      const res = await g(
        '/api/resources/capacity-summary?dateFrom=2026-01-01&dateTo=2026-12-31',
      );
      expect(res.status).toBe(200);
    });
    it('GET /resources/task-heat-map → 200', async () => {
      expect((await g('/api/resources/task-heat-map')).status).toBe(200);
    });
  });
});
