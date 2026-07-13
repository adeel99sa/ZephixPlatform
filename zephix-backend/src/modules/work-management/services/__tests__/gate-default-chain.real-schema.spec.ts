/**
 * GATE-SUB-2 — Real-Postgres proof of default-chain seeding + backfill.
 *
 * Covers the dispatch's quality cases that need a real DB:
 *   - createDefaultChain builds the exact minimum one-step ADMIN chain
 *   - idempotent: called twice → ONE chain (backfill / re-run safe)
 *   - transactional: gate def + chain in one tx; force a failure after the
 *     chain write → NEITHER the gate def nor the chain exists (they land
 *     together or not at all)
 *   - the backfill SQL (migration 208) is idempotent — run twice, second is
 *     a no-op; active_no_chain goes N → 0
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource, EntityManager } from 'typeorm';
import { GateApprovalChainService } from '../gate-approval-chain.service';
import { GateApprovalChain } from '../../entities/gate-approval-chain.entity';
import { GateApprovalChainStep } from '../../entities/gate-approval-chain-step.entity';
import { PhaseGateDefinition } from '../../entities/phase-gate-definition.entity';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `gatesub2_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const PROJECT = '33333333-3333-3333-3333-333333333333';
const ACTOR = '55555555-5555-5555-5555-555555555555';

describe('GATE-SUB-2 — default chain + backfill (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let svc: GateApprovalChainService | null = null;
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
      console.warn(`[GATE-SUB-2] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
      entities: [__dirname + '/../../../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });
    await testDS.initialize();

    await testDS.query(`CREATE TABLE phase_gate_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL, workspace_id UUID NOT NULL,
      project_id UUID NOT NULL, phase_id UUID NOT NULL,
      name VARCHAR(120) NOT NULL, gate_key VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      reviewers_role_policy JSONB, required_documents JSONB,
      required_checklist JSONB, thresholds JSONB,
      created_by_user_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      deleted_at TIMESTAMP )`);
    await testDS.query(`CREATE TABLE gate_approval_chains (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL, workspace_id UUID NOT NULL,
      gate_definition_id UUID NOT NULL, name VARCHAR(120) NOT NULL,
      description TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
      created_by_user_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(), deleted_at TIMESTAMP )`);
    await testDS.query(`CREATE TABLE gate_approval_chain_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      chain_id UUID NOT NULL REFERENCES gate_approval_chains(id) ON DELETE CASCADE,
      step_order SMALLINT NOT NULL, name VARCHAR(120) NOT NULL, description TEXT,
      required_role VARCHAR(40), required_user_id UUID,
      approval_type VARCHAR(10) NOT NULL DEFAULT 'ANY_ONE',
      min_approvals SMALLINT NOT NULL DEFAULT 1, auto_approve_after_hours SMALLINT,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT chk_step_has_target CHECK (required_role IS NOT NULL OR required_user_id IS NOT NULL) )`);

    svc = new GateApprovalChainService(
      testDS.getRepository(GateApprovalChain),
      testDS.getRepository(GateApprovalChainStep),
      testDS.getRepository(PhaseGateDefinition),
      { resolvePolicy: async () => null } as any,
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

  const seedGateDef = async (id: string) =>
    testDS!.query(
      `INSERT INTO phase_gate_definitions
         (id, organization_id, workspace_id, project_id, phase_id, name, status, created_by_user_id)
       VALUES ($1,$2,$3,$4,gen_random_uuid(),'Gate','ACTIVE',$5)`,
      [id, ORG, WS, PROJECT, ACTOR],
    );
  const chainCount = async (gateDefId: string) =>
    Number((await testDS!.query(
      `SELECT count(*)::int c FROM gate_approval_chains WHERE gate_definition_id=$1`, [gateDefId]))[0].c);

  it('creates the minimum one-step ADMIN chain', async () => {
    if (!dbReady) return;
    const gid = 'aaaaaaaa-0000-0000-0000-000000000001';
    await seedGateDef(gid);
    await testDS!.transaction((m: EntityManager) =>
      svc!.createDefaultChain({ organizationId: ORG, workspaceId: WS, gateDefinitionId: gid, createdByUserId: ACTOR }, m));
    const steps = await testDS!.query(
      `SELECT s.step_order, s.required_role, s.approval_type, s.min_approvals
       FROM gate_approval_chain_steps s JOIN gate_approval_chains c ON c.id=s.chain_id
       WHERE c.gate_definition_id=$1`, [gid]);
    expect(await chainCount(gid)).toBe(1);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ step_order: 1, required_role: 'ADMIN', approval_type: 'ANY_ONE', min_approvals: 1 });
  });

  it('is idempotent — called twice yields ONE chain', async () => {
    if (!dbReady) return;
    const gid = 'aaaaaaaa-0000-0000-0000-000000000002';
    await seedGateDef(gid);
    await testDS!.transaction((m: EntityManager) =>
      svc!.createDefaultChain({ organizationId: ORG, workspaceId: WS, gateDefinitionId: gid, createdByUserId: ACTOR }, m));
    await testDS!.transaction((m: EntityManager) =>
      svc!.createDefaultChain({ organizationId: ORG, workspaceId: WS, gateDefinitionId: gid, createdByUserId: ACTOR }, m));
    expect(await chainCount(gid)).toBe(1);
  });

  it('is transactional — gate def + chain roll back together on failure', async () => {
    if (!dbReady) return;
    const gid = 'aaaaaaaa-0000-0000-0000-000000000003';
    await expect(
      testDS!.transaction(async (m: EntityManager) => {
        await m.query(
          `INSERT INTO phase_gate_definitions
             (id, organization_id, workspace_id, project_id, phase_id, name, status, created_by_user_id)
           VALUES ($1,$2,$3,$4,gen_random_uuid(),'Gate','ACTIVE',$5)`,
          [gid, ORG, WS, PROJECT, ACTOR]);
        await svc!.createDefaultChain({ organizationId: ORG, workspaceId: WS, gateDefinitionId: gid, createdByUserId: ACTOR }, m);
        throw new Error('forced failure after chain write');
      }),
    ).rejects.toThrow('forced failure after chain write');
    const gateExists = Number((await testDS!.query(
      `SELECT count(*)::int c FROM phase_gate_definitions WHERE id=$1`, [gid]))[0].c);
    expect(gateExists).toBe(0);
    expect(await chainCount(gid)).toBe(0);
  });

  it('backfill SQL (migration 208) is idempotent — run twice, second is a no-op', async () => {
    if (!dbReady) return;
    const gid = 'aaaaaaaa-0000-0000-0000-000000000004';
    await seedGateDef(gid); // ACTIVE, no chain

    const backfill = async () => {
      await testDS!.query(`
        INSERT INTO gate_approval_chains
          (id, organization_id, workspace_id, gate_definition_id, name, is_active, created_by_user_id, created_at, updated_at)
        SELECT gen_random_uuid(), d.organization_id, d.workspace_id, d.id, 'Default approval', true, d.created_by_user_id, now(), now()
        FROM phase_gate_definitions d
        WHERE d.status='ACTIVE' AND d.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM gate_approval_chains c WHERE c.gate_definition_id=d.id AND c.deleted_at IS NULL AND c.is_active=true)`);
      await testDS!.query(`
        INSERT INTO gate_approval_chain_steps
          (id, organization_id, chain_id, step_order, name, required_role, approval_type, min_approvals, created_at, updated_at)
        SELECT gen_random_uuid(), c.organization_id, c.id, 1, 'Admin approval', 'ADMIN', 'ANY_ONE', 1, now(), now()
        FROM gate_approval_chains c
        WHERE c.name='Default approval' AND c.is_active=true AND c.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM gate_approval_chain_steps s WHERE s.chain_id=c.id)`);
    };

    const noChainBefore = Number((await testDS!.query(`
      SELECT count(*)::int c FROM phase_gate_definitions d
      WHERE d.status='ACTIVE' AND d.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM gate_approval_chains c WHERE c.gate_definition_id=d.id AND c.is_active=true)`))[0].c);
    expect(noChainBefore).toBeGreaterThanOrEqual(1);

    await backfill();
    const afterFirst = await chainCount(gid);
    const stepsAfterFirst = Number((await testDS!.query(
      `SELECT count(*)::int c FROM gate_approval_chain_steps s JOIN gate_approval_chains ch ON ch.id=s.chain_id WHERE ch.gate_definition_id=$1`, [gid]))[0].c);
    await backfill(); // second run — must be a no-op
    const afterSecond = await chainCount(gid);
    const stepsAfterSecond = Number((await testDS!.query(
      `SELECT count(*)::int c FROM gate_approval_chain_steps s JOIN gate_approval_chains ch ON ch.id=s.chain_id WHERE ch.gate_definition_id=$1`, [gid]))[0].c);

    expect(afterFirst).toBe(1);
    expect(stepsAfterFirst).toBe(1);
    expect(afterSecond).toBe(1);
    expect(stepsAfterSecond).toBe(1);

    const noChainAfter = Number((await testDS!.query(`
      SELECT count(*)::int c FROM phase_gate_definitions d
      WHERE d.status='ACTIVE' AND d.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM gate_approval_chains c WHERE c.gate_definition_id=d.id AND c.is_active=true)`))[0].c);
    expect(noChainAfter).toBe(0);
  });
});
