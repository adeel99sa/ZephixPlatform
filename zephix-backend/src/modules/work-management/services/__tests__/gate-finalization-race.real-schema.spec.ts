/**
 * ATOMICITY-1 (4.3) — REAL two-connection proof for gate finalization.
 *
 * The defect: recordDecision loaded the submission unlocked and did a full-row
 * save() to finalize — two approvers racing clobbered status / decisionByUserId
 * (a FALSE governance receipt). The fix: one transaction, a pessimistic_write
 * lock on the submission, recompute THROUGH the manager, and a conditional
 * finalize UPDATE with affected-rows === 1.
 *
 * Two required proofs (both against real Postgres, independent connections):
 *  (a) RACE OUTCOME — two approvers concurrently approve a one-step chain.
 *      Exactly one wins AND the submission actually reaches APPROVED with the
 *      winner as decisionByUserId (not just "one call returned success").
 *  (b) RECOMPUTE VISIBILITY — getChainExecutionState, run through the tx
 *      manager, sees an in-transaction (uncommitted) decision insert.
 *
 * Skips cleanly if Postgres is unreachable (integration DB job runs it).
 */
import { DataSource } from 'typeorm';
import { GateApprovalEngineService } from '../gate-approval-engine.service';
import { PhaseGateSubmission } from '../../entities/phase-gate-submission.entity';
import { GateApprovalDecision } from '../../entities/gate-approval-decision.entity';
import { GateApprovalChainStep } from '../../entities/gate-approval-chain-step.entity';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `atom1_gate_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = 'aaaaaaaa-0000-0000-0000-000000000001';
const GATE_DEF = 'dddddddd-0000-0000-0000-000000000001';
const CHAIN = 'cccccccc-0000-0000-0000-000000000001';
const STEP = 'eeeeeeee-0000-0000-0000-000000000001';
const SUBMISSION = 'ffffffff-0000-0000-0000-000000000001';
const SUBMITTER = '00000000-0000-0000-0000-0000000000aa';
const APPROVER_A = '00000000-0000-0000-0000-0000000000a1';
const APPROVER_B = '00000000-0000-0000-0000-0000000000b2';

// One-step ANY_ONE chain requiring role ADMIN → a single approval completes it,
// and any ADMIN (wildcard) may act.
const STEP_OBJ = {
  id: STEP,
  stepOrder: 1,
  name: 'Review',
  approvalType: 'ANY_ONE',
  minApprovals: 1,
  requiredRole: 'ADMIN',
  requiredUserId: null,
};
const CHAIN_OBJ = { id: CHAIN, steps: [STEP_OBJ] };

function makeEngine(ds: DataSource): GateApprovalEngineService {
  const chainService = {
    getChainForGateDefinition: jest.fn().mockResolvedValue(CHAIN_OBJ),
    getChainById: jest.fn().mockResolvedValue(CHAIN_OBJ),
  };
  const taskActivityService = { record: jest.fn().mockResolvedValue(undefined) };
  const workspaceRepo = {
    findOne: jest.fn().mockResolvedValue({ id: WS, complexityMode: 'governed' }),
  };
  return new GateApprovalEngineService(
    {} as any, // chainRepo — unused in the decision path
    ds.getRepository(GateApprovalChainStep),
    ds.getRepository(GateApprovalDecision),
    workspaceRepo as any,
    ds.getRepository(PhaseGateSubmission),
    taskActivityService as any,
    {} as any, // policiesService — unused here
    chainService as any,
  );
}

describe('ATOMICITY-1 — gate finalization race + recompute visibility (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let engine: GateApprovalEngineService | null = null;
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
      // eslint-disable-next-line no-console
      console.warn(`[ATOMICITY-1 gate] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
      // This spec lives one dir deeper (services/__tests__), so reach src/ with ../../../../
      entities: [__dirname + '/../../../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });
    await testDS.initialize();
    await testDS.query(`CREATE TABLE phase_gate_submissions (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL, workspace_id uuid NOT NULL,
      project_id uuid, phase_id uuid, gate_definition_id uuid NOT NULL,
      status varchar(20) NOT NULL, submitted_by_user_id uuid NOT NULL,
      created_by_user_id uuid,
      submitted_at timestamptz DEFAULT now(), decision_by_user_id uuid,
      decided_at timestamptz, decision_note text,
      documents_snapshot jsonb, checklist_snapshot jsonb,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz )`);
    await testDS.query(`CREATE TABLE gate_approval_decisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
      workspace_id uuid NOT NULL, submission_id uuid NOT NULL, chain_step_id uuid NOT NULL,
      decided_by_user_id uuid NOT NULL, decision varchar(20) NOT NULL, note text,
      decided_at timestamptz DEFAULT now() )`);
    // one-decision-per-user-per-step, mirroring uq_gad_one_per_user
    await testDS.query(`CREATE UNIQUE INDEX uq_gad_one_per_user
      ON gate_approval_decisions (submission_id, chain_step_id, decided_by_user_id)`);
    await testDS.query(`CREATE TABLE gate_approval_chain_steps (
      id uuid PRIMARY KEY, organization_id uuid, chain_id uuid NOT NULL,
      step_order smallint, name varchar(200), description text,
      required_role varchar(50), required_user_id uuid, approval_type varchar(20),
      min_approvals smallint, auto_approve_after_hours smallint,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now() )`);
    await testDS.query(
      `INSERT INTO gate_approval_chain_steps (id, organization_id, chain_id, step_order, name, required_role, approval_type, min_approvals)
       VALUES ($1,$2,$3,1,'Review','ADMIN','ANY_ONE',1)`,
      [STEP, ORG, CHAIN],
    );
    engine = makeEngine(testDS);
    dbReady = true;
  });

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized) {
      await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
      await adminDS.destroy();
    }
  });

  async function seedSubmission(): Promise<void> {
    await testDS!.query(`DELETE FROM gate_approval_decisions WHERE submission_id=$1`, [SUBMISSION]);
    await testDS!.query(`DELETE FROM phase_gate_submissions WHERE id=$1`, [SUBMISSION]);
    await testDS!.query(
      `INSERT INTO phase_gate_submissions (id, organization_id, workspace_id, gate_definition_id, phase_id, status, submitted_by_user_id)
       VALUES ($1,$2,$3,$4,gen_random_uuid(),'SUBMITTED',$5)`,
      [SUBMISSION, ORG, WS, GATE_DEF, SUBMITTER],
    );
  }

  const authOf = (userId: string) => ({ organizationId: ORG, userId, platformRole: 'ADMIN' });

  it('(a) two approvers race: exactly one wins AND the submission actually reaches APPROVED', async () => {
    if (!dbReady) return; // Postgres unreachable — skipped
    await seedSubmission();

    const results = await Promise.allSettled([
      engine!.approveStep(authOf(APPROVER_A), WS, SUBMISSION, 'A'),
      engine!.approveStep(authOf(APPROVER_B), WS, SUBMISSION, 'B'),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    // The loser is serialized by the lock, re-reads the finalized submission,
    // and fails the SUBMITTED precheck — a clean rejection, not a clobber.
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // The submission MUST be finalized — not left SUBMITTED by a silent no-op.
    const [sub] = await testDS!.query(
      `SELECT status, decision_by_user_id FROM phase_gate_submissions WHERE id=$1`,
      [SUBMISSION],
    );
    expect(sub.status).toBe('APPROVED');
    expect([APPROVER_A, APPROVER_B]).toContain(sub.decision_by_user_id);

    // Exactly one decision row exists — the loser never wrote one.
    const [{ count }] = await testDS!.query(
      `SELECT count(*)::int FROM gate_approval_decisions WHERE submission_id=$1`,
      [SUBMISSION],
    );
    expect(count).toBe(1);
    // The winning decision and the finalized submission name the SAME approver.
    const [dec] = await testDS!.query(
      `SELECT decided_by_user_id FROM gate_approval_decisions WHERE submission_id=$1`,
      [SUBMISSION],
    );
    expect(dec.decided_by_user_id).toBe(sub.decision_by_user_id);
  });

  it('(b) recompute visibility: getChainExecutionState via the tx manager sees an in-tx decision', async () => {
    if (!dbReady) return;
    await seedSubmission();

    await testDS!.manager.transaction(async (mgr) => {
      // Uncommitted decision insert inside this tx.
      await mgr.getRepository(GateApprovalDecision).save(
        mgr.getRepository(GateApprovalDecision).create({
          organizationId: ORG, workspaceId: WS, submissionId: SUBMISSION,
          chainStepId: STEP, decidedByUserId: APPROVER_A, decision: 'APPROVED' as any,
        }),
      );

      // Through the manager → sees it → one-step ANY_ONE chain is COMPLETED.
      const withMgr = await engine!.getChainExecutionState(
        authOf(APPROVER_A), WS, CHAIN, SUBMISSION, mgr,
      );
      expect(withMgr.chainStatus).toBe('COMPLETED');

      // Without the manager (committed read) → does NOT see the uncommitted row.
      const withoutMgr = await engine!.getChainExecutionState(
        authOf(APPROVER_A), WS, CHAIN, SUBMISSION,
      );
      expect(withoutMgr.chainStatus).not.toBe('COMPLETED');
    });
  });
});
