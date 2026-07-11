/**
 * TC-B7 (D2) — Real-Postgres proof of the W2 policy resolution order:
 *   explicit workspace_policies row → complexity-mode bundle default → DISABLED.
 *
 * Canon (ruled): an explicit ENABLE row must override LEAN mode. This exercises
 * the REAL WorkspaceGovPoliciesService.isPolicyActive against Postgres:
 *   - LEAN workspace, no row  → bundle default (init-to-plan LEAN = false)
 *   - LEAN workspace, enabled  → TRUE  (explicit wins over LEAN)
 *   - LEAN workspace, disabled → FALSE (explicit disable)
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';
import { WorkspaceGovPoliciesService } from '../workspace-gov-policies.service';
import { WorkspaceGovPolicy } from '../../entities/workspace-gov-policy.entity';
import { Workspace } from '../../../workspaces/entities/workspace.entity';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb7_lean_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const POLICY = 'platform.gate.init-to-plan'; // LEAN bundle default = false

describe('TC-B7 D2 — explicit enable overrides LEAN (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let svc: WorkspaceGovPoliciesService | null = null;
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
      console.warn(`[TC-B7 D2] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    // Glob entity load (register metadata); we create only the 2 tables the
    // service actually queries (workspaces, workspace_policies).
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
      entities: [__dirname + '/../../../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });
    await testDS.initialize();
    // deleted_at: Workspace is soft-deleted (@DeleteDateColumn) so TypeORM adds
    // "deleted_at IS NULL" to its finds — the column must exist.
    await testDS.query(`CREATE TABLE workspaces (
      id UUID PRIMARY KEY, complexity_mode VARCHAR(20) NOT NULL DEFAULT 'lean',
      deleted_at TIMESTAMP NULL )`);
    await testDS.query(`CREATE TABLE workspace_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL,
      workspace_id UUID NOT NULL, policy_code VARCHAR(120) NOT NULL,
      is_enabled BOOLEAN NOT NULL, params JSONB NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_ws_policy_code UNIQUE (workspace_id, policy_code) )`);
    await testDS.query(`INSERT INTO workspaces (id, complexity_mode) VALUES ($1, 'lean')`, [WS]);
    svc = new WorkspaceGovPoliciesService(
      testDS.getRepository(WorkspaceGovPolicy),
      testDS.getRepository(Workspace),
    );
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try { await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`); } catch { /* best effort */ }
      await adminDS.destroy();
    }
  }, 30_000);

  it('LEAN + no row → bundle default (false)', async () => {
    if (!dbReady || !svc || !testDS) { console.warn('[TC-B7 D2] skipped'); return; }
    await testDS.query(`DELETE FROM workspace_policies WHERE workspace_id=$1`, [WS]);
    expect(await svc.isPolicyActive(ORG, WS, POLICY)).toBe(false);
  });

  it('LEAN + explicit ENABLE row → TRUE (explicit overrides LEAN)', async () => {
    if (!dbReady || !svc || !testDS) { console.warn('[TC-B7 D2] skipped'); return; }
    await testDS.query(
      `INSERT INTO workspace_policies (organization_id, workspace_id, policy_code, is_enabled)
       VALUES ($1,$2,$3,true) ON CONFLICT (workspace_id, policy_code) DO UPDATE SET is_enabled=true`,
      [ORG, WS, POLICY],
    );
    expect(await svc.isPolicyActive(ORG, WS, POLICY)).toBe(true);
  });

  it('LEAN + explicit DISABLE row → FALSE', async () => {
    if (!dbReady || !svc || !testDS) { console.warn('[TC-B7 D2] skipped'); return; }
    await testDS.query(
      `INSERT INTO workspace_policies (organization_id, workspace_id, policy_code, is_enabled)
       VALUES ($1,$2,$3,false) ON CONFLICT (workspace_id, policy_code) DO UPDATE SET is_enabled=false`,
      [ORG, WS, POLICY],
    );
    expect(await svc.isPolicyActive(ORG, WS, POLICY)).toBe(false);
  });
});
