/**
 * SEC-XORG-READ-2 (R6) — template-attachment reads scoped to org + :wsId honoured.
 *
 * Real HTTP → real controller/service → real Postgres, two orgs.
 *
 * GET /workspaces/:wsId/attributes/templates/:templateId/attachments previously
 * queried template_attribute_definitions by templateId with no org predicate and
 * ignored :wsId entirely. TenantContextInterceptor does NOT gate :wsId (it reads
 * req.params.workspaceId; this route uses :wsId), so the leak was real. Fixed:
 *   - assertTemplateInOrg (mirrors #501) → cross-org/unknown template → 404
 *   - the :wsId path param is validated against the caller's org → honoured
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

const normalizeId = (s: string | undefined): string =>
  (s || '').replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '<id>',
  );

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

describe('SEC-XORG-READ-2 (R6) template-attachment reads (integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let ds: DataSource;

  const sfx = randomUUID().slice(0, 8);
  const orgA = randomUUID();
  const orgB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const wsA = randomUUID();
  const wsB = randomUUID();
  const templateA = randomUUID();
  const attrDefA = randomUUID();
  const UNKNOWN = randomUUID();

  const A = { user: userA, org: orgA };
  const B = { user: userB, org: orgB };

  const asActor = (r: request.Test, actor: { user: string; org: string }) =>
    r
      .set('x-test-user-id', actor.user)
      .set('x-test-org-id', actor.org)
      .set('Cookie', 'XSRF-TOKEN=r6csrf')
      .set('X-CSRF-Token', 'r6csrf');

  const attachments = (
    actor: { user: string; org: string },
    wsId: string,
    templateId: string,
  ) =>
    asActor(
      request(app.getHttpServer()).get(
        `/api/workspaces/${wsId}/attributes/templates/${templateId}/attachments`,
      ),
      actor,
    );

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
      `INSERT INTO organizations (id, name, slug, plan_code) VALUES ($1,$2,$3,'free'),($4,$5,$6,'free')`,
      [orgA, `A ${sfx}`, `r6-a-${sfx}`, orgB, `B ${sfx}`, `r6-b-${sfx}`],
    );
    await ds.query(
      `INSERT INTO users (id, email, password) VALUES ($1,$2,'x'),($3,$4,'x')`,
      [userA, `a-${sfx}@r6.dev`, userB, `b-${sfx}@r6.dev`],
    );
    await ds.query(
      `INSERT INTO workspaces (id, organization_id, name, created_by) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [wsA, orgA, `WSA ${sfx}`, userA, wsB, orgB, `WSB ${sfx}`, userB],
    );
    // Template A in org A, plus one attribute definition attached to it.
    await ds.query(
      `INSERT INTO templates (id, name, organization_id, is_system) VALUES ($1,$2,$3,false)`,
      [templateA, `TPL-A ${sfx}`, orgA],
    );
    await ds.query(
      `INSERT INTO attribute_definitions (id, organization_id, scope, key, label, data_type)
       VALUES ($1,$2,'ORG',$3,$4,'text')`,
      [attrDefA, orgA, `k-${sfx}`, `K ${sfx}`],
    );
    await ds.query(
      `INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, display_order)
       VALUES ($1,$2,1)`,
      [templateA, attrDefA],
    );
  }

  async function cleanup(): Promise<void> {
    await ds.query(`DELETE FROM template_attribute_definitions WHERE template_id = $1`, [templateA]);
    await ds.query(`DELETE FROM attribute_definitions WHERE id = $1`, [attrDefA]);
    await ds.query(`DELETE FROM templates WHERE id = $1`, [templateA]);
    await ds.query(`DELETE FROM workspaces WHERE id IN ($1,$2)`, [wsA, wsB]);
    await ds.query(`DELETE FROM users WHERE id IN ($1,$2)`, [userA, userB]);
    await ds.query(`DELETE FROM organizations WHERE id IN ($1,$2)`, [orgA, orgB]);
  }

  it('(a) Org B → Org A template is 404, indistinguishable from unknown id', async () => {
    // Org B actor uses their own (valid) workspace so the :wsId check passes and
    // we reach the template org-check.
    const cross = await attachments(B, wsB, templateA);
    const unknown = await attachments(B, wsB, UNKNOWN);
    expect(cross.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(cross.body.error).toBe(unknown.body.error);
    expect(cross.body.statusCode).toBe(unknown.body.statusCode);
    expect(normalizeId(cross.body.message)).toBe(normalizeId(unknown.body.message));
  });

  it('(b) Org A → own template + own workspace returns the attachments', async () => {
    const res = await attachments(A, wsA, templateA);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('(c) the :wsId param is HONOURED — a cross-org workspace is rejected, not ignored', async () => {
    // Org A actor, own template, but a workspace belonging to Org B.
    const res = await attachments(A, wsB, templateA);
    expect(res.status).toBe(404);
    expect(normalizeId(res.body.message)).toBe('Workspace not found: <id>');
  });
});
