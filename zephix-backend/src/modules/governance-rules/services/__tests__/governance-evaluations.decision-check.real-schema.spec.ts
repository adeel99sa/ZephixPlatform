/**
 * SKIP-1 — Real-Postgres proof of the governance_evaluations decision CHECK and
 * the SKIPPED receipt round-trip. A mocked repo cannot enforce a DB CHECK, so
 * these facts require a real database:
 *   1. The five allowed decisions (ALLOW/WARN/BLOCK/OVERRIDE/SKIPPED) insert.
 *   2. Any value outside the five is REJECTED by CHK_governance_evaluations_decision
 *      (the allowlist-drift guard this migration adds).
 *   3. A stream containing SKIPPED rows replays (reads back) without error —
 *      decision + skip_reason survive the round trip intact.
 *
 * The table + constraint are created here exactly as migration
 * 18000000000211 defines them. Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `skip1_check_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const ACTOR = '33333333-3333-3333-3333-333333333333';

async function insertDecision(
  ds: DataSource,
  decision: string,
  skipReason: string | null,
): Promise<void> {
  await ds.query(
    `INSERT INTO governance_evaluations
       (organization_id, workspace_id, entity_type, entity_id, transition_type,
        enforcement_mode, decision, skip_reason, actor_user_id)
     VALUES ($1,$2,'task',$3,'STATUS_CHANGE','OFF',$4,$5,$6)`,
    [ORG, WS, '44444444-4444-4444-4444-444444444444', decision, skipReason, ACTOR],
  );
}

describe('SKIP-1 — governance_evaluations decision CHECK (real schema)', () => {
  let adminDS: DataSource | null = null;
  let testDS: DataSource | null = null;
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
      console.warn(`[SKIP-1 CHECK] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();
    // Mirror migration 18000000000211's shape: table + skip_reason + CHECK.
    await testDS.query(`
      CREATE TABLE governance_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id UUID NOT NULL,
        transition_type TEXT NOT NULL,
        enforcement_mode TEXT NOT NULL,
        decision TEXT NOT NULL,
        skip_reason TEXT NULL,
        reasons JSONB NOT NULL DEFAULT '[]',
        actor_user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_governance_evaluations_decision"
          CHECK (decision IN ('ALLOW','WARN','BLOCK','OVERRIDE','SKIPPED'))
      )`);
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try { await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`); } catch { /* best effort */ }
    }
    if (adminDS?.isInitialized) await adminDS.destroy();
  }, 30_000);

  it('accepts all five allowed decisions (incl. SKIPPED)', async () => {
    if (!dbReady || !testDS) { console.warn('[SKIP-1 CHECK] skipped'); return; }
    await insertDecision(testDS, 'ALLOW', null);
    await insertDecision(testDS, 'WARN', null);
    await insertDecision(testDS, 'BLOCK', null);
    await insertDecision(testDS, 'OVERRIDE', null);
    await insertDecision(testDS, 'SKIPPED', 'NON_EVALUABLE:risk-threshold-alert');
    await insertDecision(testDS, 'SKIPPED', 'NO_ACTIVE_VERSION');
    const [{ n }] = await testDS.query(`SELECT COUNT(*)::int AS n FROM governance_evaluations`);
    expect(n).toBe(6);
  });

  it('REJECTS a decision outside the five (CHECK fires)', async () => {
    if (!dbReady || !testDS) { console.warn('[SKIP-1 CHECK] skipped'); return; }
    await expect(insertDecision(testDS, 'BOGUS', null)).rejects.toThrow(
      /CHK_governance_evaluations_decision|check constraint/i,
    );
  });

  it('replay: a stream containing SKIPPED rows reads back without error', async () => {
    if (!dbReady || !testDS) { console.warn('[SKIP-1 CHECK] skipped'); return; }
    const rows = await testDS.query(
      `SELECT decision, skip_reason FROM governance_evaluations ORDER BY created_at`,
    );
    // Every row read cleanly; SKIPPED rows carry their structured reason.
    const skipped = rows.filter((r: any) => r.decision === 'SKIPPED');
    expect(skipped.length).toBe(2);
    expect(skipped.map((r: any) => r.skip_reason).sort()).toEqual([
      'NON_EVALUABLE:risk-threshold-alert',
      'NO_ACTIVE_VERSION',
    ]);
    // Non-skip rows have a null skip_reason (honest absence, not empty string).
    const allow = rows.find((r: any) => r.decision === 'ALLOW');
    expect(allow.skip_reason).toBeNull();
  });
});
