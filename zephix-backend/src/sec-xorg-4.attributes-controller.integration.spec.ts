/**
 * SEC-XORG-4 — remaining cross-org holes on WorkspaceAttributesController
 * (workspaces/:wsId/attributes), the siblings SEC-SWEEP-1 missed beside R6.
 *
 * Real HTTP → real controller/service → real Postgres, two orgs.
 *
 * The :wsId path param is NOT validated by TenantContextInterceptor (it reads
 * req.params.workspaceId; this controller declares :wsId), and
 * template_attribute_definitions has no tenant column — so scoping goes through
 * the parent template's org (writes) and an explicit :wsId org-check (read).
 *
 * WRITES — POST/PATCH/DELETE templates/:templateId/attachments[/:defId]:
 *   assertTemplateInOrg gates FIRST → cross-org/unknown template → 404, no mutation.
 * READ — GET available (findAvailable):
 *   :wsId validated against the caller's org + WORKSPACE branch org-scoped, so a
 *   foreign :wsId cannot return another org's WORKSPACE-scoped definitions.
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

describe('SEC-XORG-4 attributes-controller cross-org holes (integration)', () => {
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
  const UNKNOWN_TPL = randomUUID();

  // Org A definitions
  const attrDefA = randomUUID(); // ORG, attached to templateA (order 1)
  const attrDef2A = randomUUID(); // ORG, attached to templateA (order 2)
  const attrDef3A = randomUUID(); // ORG, NOT attached — for POST(b)
  const wsDefA = randomUUID(); // WORKSPACE-scoped in wsA — for read (c)/(d)
  const sysDefA = randomUUID(); // SYSTEM (org-null), enabled in wsA — for read (d)
  // Org B definition (Org B's own, used in the cross-org attach attempt)
  const attrDefB = randomUUID();

  const A = { user: userA, org: orgA };
  const B = { user: userB, org: orgB };

  const asActor = (r: request.Test, actor: { user: string; org: string }) =>
    r
      .set('x-test-user-id', actor.user)
      .set('x-test-org-id', actor.org)
      .set('Cookie', 'XSRF-TOKEN=x4csrf')
      .set('X-CSRF-Token', 'x4csrf');

  const base = (wsId: string) => `/api/workspaces/${wsId}/attributes`;
  const available = (actor: { user: string; org: string }, wsId: string) =>
    asActor(request(app.getHttpServer()).get(`${base(wsId)}/available`), actor);
  const postAttach = (
    actor: { user: string; org: string },
    wsId: string,
    templateId: string,
  ) =>
    asActor(
      request(app.getHttpServer()).post(
        `${base(wsId)}/templates/${templateId}/attachments`,
      ),
      actor,
    );
  const patchAttach = (
    actor: { user: string; org: string },
    wsId: string,
    templateId: string,
    defId: string,
  ) =>
    asActor(
      request(app.getHttpServer()).patch(
        `${base(wsId)}/templates/${templateId}/attachments/${defId}`,
      ),
      actor,
    );
  const deleteAttach = (
    actor: { user: string; org: string },
    wsId: string,
    templateId: string,
    defId: string,
  ) =>
    asActor(
      request(app.getHttpServer()).delete(
        `${base(wsId)}/templates/${templateId}/attachments/${defId}`,
      ),
      actor,
    );

  // Full, ordered attachment rows for a template — the byte-identical snapshot.
  const attRows = (templateId: string) =>
    ds.query(
      `SELECT id, template_id, attribute_definition_id, locked, display_order
         FROM template_attribute_definitions
        WHERE template_id = $1
        ORDER BY display_order ASC, attribute_definition_id ASC`,
      [templateId],
    );
  const attRow = (templateId: string, defId: string) =>
    ds.query(
      `SELECT id, template_id, attribute_definition_id, locked, display_order
         FROM template_attribute_definitions
        WHERE template_id = $1 AND attribute_definition_id = $2`,
      [templateId, defId],
    );

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authStub)
      .compile();

    ds = moduleRef.get<DataSource>(DataSource);
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser()); // CsrfGuard reads request.cookies['XSRF-TOKEN']
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
      [orgA, `A ${sfx}`, `x4-a-${sfx}`, orgB, `B ${sfx}`, `x4-b-${sfx}`],
    );
    await ds.query(
      `INSERT INTO users (id, email, password) VALUES ($1,$2,'x'),($3,$4,'x')`,
      [userA, `a-${sfx}@x4.dev`, userB, `b-${sfx}@x4.dev`],
    );
    await ds.query(
      `INSERT INTO workspaces (id, organization_id, name, created_by) VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [wsA, orgA, `WSA ${sfx}`, userA, wsB, orgB, `WSB ${sfx}`, userB],
    );
    await ds.query(
      `INSERT INTO templates (id, name, organization_id, is_system) VALUES ($1,$2,$3,false)`,
      [templateA, `TPL-A ${sfx}`, orgA],
    );
    // Definitions: 3 ORG in A, 1 WORKSPACE in wsA, 1 ORG in B.
    await ds.query(
      `INSERT INTO attribute_definitions
         (id, organization_id, workspace_id, scope, key, label, data_type, is_active)
       VALUES
         ($1,$2,NULL,'ORG',$3,$4,'text',true),
         ($5,$2,NULL,'ORG',$6,$7,'text',true),
         ($8,$2,NULL,'ORG',$9,$10,'text',true),
         ($11,$2,$12,'WORKSPACE',$13,$14,'text',true),
         ($15,$16,NULL,'ORG',$17,$18,'text',true)`,
      [
        attrDefA, orgA, `ka-${sfx}`, `KA ${sfx}`,
        attrDef2A, `kb-${sfx}`, `KB ${sfx}`,
        attrDef3A, `kc-${sfx}`, `KC ${sfx}`,
        wsDefA, wsA, `kws-${sfx}`, `KWS ${sfx}`,
        attrDefB, orgB, `kob-${sfx}`, `KOB ${sfx}`,
      ],
    );
    // A SYSTEM (org-null) definition, enabled in wsA — must still surface in
    // findAvailable after the find-family rewrite (qb() would have dropped it).
    await ds.query(
      `INSERT INTO attribute_definitions
         (id, organization_id, workspace_id, scope, key, label, data_type, is_active)
       VALUES ($1,NULL,NULL,'SYSTEM',$2,$3,'text',true)`,
      [sysDefA, `ksys-${sfx}`, `KSYS ${sfx}`],
    );
    await ds.query(
      `INSERT INTO workspace_enabled_attributes (workspace_id, attribute_definition_id)
       VALUES ($1,$2)`,
      [wsA, sysDefA],
    );
    // Two seeded attachments on templateA.
    await ds.query(
      `INSERT INTO template_attribute_definitions (template_id, attribute_definition_id, display_order)
       VALUES ($1,$2,1),($1,$3,2)`,
      [templateA, attrDefA, attrDef2A],
    );
  }

  async function cleanup(): Promise<void> {
    await ds.query(`DELETE FROM template_attribute_definitions WHERE template_id = $1`, [templateA]);
    await ds.query(`DELETE FROM workspace_enabled_attributes WHERE workspace_id IN ($1,$2)`, [wsA, wsB]);
    await ds.query(`DELETE FROM attribute_definitions WHERE id IN ($1,$2,$3,$4,$5,$6)`, [
      attrDefA, attrDef2A, attrDef3A, wsDefA, attrDefB, sysDefA,
    ]);
    await ds.query(`DELETE FROM templates WHERE id = $1`, [templateA]);
    await ds.query(`DELETE FROM workspaces WHERE id IN ($1,$2)`, [wsA, wsB]);
    await ds.query(`DELETE FROM users WHERE id IN ($1,$2)`, [userA, userB]);
    await ds.query(`DELETE FROM organizations WHERE id IN ($1,$2)`, [orgA, orgB]);
  }

  // ── READ: GET available (findAvailable) ────────────────────────────────────
  describe('GET available — findAvailable', () => {
    it('(c) Org B + Org A :wsId does NOT return Org A WORKSPACE-scoped definitions', async () => {
      const res = await available(B, wsA);
      // :wsId is now honoured → 404, and Org A's wsDefA never appears.
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain(wsDefA);
      expect(normalizeId(res.body.message)).toBe('Workspace not found: <id>');
    });

    it('(d) Org A + own workspace returns SYSTEM-enabled + ORG + WORKSPACE defs', async () => {
      const res = await available(A, wsA);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = new Set(res.body.map((d: { id: string }) => d.id));
      // All three scopes must merge (regression guard for the find-family rewrite).
      expect(ids.has(wsDefA)).toBe(true); // WORKSPACE
      expect(ids.has(sysDefA)).toBe(true); // SYSTEM enabled in wsA
      expect(ids.has(attrDefA)).toBe(true); // ORG
      // And no other org's rows leak in.
      expect(ids.has(attrDefB)).toBe(false);
    });
  });

  // ── WRITE: POST templates/:templateId/attachments ──────────────────────────
  describe('POST templates/:templateId/attachments', () => {
    it('(a) Org B + Org A templateId → 404, no binding written (rows byte-identical)', async () => {
      const before = await attRows(templateA);
      const res = await postAttach(B, wsB, templateA).send({ defId: attrDefB });
      const cross = normalizeId(res.body.message);
      // Indistinguishable from an unknown template for the same id.
      const unknownRes = await postAttach(B, wsB, UNKNOWN_TPL).send({ defId: attrDefB });

      expect(res.status).toBe(404);
      expect(unknownRes.status).toBe(404);
      expect(cross).toBe(normalizeId(unknownRes.body.message));

      const after = await attRows(templateA);
      expect(after).toEqual(before);
      const leaked = await attRow(templateA, attrDefB);
      expect(leaked).toHaveLength(0);
    });

    it('(b) Org A + own template → 201, binding written', async () => {
      const res = await postAttach(A, wsA, templateA).send({ defId: attrDef3A });
      expect([200, 201]).toContain(res.status);
      const row = await attRow(templateA, attrDef3A);
      expect(row).toHaveLength(1);
    });
  });

  // ── WRITE: PATCH templates/:templateId/attachments/:defId ───────────────────
  describe('PATCH templates/:templateId/attachments/:defId', () => {
    it('(a) Org B + Org A templateId → 404, attachment byte-identical', async () => {
      const before = await attRow(templateA, attrDefA);
      const res = await patchAttach(B, wsB, templateA, attrDefA).send({ locked: true });
      expect(res.status).toBe(404);
      const after = await attRow(templateA, attrDefA);
      expect(after).toEqual(before);
      expect(after[0].locked).toBe(false);
    });

    it('(b) Org A + own template → 200, lock applied', async () => {
      const res = await patchAttach(A, wsA, templateA, attrDefA).send({ locked: true });
      expect(res.status).toBe(200);
      const after = await attRow(templateA, attrDefA);
      expect(after[0].locked).toBe(true);
    });
  });

  // ── WRITE: DELETE templates/:templateId/attachments/:defId ──────────────────
  describe('DELETE templates/:templateId/attachments/:defId', () => {
    it('(a) Org B + Org A templateId → 404, attachment still present (byte-identical)', async () => {
      const before = await attRow(templateA, attrDef2A);
      expect(before).toHaveLength(1);
      const res = await deleteAttach(B, wsB, templateA, attrDef2A);
      expect(res.status).toBe(404);
      const after = await attRow(templateA, attrDef2A);
      expect(after).toEqual(before);
    });

    it('(b) Org A + own template → 204, attachment removed', async () => {
      const res = await deleteAttach(A, wsA, templateA, attrDef2A);
      expect(res.status).toBe(204);
      const after = await attRow(templateA, attrDef2A);
      expect(after).toHaveLength(0);
    });
  });
});
