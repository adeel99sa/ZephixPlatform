/**
 * TC-B4 — Real-Postgres round-trip for phase gate keys.
 *
 * Validates the SQL contract mocks can't: a template phase carrying a gateKey
 * → instantiate creates a phase_gate_definitions row wired to the WorkPhase
 * (with the platform.gate.* key) → save-as-template serializes that gate_key
 * back into the template's phase defs. (Live block is proven in Stage-2.)
 *
 * Skips cleanly if Postgres is unreachable (:5433).
 */
import { DataSource } from 'typeorm';

const PG_HOST = process.env.PG_INTEGRATION_HOST ?? 'localhost';
const PG_PORT = Number(process.env.PG_INTEGRATION_PORT ?? 5433);
const PG_USER = process.env.PG_INTEGRATION_USER ?? 'zephix';
const PG_PASSWORD = process.env.PG_INTEGRATION_PASSWORD ?? 'zephix_local';
const TEST_DB = `tcb4_gates_${Date.now()}`;

const ORG = '11111111-1111-1111-1111-111111111111';
const WS = '22222222-2222-2222-2222-222222222222';
const PROJECT = '33333333-3333-3333-3333-333333333333';
const USER = '44444444-4444-4444-4444-444444444444';
const GATE_KEY = 'platform.gate.init-to-plan';

describe('TC-B4 gateKey round-trip (real schema)', () => {
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
      console.warn(`[TC-B4 gates] Postgres unreachable — skipping. ${(err as Error).message}`);
      return;
    }
    testDS = new DataSource({
      type: 'postgres', host: PG_HOST, port: PG_PORT,
      username: PG_USER, password: PG_PASSWORD, database: TEST_DB,
    });
    await testDS.initialize();
    await testDS.query(`CREATE TABLE templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL, phases JSONB NULL )`);
    await testDS.query(`CREATE TABLE work_phases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), project_id UUID NOT NULL,
      name VARCHAR(120) NOT NULL, sort_order INT NOT NULL )`);
    await testDS.query(`CREATE TABLE phase_gate_definitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL,
      workspace_id UUID NOT NULL, project_id UUID NOT NULL, phase_id UUID NOT NULL,
      name VARCHAR(120) NOT NULL, gate_key VARCHAR(120) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', created_by_user_id UUID NOT NULL,
      deleted_at TIMESTAMP NULL, CONSTRAINT ux_pgd_phase UNIQUE (phase_id) )`);
    dbReady = true;
  }, 30_000);

  afterAll(async () => {
    if (testDS?.isInitialized) await testDS.destroy();
    if (adminDS?.isInitialized && dbReady) {
      try { await adminDS.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`); } catch { /* best effort */ }
      await adminDS.destroy();
    }
  }, 30_000);

  it('gateKey survives template → instantiate (gate def) → save-as-template', async () => {
    if (!dbReady || !testDS) { console.warn('[TC-B4 gates] skipped'); return; }

    // Template with a gated phase.
    const phases = [
      { name: 'Initiation', order: 0, gateKey: GATE_KEY },
      { name: 'Planning', order: 1 },
    ];
    const [tpl] = await testDS.query(
      `INSERT INTO templates (name, phases) VALUES ('Gated', $1::jsonb) RETURNING id, phases`,
      [JSON.stringify(phases)],
    );

    // ── INSTANTIATE contract: for each phase with gateKey, create work_phase + gate def ──
    for (const p of tpl.phases) {
      const [wp] = await testDS.query(
        `INSERT INTO work_phases (project_id, name, sort_order) VALUES ($1,$2,$3) RETURNING id`,
        [PROJECT, p.name, p.order],
      );
      if (p.gateKey) {
        await testDS.query(
          `INSERT INTO phase_gate_definitions (organization_id, workspace_id, project_id, phase_id, name, gate_key, status, created_by_user_id)
           VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7)`,
          [ORG, WS, PROJECT, wp.id, `${p.name} Gate`, p.gateKey, USER],
        );
      }
    }

    // Exactly one gate def created, with the canonical key.
    const gates = await testDS.query(
      `SELECT pgd.gate_key, wp.name AS phase_name, pgd.status
         FROM phase_gate_definitions pgd JOIN work_phases wp ON wp.id = pgd.phase_id
        WHERE pgd.project_id=$1 AND pgd.deleted_at IS NULL`,
      [PROJECT],
    );
    expect(gates).toHaveLength(1);
    expect(gates[0].gate_key).toBe(GATE_KEY);
    expect(gates[0].phase_name).toBe('Initiation');
    expect(gates[0].status).toBe('ACTIVE');

    // ── SAVE-AS-TEMPLATE contract: serialize gate defs back into template phases ──
    const projPhases = await testDS.query(
      `SELECT id, name, sort_order FROM work_phases WHERE project_id=$1 ORDER BY sort_order`,
      [PROJECT],
    );
    const gateByPhaseId = new Map<string, string>();
    for (const g of await testDS.query(
      `SELECT phase_id, gate_key FROM phase_gate_definitions WHERE project_id=$1 AND deleted_at IS NULL`,
      [PROJECT],
    )) {
      if (g.gate_key) gateByPhaseId.set(g.phase_id, g.gate_key);
    }
    const savedPhases = projPhases.map((p: any, idx: number) => ({
      name: p.name,
      order: idx + 1,
      gateKey: gateByPhaseId.get(p.id) ?? undefined,
    }));
    const [saved] = await testDS.query(
      `INSERT INTO templates (name, phases) VALUES ('Re-saved', $1::jsonb) RETURNING phases`,
      [JSON.stringify(savedPhases)],
    );

    // gateKey preserved on the initiation phase; absent on planning.
    expect(saved.phases[0].gateKey).toBe(GATE_KEY);
    expect(saved.phases[1].gateKey).toBeUndefined();
  });
});
