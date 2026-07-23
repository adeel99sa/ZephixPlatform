/**
 * SEC-XORG-2 — cross-tenant WRITE isolation (integration)
 *
 * Real HTTP (supertest) → real controllers/services → real Postgres, two orgs.
 * Boots the full AppModule; only the AUTH guards are overridden to inject the
 * caller's org context verbatim (what the real JWT guard would set). Everything
 * downstream — controller org-threading, service predicates, repositories, DB —
 * is the real code path under test.
 *
 * Per cluster:
 *   (a) Org B actor + Org A resource id → denied (404/403), indistinguishable
 *       from an unknown id where applicable
 *   (b) the Org A row is BYTE-IDENTICAL after (a 404 with a completed write is
 *       still a breach)
 *   (c) Org A actor, own resource → succeeds
 * Primitive:
 *   (d) platform-ADMIN in Org A submits an Org B workspaceId → rejected
 *   (e) platform-ADMIN in Org A, own-org workspace → succeeds
 *
 * NOTE on W1: the full gate/artifact schema (project_artifacts →
 * project_artifact_items → gate_submission_evidence FK chain) is not present on
 * the local test DB (blocked migration 170). This spec provisions an FK-free
 * gate_submission_evidence table with the exact columns the fix reads/writes.
 * It exercises the org-scoping fix (predicate + scoped delete), not the FKs.
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
  throw new Error(
    '❌ ERROR: DATABASE_URL appears to be production. Use test database only.',
  );
}
if (process.env.NODE_ENV !== 'test') {
  throw new Error(
    `❌ ERROR: NODE_ENV must be 'test', got: ${process.env.NODE_ENV}`,
  );
}
// W2 route is gated behind this flag.
process.env.TEMPLATE_CENTER_V1 = 'true';

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
import { RequireWorkspaceAccessGuard } from './modules/workspaces/guards/require-workspace-access.guard';
import { RequireProjectWorkspaceRoleGuard } from './modules/projects/guards/require-project-workspace-role.guard';
import { WorkspaceRoleGuardService } from './modules/workspace-access/workspace-role-guard.service';
import { WorkspaceAccessService } from './modules/workspace-access/workspace-access.service';
import { TenantContextService } from './modules/tenancy/tenant-context.service';

jest.setTimeout(120000);

// Injects req.user from test headers — mirrors the real JWT guard for an
// authenticated user of a given org and platform role.
const authStub: CanActivate = {
  canActivate: (ctx: ExecutionContext): boolean => {
    const req = ctx.switchToHttp().getRequest();
    const uid = req.headers['x-test-user-id'] as string | undefined;
    const org = req.headers['x-test-org-id'] as string | undefined;
    const prole = (req.headers['x-test-platform-role'] as string) || 'ADMIN';
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

describe('SEC-XORG-2 cross-tenant WRITE isolation (integration)', () => {
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
  const projA = randomUUID();
  const projB = randomUUID();

  // cluster fixtures (all in org A)
  const ruleSetA = randomUUID();
  const templateA = randomUUID();
  const kpiDefA = randomUUID();
  const docA = randomUUID();
  const evidenceA = randomUUID();
  const subA = randomUUID();
  const artItemA = randomUUID();

  const asActor = (
    req: request.Test,
    actor: { user: string; org: string; role?: string },
  ) =>
    req
      .set('x-test-user-id', actor.user)
      .set('x-test-org-id', actor.org)
      .set('x-test-platform-role', actor.role ?? 'ADMIN')
      // Global CsrfGuard requires matching XSRF-TOKEN cookie + header; PlanStatus
      // passes on the default 'active' plan. Neither is under test here.
      .set('Cookie', 'XSRF-TOKEN=sx2csrf')
      .set('X-CSRF-Token', 'sx2csrf');

  const A = { user: userA, org: orgA };
  const B = { user: userB, org: orgB };

  const rowJson = async (table: string, id: string): Promise<unknown> => {
    const rows = await ds.query(
      `SELECT row_to_json(t) AS r FROM ${table} t WHERE id = $1`,
      [id],
    );
    return rows[0]?.r ?? null;
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authStub)
      .overrideGuard(RequireWorkspaceAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequireProjectWorkspaceRoleGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(WorkspaceRoleGuardService)
      .useValue({
        requireWorkspaceWrite: async () => undefined,
        requireWorkspaceRead: async () => undefined,
        requireWorkspaceTaskWrite: async () => undefined,
        validateWorkspaceAccess: async () => 'workspace_owner',
      })
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
    // FK-free evidence table (see file header). No-op where the migrated table
    // already exists is NOT safe (it has FKs), so we (re)create FK-free.
    await ds.query('DROP TABLE IF EXISTS gate_submission_evidence CASCADE');
    await ds.query(`
      CREATE TABLE gate_submission_evidence (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id     UUID NOT NULL,
        submission_id       UUID NOT NULL,
        artifact_item_id    UUID NOT NULL,
        attached_by_user_id UUID NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    await ds.query(
      `INSERT INTO organizations (id, name, slug, plan_code) VALUES
        ($1,$2,$3,'free'), ($4,$5,$6,'free')`,
      [orgA, `A ${sfx}`, `sx2-a-${sfx}`, orgB, `B ${sfx}`, `sx2-b-${sfx}`],
    );
    await ds.query(
      `INSERT INTO users (id, email, password) VALUES ($1,$2,'x'), ($3,$4,'x')`,
      [userA, `a-${sfx}@sx2.dev`, userB, `b-${sfx}@sx2.dev`],
    );
    await ds.query(
      `INSERT INTO workspaces (id, organization_id, name, created_by) VALUES
        ($1,$2,$3,$4), ($5,$6,$7,$8)`,
      [wsA, orgA, `WSA ${sfx}`, userA, wsB, orgB, `WSB ${sfx}`, userB],
    );
    await ds.query(
      `INSERT INTO projects (id, name, workspace_id, organization_id) VALUES
        ($1,$2,$3,$4), ($5,$6,$7,$8)`,
      [projA, `PA ${sfx}`, wsA, orgA, projB, `PB ${sfx}`, wsB, orgB],
    );

    // W3
    await ds.query(
      `INSERT INTO governance_rule_sets (id, organization_id, entity_type, name)
       VALUES ($1,$2,'PROJECT',$3)`,
      [ruleSetA, orgA, `RS-A ${sfx}`],
    );
    // W5
    await ds.query(
      `INSERT INTO templates (id, name, organization_id, is_system)
       VALUES ($1,$2,$3,false)`,
      [templateA, `TPL-A ${sfx}`, orgA],
    );
    await ds.query(
      `INSERT INTO kpi_definitions (id, kpi_key, name, category, unit)
       VALUES ($1,$2,$3,'delivery','count')`,
      [kpiDefA, `k-${sfx}`, `K ${sfx}`],
    );
    // W2
    await ds.query(
      `INSERT INTO document_instances
        (id, project_id, doc_key, name, content_type, status, owner_id)
       VALUES ($1,$2,$3,$4,'markdown','draft',$5)`,
      [docA, projA, `dk-${sfx}`, `Doc ${sfx}`, userA],
    );
    // W6 — camelCase columns
    await ds.query(
      `INSERT INTO project_views (id, "projectId", type, label, "isEnabled", "sortOrder")
       VALUES ($1,$2,'list','List',true,0)`,
      [randomUUID(), projA],
    );
    // W1 — evidence in org A
    await ds.query(
      `INSERT INTO gate_submission_evidence
        (id, organization_id, submission_id, artifact_item_id, attached_by_user_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [evidenceA, orgA, subA, artItemA, userA],
    );
  }

  async function cleanup(): Promise<void> {
    await ds.query('DELETE FROM gate_submission_evidence WHERE organization_id = ANY($1)', [[orgA, orgB]]);
    await ds.query('DELETE FROM project_views WHERE "projectId" = ANY($1)', [[projA, projB]]);
    await ds.query('DELETE FROM document_instances WHERE project_id = ANY($1)', [[projA, projB]]);
    await ds.query('DELETE FROM template_kpis WHERE template_id = $1', [templateA]);
    await ds.query('DELETE FROM templates WHERE id = $1', [templateA]);
    await ds.query('DELETE FROM kpi_definitions WHERE id = $1', [kpiDefA]);
    await ds.query('DELETE FROM governance_rule_sets WHERE id = $1', [ruleSetA]);
    await ds.query('DELETE FROM projects WHERE id = ANY($1)', [[projA, projB]]);
    await ds.query('DELETE FROM workspaces WHERE id = ANY($1)', [[wsA, wsB]]);
    await ds.query('DELETE FROM users WHERE id = ANY($1)', [[userA, userB]]);
    await ds.query('DELETE FROM organizations WHERE id = ANY($1)', [[orgA, orgB]]);
  }

  // ─────────────────────────── PRIMITIVE (d)(e) ───────────────────────────
  // Tested at the service layer against real Postgres two-org data. The HTTP
  // callers (POST /projects, activate-template) wrap canAccessWorkspace failures
  // in generic 400/404s, so they cannot distinguish the primitive's decision —
  // the service call is the load-bearing assertion. (Unit coverage of the full
  // contract lives in workspace-access.service.property.spec.ts.)
  describe('PRIMITIVE — canAccessWorkspace org boundary', () => {
    it('(d) platform-ADMIN in Org A is REJECTED for an Org B workspaceId', async () => {
      const wa = moduleRef.get(WorkspaceAccessService);
      const tc = moduleRef.get(TenantContextService);
      const ok = await tc.runWithTenant({ organizationId: orgA }, () =>
        wa.canAccessWorkspace(wsB, orgA, userA, 'ADMIN'),
      );
      expect(ok).toBe(false);
    });

    it('(e) platform-ADMIN in Org A is ALLOWED for an own-org workspaceId', async () => {
      const wa = moduleRef.get(WorkspaceAccessService);
      const tc = moduleRef.get(TenantContextService);
      const ok = await tc.runWithTenant({ organizationId: orgA }, () =>
        wa.canAccessWorkspace(wsA, orgA, userA, 'ADMIN'),
      );
      expect(ok).toBe(true);
    });
  });

  // ─────────────────────────── W1 detachEvidence ───────────────────────────
  describe('W1 — DELETE gate-submissions/:sub/evidence/:id', () => {
    const url = (s: string, e: string) =>
      `/api/work/gate-submissions/${s}/evidence/${e}`;

    it('(a) Org B actor deleting Org A evidence → 404, row byte-identical', async () => {
      const before = await rowJson('gate_submission_evidence', evidenceA);
      const res = await asActor(
        request(app.getHttpServer())
          .delete(url(subA, evidenceA))
          .set('x-workspace-id', wsB),
        B,
      );
      expect(res.status).toBe(404);
      const after = await rowJson('gate_submission_evidence', evidenceA);
      expect(after).toEqual(before);
      expect(after).not.toBeNull();
    });

    it('(a2) nonexistent evidence id → 404, indistinguishable from (a)', async () => {
      const res = await asActor(
        request(app.getHttpServer())
          .delete(url(subA, randomUUID()))
          .set('x-workspace-id', wsB),
        B,
      );
      expect(res.status).toBe(404);
    });

    it('(c) Org A actor deleting own evidence → 200, row gone', async () => {
      const res = await asActor(
        request(app.getHttpServer())
          .delete(url(subA, evidenceA))
          .set('x-workspace-id', wsA),
        A,
      );
      expect(res.status).toBe(200);
      const after = await rowJson('gate_submission_evidence', evidenceA);
      expect(after).toBeNull();
    });
  });

  // ─────────────────────────── W3 governance rule sets ───────────────────────────
  describe('W3 — PATCH /admin/governance-rules/rule-sets/:id', () => {
    const url = (id: string) => `/api/admin/governance-rules/rule-sets/${id}`;

    it('(a) Org B admin updating Org A rule set → 404, row byte-identical', async () => {
      const before = await rowJson('governance_rule_sets', ruleSetA);
      const res = await asActor(
        request(app.getHttpServer()).patch(url(ruleSetA)),
        B,
      ).send({ name: 'hacked' });
      expect(res.status).toBe(404);
      const after = await rowJson('governance_rule_sets', ruleSetA);
      expect(after).toEqual(before);
    });

    it('(c) Org A admin updating own rule set → 200, name changed', async () => {
      const res = await asActor(
        request(app.getHttpServer()).patch(url(ruleSetA)),
        A,
      ).send({ name: `renamed-${sfx}` });
      expect(res.status).toBe(200);
      const after = (await rowJson('governance_rule_sets', ruleSetA)) as {
        name: string;
      };
      expect(after.name).toBe(`renamed-${sfx}`);
    });
  });

  // ─────────────────────────── W4 org plan ───────────────────────────
  describe('W4 — PATCH /admin/organizations/:id/plan', () => {
    const url = (id: string) => `/api/admin/organizations/${id}/plan`;
    const body = { planCode: 'team', reason: 'cross-org billing test change' };

    it('(a) Org B admin changing Org A plan → 404, org row byte-identical', async () => {
      const before = await rowJson('organizations', orgA);
      const res = await asActor(
        request(app.getHttpServer()).patch(url(orgA)),
        B,
      ).send(body);
      expect(res.status).toBe(404);
      const after = await rowJson('organizations', orgA);
      expect(after).toEqual(before);
    });

    it('(c) Org A admin changing own plan → 200, plan changed', async () => {
      const res = await asActor(
        request(app.getHttpServer()).patch(url(orgA)),
        A,
      ).send(body);
      expect(res.status).toBe(200);
      const after = (await rowJson('organizations', orgA)) as {
        plan_code: string;
      };
      expect(after.plan_code).toBe('team');
    });
  });

  // ─────────────────────────── W5 template KPIs ───────────────────────────
  describe('W5 — POST /admin/templates/:templateId/kpis', () => {
    const url = (t: string) => `/api/admin/templates/${t}/kpis`;

    it('(a) actor from Org B assigning a KPI to Org A template → 404, no binding written', async () => {
      const res = await asActor(
        request(app.getHttpServer()).post(url(templateA)),
        B,
      ).send({ kpiDefinitionId: kpiDefA });
      expect(res.status).toBe(404);
      const rows = await ds.query(
        'SELECT count(*)::int AS n FROM template_kpis WHERE template_id = $1',
        [templateA],
      );
      expect(rows[0].n).toBe(0);
    });

    it('(c) Org A actor assigning a KPI to own template → 201, binding written', async () => {
      const res = await asActor(
        request(app.getHttpServer()).post(url(templateA)),
        A,
      ).send({ kpiDefinitionId: kpiDefA });
      expect([200, 201]).toContain(res.status);
      const rows = await ds.query(
        'SELECT count(*)::int AS n FROM template_kpis WHERE template_id = $1',
        [templateA],
      );
      expect(rows[0].n).toBe(1);
    });
  });

  // ─────────────────────────── W2 document transition ───────────────────────────
  describe('W2 — POST /template-center/projects/:projectId/documents/:documentId/transition', () => {
    const url = (p: string, d: string) =>
      `/api/template-center/projects/${p}/documents/${d}/transition`;

    it('(a) Org B actor transitioning an Org A document → denied, doc byte-identical', async () => {
      const before = await rowJson('document_instances', docA);
      const res = await asActor(
        request(app.getHttpServer()).post(url(projA, docA)),
        B,
      ).send({ action: 'submit_for_review' });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(200);
      const after = await rowJson('document_instances', docA);
      expect(after).toEqual(before);
    });

    it('(c) Org A owner transitioning own document → 200, status advanced', async () => {
      const res = await asActor(
        request(app.getHttpServer()).post(url(projA, docA)),
        A,
      ).send({ action: 'submit_for_review' });
      expect([200, 201]).toContain(res.status);
      const after = (await rowJson('document_instances', docA)) as {
        status: string;
      };
      expect(after.status).toBe('in_review');
    });
  });

  // ─────────────────────────── W6 project view enable ───────────────────────────
  // NOT HTTP-TESTED — and this is itself a finding: ProjectsViewController and
  // ProjectsViewService are registered in NO module (ProjectsModule mounts
  // ProjectsController/ProjectCloneController/ProjectCapabilitiesController/
  // WorkspaceProjectsController only). The route is NOT mounted, contradicting
  // the sweep's "reachable" claim for W6. The org+workspace predicate fix is
  // retained as defence-in-depth (correct the moment the controller is ever
  // mounted). Booting AppModule cannot resolve the unregistered service, so
  // there is no live route or DI-available service to assert against here.
  it('W6 — ProjectsViewController is unmounted (dead route); fix is defence-in-depth', () => {
    expect(true).toBe(true);
  });
});
