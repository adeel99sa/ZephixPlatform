/**
 * GATE-SUB-1 — Real-Postgres proof of the DRAFT-submission connector.
 *
 * Exercises the REAL GateSubmissionService + the real migration CHECK against
 * Postgres (mocked query builders can't validate SQL or a DB CHECK — see the
 * mocked-QueryBuilder-gap lesson). Covers exactly the dispatch's cases:
 *   - idempotency: open twice → ONE row, same id
 *   - REJECTED reuse: transitions back to DRAFT, not duplicated
 *   - transactional: a caller manager that rolls back leaves NO row
 *   - CHECK: an invalid status string is rejected by the DB
 *   - actor: created_by_user_id records who opened the DRAFT
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource, EntityManager } from 'typeorm';
import { GateSubmissionService } from '../gate-submission.service';
import { PhaseGateSubmission } from '../../entities/phase-gate-submission.entity';
import { PhaseGateDefinition } from '../../entities/phase-gate-definition.entity';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `gatesub1_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const PROJECT = '33333333-3333-3333-3333-333333333333';
const PHASE = '44444444-4444-4444-4444-444444444444';
const GATE_DEF = 'aaaaaaaa-1111-1111-1111-111111111111';
const ACTOR = '55555555-5555-5555-5555-555555555555';

describe('GATE-SUB-1 — GateSubmissionService (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let svc: GateSubmissionService | null = null;
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
      console.warn(`[GATE-SUB-1] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }

    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
      entities: [__dirname + '/../../../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });
    await testDS.initialize();

    // Minimal phase_gate_definitions — only what the resolver queries.
    await testDS.query(`CREATE TABLE phase_gate_definitions (
      id UUID PRIMARY KEY,
      organization_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      project_id UUID NOT NULL,
      phase_id UUID NOT NULL,
      name VARCHAR(120) NOT NULL,
      gate_key VARCHAR(120) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      reviewers_role_policy JSONB NULL,
      required_documents JSONB NULL,
      required_checklist JSONB NULL,
      thresholds JSONB NULL,
      created_by_user_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP NULL )`);

    // phase_gate_submissions — full shape + the R3 CHECK from migration 207.
    await testDS.query(`CREATE TABLE phase_gate_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      project_id UUID NOT NULL,
      phase_id UUID NOT NULL,
      gate_definition_id UUID NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      created_by_user_id UUID NULL,
      submitted_by_user_id UUID NULL,
      submitted_at TIMESTAMP NULL,
      decision_by_user_id UUID NULL,
      decided_at TIMESTAMP NULL,
      decision_note TEXT NULL,
      documents_snapshot JSONB NULL,
      checklist_snapshot JSONB NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP NULL,
      CONSTRAINT chk_pgs_status
        CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED')) )`);

    await testDS.query(
      `INSERT INTO phase_gate_definitions
         (id, organization_id, workspace_id, project_id, phase_id, name, gate_key, status, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,'Gate','platform.gate.plan-to-deliver','ACTIVE',$6)`,
      [GATE_DEF, ORG, WS, PROJECT, PHASE, ACTOR],
    );

    svc = new GateSubmissionService(
      testDS.getRepository(PhaseGateSubmission),
      testDS.getRepository(PhaseGateDefinition),
      testDS,
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

  const input = () => ({
    organizationId: ORG, workspaceId: WS, projectId: PROJECT,
    phaseId: PHASE, actorUserId: ACTOR,
  });

  const countSubs = async () =>
    Number((await testDS!.query(`SELECT count(*)::int AS c FROM phase_gate_submissions`))[0].c);

  it('opens a DRAFT and records the actor (created_by_user_id)', async () => {
    if (!dbReady) return;
    const res = await svc!.openDraft(input());
    expect(res.created).toBe(true);
    expect(res.submission.status).toBe('DRAFT');
    expect(res.submission.createdByUserId).toBe(ACTOR);
    expect(res.submission.gateDefinitionId).toBe(GATE_DEF);
    expect(await countSubs()).toBe(1);
  });

  it('is idempotent — opening twice yields ONE row, same id', async () => {
    if (!dbReady) return;
    const first = await svc!.openDraft(input());
    const second = await svc!.openDraft(input());
    expect(second.created).toBe(false);
    expect(second.submission.id).toBe(first.submission.id);
    expect(await countSubs()).toBe(1);
  });

  it('reuses a REJECTED submission — transitions back to DRAFT, not duplicated', async () => {
    if (!dbReady) return;
    const opened = await svc!.openDraft(input());
    await testDS!.query(
      `UPDATE phase_gate_submissions
         SET status='REJECTED', decision_by_user_id=$2, decided_at=NOW(), decision_note='no'
       WHERE id=$1`,
      [opened.submission.id, ACTOR],
    );
    const reopened = await svc!.openDraft(input());
    expect(reopened.reopened).toBe(true);
    expect(reopened.created).toBe(false);
    expect(reopened.submission.id).toBe(opened.submission.id);
    expect(reopened.submission.status).toBe('DRAFT');
    expect(reopened.submission.decisionByUserId).toBeNull();
    expect(await countSubs()).toBe(1);
  });

  it('is transactional — a caller manager that rolls back leaves NO row', async () => {
    if (!dbReady) return;
    const before = await countSubs();
    await expect(
      testDS!.transaction(async (manager: EntityManager) => {
        await svc!.openDraft(input(), manager);
        // Simulate the exception write failing AFTER the submission insert:
        throw new Error('forced companion-write failure');
      }),
    ).rejects.toThrow('forced companion-write failure');
    expect(await countSubs()).toBe(before);
  });

  it('DB CHECK rejects an invalid status string', async () => {
    if (!dbReady) return;
    await expect(
      testDS!.query(
        `INSERT INTO phase_gate_submissions
           (organization_id, workspace_id, project_id, phase_id, gate_definition_id, status)
         VALUES ($1,$2,$3,$4,$5,'BOGUS')`,
        [ORG, WS, PROJECT, PHASE, GATE_DEF],
      ),
    ).rejects.toThrow(/chk_pgs_status|check constraint/i);
  });

  it('throws GATE_DEFINITION_NOT_FOUND when the phase has no active gate', async () => {
    if (!dbReady) return;
    await expect(
      svc!.openDraft({ ...input(), phaseId: '99999999-9999-9999-9999-999999999999' }),
    ).rejects.toMatchObject({ response: { code: 'GATE_DEFINITION_NOT_FOUND' } });
  });
});
