/**
 * OV-BE-1 (item 3) — Real-Postgres proof of member-readable project exceptions
 * + TENANT ISOLATION. Isolation is proven against a real DB, not asserted on a
 * mocked query builder (mocked QBs can't validate the WHERE — see the
 * mocked-QueryBuilder-gap lesson).
 *
 * The moat: a member of workspace A must NEVER see workspace B's exceptions,
 * even by passing B's project id. Skips cleanly if Postgres is unreachable.
 */
import { DataSource } from 'typeorm';
import { GovernanceExceptionsService } from '../governance-exceptions.service';
import { GovernanceException } from '../entities/governance-exception.entity';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `ovbe1_exc_${Date.now()}`;

const ORG1 = '11111111-1111-1111-1111-111111111111';
const ORG2 = '22222222-2222-2222-2222-222222222222';
const WS_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const WS_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const PROJ_A = 'aaaaaaaa-1111-1111-1111-111111111111';
const PROJ_B = 'bbbbbbbb-2222-2222-2222-222222222222';
const REQUESTER = '99999999-9999-9999-9999-999999999999';

describe('OV-BE-1 — listForProject tenant isolation (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let svc: GovernanceExceptionsService | null = null;
  let dbReady = false;

  beforeAll(async () => {
    adminDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: 'postgres',
    });
    try {
      await adminDS.initialize();
      await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      await adminDS.query(`CREATE DATABASE "${TEST_DB}"`);
    } catch (err) {
      console.warn(`[OV-BE-1] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
      entities: [__dirname + '/../../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });
    await testDS.initialize();

    await testDS.query(`CREATE TABLE governance_exceptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      workspace_id uuid NOT NULL,
      project_id uuid,
      exception_type varchar(50) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'PENDING',
      reason text NOT NULL,
      requested_by_user_id uuid NOT NULL,
      resolved_by_user_id uuid,
      resolution_note text,
      audit_event_id uuid,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now() )`);

    const insert = (org: string, ws: string, proj: string, meta: object) =>
      testDS!.query(
        `INSERT INTO governance_exceptions
           (organization_id, workspace_id, project_id, exception_type, status, reason, requested_by_user_id, metadata)
         VALUES ($1,$2,$3,'GOVERNANCE_RULE','PENDING','Task blocked: phase gate not yet approved',$4,$5)`,
        [org, ws, proj, REQUESTER, JSON.stringify(meta)],
      );
    // workspace A / project A  (the requester's own project)
    await insert(ORG1, WS_A, PROJ_A, {
      policyCodes: ['PHASE_GATE_REQUIRED'], phaseId: 'phase-A', taskId: 'task-A',
    });
    // workspace B / project B  (a DIFFERENT workspace, same org)
    await insert(ORG1, WS_B, PROJ_B, { policyCodes: ['PHASE_GATE_REQUIRED'], phaseId: 'phase-B' });
    // different ORG entirely
    await insert(ORG2, WS_A, PROJ_A, { policyCodes: ['PHASE_GATE_REQUIRED'] });

    svc = new GovernanceExceptionsService(
      testDS.getRepository(GovernanceException),
      {} as any, // workspaceRepo — unused by listForProject
      {} as any, // projectRepo — unused
      {} as any, // auditService — unused
    );
    dbReady = true;
  });

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized) {
      await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      await adminDS.destroy();
    }
  });

  it('returns the project’s own exceptions with mapped fields', async () => {
    if (!dbReady) return;
    const rows = await svc!.listForProject(ORG1, WS_A, PROJ_A);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'GOVERNANCE_RULE',
      status: 'PENDING',
      requestedBy: REQUESTER,
      policyCodes: ['PHASE_GATE_REQUIRED'],
      phaseId: 'phase-A',
      taskId: 'task-A',
    });
    expect(rows[0].requestedAt).toBeInstanceOf(Date);
    // Never exposes an approve/reject affordance.
    expect(rows[0]).not.toHaveProperty('resolve');
    expect(rows[0]).not.toHaveProperty('approve');
  });

  it('TENANT ISOLATION: a workspace-A caller passing project B sees NOTHING', async () => {
    if (!dbReady) return;
    // Even with B's project id, the workspace-A scope yields zero rows.
    const rows = await svc!.listForProject(ORG1, WS_A, PROJ_B);
    expect(rows).toHaveLength(0);
  });

  it('TENANT ISOLATION: workspace B’s own exceptions never leak into A', async () => {
    if (!dbReady) return;
    const a = await svc!.listForProject(ORG1, WS_A, PROJ_A);
    expect(a.some((r) => r.phaseId === 'phase-B')).toBe(false);
  });

  it('cross-org: same workspace/project id under a different org returns nothing', async () => {
    if (!dbReady) return;
    // ORG1 caller cannot see the ORG2 row even though it shares WS_A/PROJ_A ids.
    const rows = await svc!.listForProject(ORG1, WS_A, PROJ_A);
    expect(rows).toHaveLength(1); // only the ORG1 row, never the ORG2 duplicate
  });

  it('never returns the org-wide queue — only the named project', async () => {
    if (!dbReady) return;
    const rows = await svc!.listForProject(ORG1, WS_A, PROJ_A);
    // WS_B/PROJ_B exception exists in the same org but is not returned.
    expect(rows.every((r) => r.phaseId !== 'phase-B')).toBe(true);
  });
});
