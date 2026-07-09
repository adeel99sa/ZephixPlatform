import { SeedW2GatePolicies18000000000201 } from '../18000000000201-SeedW2GatePolicies';
import { W2_POLICY_CODES } from '../../modules/governance-rules/constants/policy-bundle.constants';

const PHASE_GATE_INSERT_NEW_CODES = [
  'platform.gate.init-to-plan',
  'platform.gate.plan-to-exec',
  'platform.gate.exec-to-monitor',
  'platform.gate.monitor-to-closure',
  'platform.gate.closure-to-closed',
  'platform.gate.evidence-required',
  'platform.gate.closeout-remediation-owner',
];

describe('Migration 18000000000201 — W2 gate policy seeds', () => {
  let queries: Array<{ sql: string; params: unknown[] }>;
  let mockQueryRunner: { query: jest.Mock };

  beforeEach(() => {
    queries = [];
    mockQueryRunner = {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
      }),
    };
  });

  // ── seed idempotency ──────────────────────────────────────────────────────

  it('runs without error when called twice (idempotent shape)', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await m.up(mockQueryRunner as any);
    await m.up(mockQueryRunner as any);
    // idempotency relies on ON CONFLICT DO UPDATE — no error expected
    expect(mockQueryRunner.query).toHaveBeenCalled();
  });

  it('inserts all 7 new platform.gate.* codes into the PHASE_GATE rule set', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await m.up(mockQueryRunner as any);

    for (const code of PHASE_GATE_INSERT_NEW_CODES) {
      const insertQuery = queries.find(
        (q) =>
          q.sql.includes("entity_type = 'PHASE_GATE'") &&
          q.sql.includes("scope_type = 'SYSTEM'") &&
          q.params[0] === code,
      );
      expect(insertQuery).toBeDefined();
    }
  });

  it('uses ON CONFLICT DO UPDATE for upsert idempotency on all inserts', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await m.up(mockQueryRunner as any);

    const insertQueries = queries.filter((q) =>
      q.sql.includes("entity_type = 'PHASE_GATE'") &&
      q.sql.includes('ON CONFLICT (rule_set_id, code)'),
    );
    expect(insertQueries).toHaveLength(PHASE_GATE_INSERT_NEW_CODES.length);
  });

  it('updates risk-threshold-alert stub promotion (no roadmap key in new def)', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await m.up(mockQueryRunner as any);

    const riskUpdate = queries.find(
      (q) =>
        q.sql.includes('UPDATE governance_rules') &&
        q.params[1] === undefined && // single-param UPDATE
        q.sql.includes("'risk-threshold-alert'"),
    );
    expect(riskUpdate).toBeDefined();
    if (riskUpdate) {
      const def = JSON.parse(riskUpdate.params[0] as string);
      expect(def.roadmap).toBeUndefined();
      expect(def.severity).toBe('WARNING');
    }
  });

  it('updates resource-capacity-governance stub promotion', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await m.up(mockQueryRunner as any);

    const capacityUpdate = queries.find(
      (q) =>
        q.sql.includes('UPDATE governance_rules') &&
        q.sql.includes("'resource-capacity-governance'"),
    );
    expect(capacityUpdate).toBeDefined();
  });

  it('does NOT touch wip-limits (deferred)', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await m.up(mockQueryRunner as any);

    const wipQuery = queries.find((q) =>
      JSON.stringify(q.params).includes('wip-limits'),
    );
    expect(wipQuery).toBeUndefined();
  });

  // ── as-built catalog: total query count confirms correct scope ────────────

  it('issues exactly 9 queries (7 ensurePhaseGateRule + 2 stub UPDATE)', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await m.up(mockQueryRunner as any);
    // 7 PHASE_GATE inserts + 2 stub updates = 9
    expect(mockQueryRunner.query).toHaveBeenCalledTimes(9);
  });

  // ── down is forward-only ──────────────────────────────────────────────────

  it('down() is a no-op (forward-only seed migration)', async () => {
    const m = new SeedW2GatePolicies18000000000201();
    await expect(m.down()).resolves.toBeUndefined();
    expect(mockQueryRunner.query).not.toHaveBeenCalled();
  });
});
