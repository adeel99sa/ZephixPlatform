/**
 * SEC-XORG-READ-1 — cross-tenant READ isolation (integration)
 *
 * Real HTTP (supertest) → real controllers/services → real Postgres, two orgs.
 * Boots the full AppModule; only the JWT auth guard is overridden to inject the
 * caller's org context verbatim (what the real JWT guard would set). Everything
 * downstream — controller org-threading, service predicates, repositories, DB —
 * is the real code path under test. WorkspaceRoleGuardService is NOT stubbed:
 * the earned-value role is derived from the real workspace_members table, which
 * is what the forged-header regression test (c) depends on.
 *
 * Per mounted route:
 *   (a) Org B actor + Org A resource id → denied, body indistinguishable from
 *       an unknown id (404 for id-based reads; empty for list reads; all-zeros
 *       for the count read).
 *   (b) Org A actor, own resource → 200 with correct data.
 * Header class:
 *   (c) a forged x-workspace-role claiming a higher role than the caller holds
 *       is IGNORED — the server-derived membership role wins.
 *
 * Routes exercised: R1 (governance rules/active/evaluations reads), R2
 * (earned-value history), R3 (earned-value compute), R4 (project-health
 * counts), R5 (project KPIs), R7 (template KPIs). R6 is deferred to
 * SEC-XORG-READ-2 (needs DI rewiring) and is not covered here.
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

// A "not found" / "denied" message may echo the id the CALLER supplied — which
// the caller already knows. Indistinguishability requires the two responses to
// have the same status/error/statusCode and the same message SHAPE, not that
// the echoed id matches across two different requested ids. Normalize ids out.
const normalizeId = (s: string | undefined): string =>
  (s || '').replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '<id>',
  );

// Injects req.user from test headers — mirrors the real JWT guard for an
// authenticated user of a given org and platform role.
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

describe('SEC-XORG-READ-1 cross-tenant READ isolation (integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let ds: DataSource;

  const sfx = randomUUID().slice(0, 8);
  const orgA = randomUUID();
  const orgB = randomUUID();
  const adminA = randomUUID();
  const adminB = randomUUID();
  const ownerA = randomUUID(); // workspace_owner of wsA
  const memberA = randomUUID(); // workspace_member of wsA
  const wsA = randomUUID();
  const wsB = randomUUID();
  const projA = randomUUID();
  const taskA = randomUUID();
  const baselineA = randomUUID();
  const ruleSetA = randomUUID();
  const ruleA = randomUUID();
  const templateA = randomUUID();
  const kpiDefA = randomUUID();
  const UNKNOWN = randomUUID();

  const asActor = (
    r: request.Test,
    actor: { user: string; org: string; role?: string },
    opts?: { workspaceId?: string; forgedRole?: string },
  ) => {
    r.set('x-test-user-id', actor.user)
      .set('x-test-org-id', actor.org)
      .set('x-test-platform-role', actor.role ?? 'MEMBER')
      // Global CsrfGuard requires matching XSRF-TOKEN cookie + header.
      .set('Cookie', 'XSRF-TOKEN=sxrcsrf')
      .set('X-CSRF-Token', 'sxrcsrf');
    if (opts?.workspaceId) r.set('x-workspace-id', opts.workspaceId);
    if (opts?.forgedRole) r.set('x-workspace-role', opts.forgedRole);
    return r;
  };

  // Org A / Org B platform admins — isolate the ORG boundary (admin bypasses
  // the earned-value workspace-role check, so a 404 there is purely org-scope).
  const A = { user: adminA, org: orgA, role: 'ADMIN' };
  const B = { user: adminB, org: orgB, role: 'ADMIN' };

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
      `INSERT INTO organizations (id, name, slug, plan_code) VALUES
        ($1,$2,$3,'free'), ($4,$5,$6,'free')`,
      [orgA, `A ${sfx}`, `sxr-a-${sfx}`, orgB, `B ${sfx}`, `sxr-b-${sfx}`],
    );
    await ds.query(
      `INSERT INTO users (id, email, password) VALUES
        ($1,$2,'x'),($3,$4,'x'),($5,$6,'x'),($7,$8,'x')`,
      [
        adminA, `adminA-${sfx}@sxr.dev`,
        adminB, `adminB-${sfx}@sxr.dev`,
        ownerA, `ownerA-${sfx}@sxr.dev`,
        memberA, `memberA-${sfx}@sxr.dev`,
      ],
    );
    await ds.query(
      `INSERT INTO workspaces (id, organization_id, name, created_by) VALUES
        ($1,$2,$3,$4), ($5,$6,$7,$8)`,
      [wsA, orgA, `WSA ${sfx}`, adminA, wsB, orgB, `WSB ${sfx}`, adminB],
    );
    // Server-derived roles for the header regression test.
    await ds.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, organization_id)
       VALUES ($1,$2,'workspace_owner',$3), ($1,$4,'workspace_member',$3)`,
      [wsA, ownerA, orgA, memberA],
    );

    // Project A (org A) with cost + earned-value enabled for the compute path.
    await ds.query(
      `INSERT INTO projects
        (id, name, workspace_id, organization_id, budget, flat_labor_rate_per_hour,
         cost_tracking_enabled, earned_value_enabled)
       VALUES ($1,$2,$3,$4,100000,100,true,true)`,
      [projA, `PA ${sfx}`, wsA, orgA],
    );
    await ds.query(
      `INSERT INTO work_tasks
        (id, organization_id, workspace_id, project_id, title, status,
         percent_complete, actual_hours)
       VALUES ($1,$2,$3,$4,$5,'DONE',50,10)`,
      [taskA, orgA, wsA, projA, `T ${sfx}`],
    );
    await ds.query(
      `INSERT INTO schedule_baselines
        (id, organization_id, workspace_id, project_id, name, created_by, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)`,
      [baselineA, orgA, wsA, projA, `BL ${sfx}`, adminA],
    );
    await ds.query(
      `INSERT INTO schedule_baseline_items
        (baseline_id, task_id, planned_start_at, planned_end_at, duration_minutes)
       VALUES ($1,$2, NOW() - INTERVAL '10 days', NOW() + INTERVAL '10 days', 480)`,
      [baselineA, taskA],
    );
    await ds.query(
      `INSERT INTO earned_value_snapshots
        (organization_id, workspace_id, project_id, as_of_date, bac, pv, ev, ac, cpi, spi)
       VALUES ($1,$2,$3,'2026-03-01',100000,50000,45000,50000,0.9,0.9),
              ($1,$2,$3,'2026-03-15',100000,60000,50000,55000,0.91,0.83)`,
      [orgA, wsA, projA],
    );
    await ds.query(
      `INSERT INTO iterations (organization_id, workspace_id, project_id, name)
       VALUES ($1,$2,$3,$4)`,
      [orgA, wsA, projA, `IT ${sfx}`],
    );

    // Governance (org A)
    await ds.query(
      `INSERT INTO governance_rule_sets (id, organization_id, entity_type, name)
       VALUES ($1,$2,'PROJECT',$3)`,
      [ruleSetA, orgA, `RS-A ${sfx}`],
    );
    await ds.query(
      `INSERT INTO governance_rules (id, rule_set_id, code) VALUES ($1,$2,'GATE_X')`,
      [ruleA, ruleSetA],
    );
    await ds.query(
      `INSERT INTO governance_rule_active_versions (rule_set_id, code, active_rule_id)
       VALUES ($1,'GATE_X',$2)`,
      [ruleSetA, ruleA],
    );
    await ds.query(
      `INSERT INTO governance_evaluations
        (organization_id, workspace_id, entity_type, entity_id, transition_type,
         enforcement_mode, decision, actor_user_id)
       VALUES ($1,$2,'project',$3,'phase_gate','HARD','ALLOW',$4)`,
      [orgA, wsA, projA, adminA],
    );

    // Template KPIs (org A)
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
    await ds.query(
      `INSERT INTO template_kpis (template_id, kpi_definition_id) VALUES ($1,$2)`,
      [templateA, kpiDefA],
    );
  }

  async function cleanup(): Promise<void> {
    // Children first, then parents. All fixture-local rows.
    await ds.query(`DELETE FROM template_kpis WHERE template_id = $1`, [templateA]);
    await ds.query(`DELETE FROM kpi_definitions WHERE id = $1`, [kpiDefA]);
    await ds.query(`DELETE FROM templates WHERE id = $1`, [templateA]);
    await ds.query(`DELETE FROM governance_evaluations WHERE organization_id = $1`, [orgA]);
    await ds.query(`DELETE FROM governance_rule_active_versions WHERE rule_set_id = $1`, [ruleSetA]);
    await ds.query(`DELETE FROM governance_rules WHERE rule_set_id = $1`, [ruleSetA]);
    await ds.query(`DELETE FROM governance_rule_sets WHERE id = $1`, [ruleSetA]);
    await ds.query(`DELETE FROM earned_value_snapshots WHERE project_id = $1`, [projA]);
    await ds.query(`DELETE FROM schedule_baseline_items WHERE baseline_id = $1`, [baselineA]);
    await ds.query(`DELETE FROM schedule_baselines WHERE id = $1`, [baselineA]);
    await ds.query(`DELETE FROM iterations WHERE project_id = $1`, [projA]);
    await ds.query(`DELETE FROM work_tasks WHERE project_id = $1`, [projA]);
    await ds.query(`DELETE FROM projects WHERE id = $1`, [projA]);
    await ds.query(`DELETE FROM workspace_members WHERE workspace_id = $1`, [wsA]);
    await ds.query(`DELETE FROM workspaces WHERE id IN ($1,$2)`, [wsA, wsB]);
    await ds.query(`DELETE FROM users WHERE id IN ($1,$2,$3,$4)`, [adminA, adminB, ownerA, memberA]);
    await ds.query(`DELETE FROM organizations WHERE id IN ($1,$2)`, [orgA, orgB]);
  }

  const get = (url: string) => request(app.getHttpServer()).get(url);

  // ── R2: earned-value history ──────────────────────────────────────────────
  describe('R2 GET /work/projects/:id/earned-value/history', () => {
    it('(a) Org B → Org A project is 404, indistinguishable from unknown id', async () => {
      const cross = await asActor(get(`/api/work/projects/${projA}/earned-value/history`), B);
      const unknown = await asActor(get(`/api/work/projects/${UNKNOWN}/earned-value/history`), B);
      expect(cross.status).toBe(404);
      expect(unknown.status).toBe(404);
      expect(cross.body).toEqual(unknown.body);
    });

    it('(b) Org A → own project returns the snapshots', async () => {
      const res = await asActor(get(`/api/work/projects/${projA}/earned-value/history`), A);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // ── R3: earned-value compute ──────────────────────────────────────────────
  describe('R3 GET /work/projects/:id/earned-value', () => {
    const q = '?asOfDate=2026-03-20';
    it('(a) Org B → Org A project is 404, indistinguishable from unknown id', async () => {
      const cross = await asActor(get(`/api/work/projects/${projA}/earned-value${q}`), B);
      const unknown = await asActor(get(`/api/work/projects/${UNKNOWN}/earned-value${q}`), B);
      expect(cross.status).toBe(404);
      expect(unknown.status).toBe(404);
      expect(cross.body).toEqual(unknown.body);
    });

    it('(b) Org A → own project computes earned value', async () => {
      const res = await asActor(get(`/api/work/projects/${projA}/earned-value${q}`), A);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ bac: 100000 });
      expect(typeof res.body.data.cpi).toBe('number');
    });
  });

  // ── (c) forged x-workspace-role header is ignored ─────────────────────────
  describe('(c) forged x-workspace-role header — regression for the whole class', () => {
    it('member forging workspace_owner is still denied (server role wins)', async () => {
      const res = await asActor(
        get(`/api/work/projects/${projA}/earned-value/history`),
        { user: memberA, org: orgA, role: 'MEMBER' },
        { workspaceId: wsA, forgedRole: 'workspace_owner' },
      );
      expect(res.status).toBe(403);
    });

    it('real workspace_owner (no header) is allowed — proves server derivation', async () => {
      const res = await asActor(
        get(`/api/work/projects/${projA}/earned-value/history`),
        { user: ownerA, org: orgA, role: 'MEMBER' },
        { workspaceId: wsA },
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // ── R1: governance reads ──────────────────────────────────────────────────
  describe('R1 governance admin reads', () => {
    it('(a) listRules Org B → Org A rule set is 404, indistinguishable from unknown', async () => {
      const cross = await asActor(get(`/api/admin/governance-rules/rule-sets/${ruleSetA}/rules`), B);
      const unknown = await asActor(get(`/api/admin/governance-rules/rule-sets/${UNKNOWN}/rules`), B);
      expect(cross.status).toBe(404);
      expect(unknown.status).toBe(404);
      expect(cross.body).toEqual(unknown.body);
    });

    it('(b) listRules Org A → own rule set returns rules', async () => {
      const res = await asActor(get(`/api/admin/governance-rules/rule-sets/${ruleSetA}/rules`), A);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('(a) listActiveRules Org B → Org A rule set is 404', async () => {
      const cross = await asActor(get(`/api/admin/governance-rules/rule-sets/${ruleSetA}/rules/active`), B);
      expect(cross.status).toBe(404);
    });

    it('(b) listActiveRules Org A → own rule set returns active versions', async () => {
      const res = await asActor(get(`/api/admin/governance-rules/rule-sets/${ruleSetA}/rules/active`), A);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('(a) listEvaluations Org B → Org A workspace is denied, indistinguishable from unknown', async () => {
      // This route keys on :workspaceId, which the global TenantContextInterceptor
      // validates against the caller's org — a cross-org OR unknown workspaceId is
      // denied (403) before the service. (The query org-predicate added in this
      // ticket is defense-in-depth behind that gate.) The 403 message echoes the
      // requested id, so compare status + error + statusCode + message SHAPE.
      const cross = await asActor(get(`/api/admin/governance-rules/evaluations/${wsA}`), B);
      const unknown = await asActor(get(`/api/admin/governance-rules/evaluations/${UNKNOWN}`), B);
      expect(cross.status).toBe(403);
      expect(unknown.status).toBe(403);
      expect(cross.body.error).toBe(unknown.body.error);
      expect(cross.body.statusCode).toBe(unknown.body.statusCode);
      expect(normalizeId(cross.body.message)).toBe(normalizeId(unknown.body.message));
    });

    it('(b) listEvaluations Org A → own workspace returns evaluations', async () => {
      const res = await asActor(get(`/api/admin/governance-rules/evaluations/${wsA}`), A);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── R5: project KPIs ──────────────────────────────────────────────────────
  describe('R5 GET /kpi/project/:id', () => {
    it('(a) Org B → Org A project is 404, indistinguishable from unknown id', async () => {
      const cross = await asActor(get(`/api/kpi/project/${projA}`), B);
      const unknown = await asActor(get(`/api/kpi/project/${UNKNOWN}`), B);
      expect(cross.status).toBe(404);
      expect(unknown.status).toBe(404);
      expect(cross.body).toEqual(unknown.body);
    });

    it('(b) Org A → own project returns KPIs', async () => {
      const res = await asActor(get(`/api/kpi/project/${projA}`), A);
      expect(res.status).toBe(200);
      expect(res.body.tasksTotal).toBeGreaterThanOrEqual(1);
    });
  });

  // ── R4: project-health counts (all-zeros, byte-identical) ─────────────────
  describe('R4 GET /work/projects/:id/health', () => {
    it('(a) Org B → Org A project is byte-identical to unknown id (all-zero counts)', async () => {
      const cross = await asActor(get(`/api/work/projects/${projA}/health`), B);
      const unknown = await asActor(get(`/api/work/projects/${UNKNOWN}/health`), B);
      expect(cross.status).toBe(200);
      expect(unknown.status).toBe(200);
      // The core assertion: cross-org and unknown produce identical responses.
      expect(cross.body).toEqual(unknown.body);
      expect(cross.body.data).toMatchObject({
        baselineCount: 0,
        earnedValueSnapshots: 0,
        iterationCount: 0,
      });
    });

    it('(b) Org A → own project returns the real counts', async () => {
      const res = await asActor(get(`/api/work/projects/${projA}/health`), A);
      expect(res.status).toBe(200);
      expect(res.body.data.baselineCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.earnedValueSnapshots).toBeGreaterThanOrEqual(1);
      expect(res.body.data.iterationCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── R7: template KPIs ─────────────────────────────────────────────────────
  describe('R7 GET /admin/templates/:id/kpis', () => {
    it('(a) Org B → Org A template is 404, indistinguishable from unknown id', async () => {
      const cross = await asActor(get(`/api/admin/templates/${templateA}/kpis`), B);
      const unknown = await asActor(get(`/api/admin/templates/${UNKNOWN}/kpis`), B);
      // Same denial for a cross-org id and a nonexistent id. The 404 message
      // echoes the requested id (already known to the caller), so compare
      // status + error + statusCode + message SHAPE, not the echoed id.
      expect(cross.status).toBe(404);
      expect(unknown.status).toBe(404);
      expect(cross.body.error).toBe(unknown.body.error);
      expect(cross.body.statusCode).toBe(unknown.body.statusCode);
      expect(normalizeId(cross.body.message)).toBe(normalizeId(unknown.body.message));
    });

    it('(b) Org A → own template returns the KPI bindings', async () => {
      const res = await asActor(get(`/api/admin/templates/${templateA}/kpis`), A);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
