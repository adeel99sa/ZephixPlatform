/**
 * ATOMICITY-1 (4.1) — REAL two-connection race proof for exception consumption.
 *
 * A mocked repo cannot prove atomicity — the whole defect is a race, and a race
 * only exists against a real transactional DB. This fires TWO concurrent
 * consumeException() calls at the SAME APPROVED row, each in its OWN transaction
 * (its own pooled connection), via Promise.allSettled — genuine simultaneity,
 * not sequential awaits. Postgres row-locks the UPDATE, so exactly ONE flips
 * APPROVED->CONSUMED (affected=1) and the other sees zero rows (affected=0) and
 * FAILS rather than silently double-spending the override.
 *
 * Skips cleanly if Postgres is unreachable (same convention as the other
 * real-schema specs; runs in the integration DB job).
 */
import { DataSource } from 'typeorm';
import { GovernanceExceptionsService } from '../governance-exceptions.service';
import { GovernanceException } from '../entities/governance-exception.entity';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `atom1_consume_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = 'aaaaaaaa-0000-0000-0000-000000000001';
const PROJ = 'aaaaaaaa-1111-1111-1111-111111111111';
const REQUESTER = '99999999-9999-9999-9999-999999999999';
const USER_A = '10000000-0000-0000-0000-00000000000a';
const USER_B = '20000000-0000-0000-0000-00000000000b';

describe('ATOMICITY-1 — consumeException two-connection race (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
  let svc: GovernanceExceptionsService | null = null;
  let auditCalls = 0;
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
      console.warn(`[ATOMICITY-1] Postgres unreachable — skipping. ${(err as Error).message}`);
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
      self_resolved boolean NOT NULL DEFAULT false,
      audit_event_id uuid,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now() )`);

    const audit = {
      recordOrThrow: async () => {
        auditCalls += 1;
        return { id: 'audit' };
      },
    };
    svc = new GovernanceExceptionsService(
      testDS.getRepository(GovernanceException),
      {} as any,
      {} as any,
      audit as any,
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

  async function seedApproved(): Promise<string> {
    const [row] = await testDS!.query(
      `INSERT INTO governance_exceptions
         (organization_id, workspace_id, project_id, exception_type, status, reason, requested_by_user_id, metadata)
       VALUES ($1,$2,$3,'GOVERNANCE_RULE','APPROVED','override',$4,$5)
       RETURNING id`,
      [ORG, WS, PROJ, REQUESTER, JSON.stringify({ taskId: 'task-A', toStatus: 'done' })],
    );
    return row.id;
  }

  it('two concurrent consumes: exactly one succeeds, one fails, row consumed once', async () => {
    if (!dbReady) return; // Postgres unreachable — skipped
    const id = await seedApproved();
    auditCalls = 0;

    const results = await Promise.allSettled([
      svc!.consumeException(id, ORG, USER_A),
      svc!.consumeException(id, ORG, USER_B),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    // The override was audited exactly once — never double-spent.
    expect(auditCalls).toBe(1);

    const [dbRow] = await testDS!.query(
      `SELECT status, resolved_by_user_id FROM governance_exceptions WHERE id = $1`,
      [id],
    );
    expect(dbRow.status).toBe('CONSUMED');
    // The resolver is whichever call won — but it is set exactly once.
    expect([USER_A, USER_B]).toContain(dbRow.resolved_by_user_id);
  });

  it('affected-rows guard: consuming a non-APPROVED row fails (no silent success)', async () => {
    if (!dbReady) return;
    const [row] = await testDS!.query(
      `INSERT INTO governance_exceptions
         (organization_id, workspace_id, project_id, exception_type, status, reason, requested_by_user_id, metadata)
       VALUES ($1,$2,$3,'GOVERNANCE_RULE','PENDING','p',$4,$5) RETURNING id`,
      [ORG, WS, PROJ, REQUESTER, JSON.stringify({ taskId: 'task-B', toStatus: 'done' })],
    );

    await expect(svc!.consumeException(row.id, ORG, USER_A)).rejects.toThrow();

    const [after] = await testDS!.query(
      `SELECT status FROM governance_exceptions WHERE id = $1`,
      [row.id],
    );
    expect(after.status).toBe('PENDING'); // untouched — not silently consumed
  });
});
