import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * W2 — Seed 9 governance policy catalog entries.
 *
 * Operations:
 *   INSERT (idempotent ensureRule):  7 new platform.gate.* codes → SYSTEM PHASE_GATE rule set
 *   UPDATE (stub promotions):        2 existing codes → remove roadmap flag, activate
 *
 * Phase matching note: fromPhase/toPhase values in conditions are advisory labels
 * for display; enforcement relies on gateKey matching in PhaseGateEvaluatorService.
 * SYSTEM waterfall/hybrid templates must use canonical phase names when setting gateKey.
 *
 * Constraint rule: live-read 2026-07-08 — distinct codes in governance_rules confirmed
 * below. ensureRule pattern is idempotent (UPDATE existing OR INSERT new).
 *
 * SYSTEM PHASE_GATE rule set: scope_type='SYSTEM', entity_type='PHASE_GATE'.
 */

const SYSTEM_FILTER = `rule_set_id IN (
  SELECT id FROM governance_rule_sets WHERE scope_type = 'SYSTEM'
)`;

const INIT_TO_PLAN = {
  when: { fromPhase: 'INITIATION', toPhase: 'PLANNING' },
  conditions: [],
  message: 'Gate review required before entering Planning phase.',
  severity: 'WARNING',
};

const PLAN_TO_EXEC = {
  when: { fromPhase: 'PLANNING', toPhase: 'EXECUTION' },
  conditions: [{ type: 'EXISTS_RELATED', relatedEntity: 'gate_submission_evidence', params: { minCount: 1 } }],
  message: 'Gate review and at least one evidence document required before entering Execution.',
  severity: 'ERROR',
};

const EXEC_TO_MONITOR = {
  when: { fromPhase: 'EXECUTION', toPhase: 'MONITORING' },
  conditions: [{ type: 'EXISTS_RELATED', relatedEntity: 'gate_submission_evidence', params: { minCount: 1 } }],
  message: 'Gate review and evidence required before entering Monitoring.',
  severity: 'ERROR',
};

const MONITOR_TO_CLOSURE = {
  when: { fromPhase: 'MONITORING', toPhase: 'CLOSURE' },
  conditions: [{ type: 'EXISTS_RELATED', relatedEntity: 'work_risks', params: { allowedStatuses: ['CLOSED', 'ACCEPTED'] } }],
  message: 'All open risks must be CLOSED or ACCEPTED before entering Closure.',
  severity: 'ERROR',
};

const CLOSURE_TO_CLOSED = {
  when: { fromPhase: 'CLOSURE', toPhase: 'CLOSED' },
  conditions: [
    { type: 'EXISTS_RELATED', relatedEntity: 'gate_submission_evidence', params: { minCount: 1 } },
    { type: 'EXISTS_RELATED', relatedEntity: 'work_risks', params: { requireOwnerForStatuses: ['OPEN', 'MITIGATED', 'ACCEPTED'] } },
  ],
  message: 'Final gate requires evidence and all unresolved risks must have an owner assigned.',
  severity: 'ERROR',
};

const EVIDENCE_REQUIRED = {
  when: { event: 'GATE_SUBMISSION' },
  conditions: [{ type: 'EXISTS_RELATED', relatedEntity: 'gate_submission_evidence', params: { minCount: 1 } }],
  message: 'At least one artifact document must be attached before gate submission can proceed.',
  severity: 'ERROR',
};

const CLOSEOUT_REMEDIATION_OWNER = {
  when: { fromPhase: 'CLOSURE', toPhase: 'CLOSED' },
  conditions: [
    { type: 'EXISTS_RELATED', relatedEntity: 'work_risks', params: { requireOwnerForStatuses: ['OPEN', 'MITIGATED', 'ACCEPTED'] } },
  ],
  message: 'All unresolved risks must have an owner assigned before final project closure.',
  severity: 'ERROR',
};

export class SeedW2GatePolicies18000000000201 implements MigrationInterface {
  name = 'SeedW2GatePolicies18000000000201';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── INSERT: 7 new platform.gate.* codes into SYSTEM PHASE_GATE rule set ──
    const ensurePhaseGateRule = async (
      code: string,
      def: Record<string, unknown>,
    ): Promise<void> => {
      await queryRunner.query(
        `WITH rs AS (
           SELECT id
           FROM governance_rule_sets
           WHERE scope_type = 'SYSTEM'
             AND entity_type = 'PHASE_GATE'
           LIMIT 1
         ),
         existing_rule AS (
           SELECT gr.id
           FROM governance_rules gr
           JOIN rs ON gr.rule_set_id = rs.id
           WHERE gr.code = $1 AND gr.version = 1
         ),
         updated_rule AS (
           UPDATE governance_rules
           SET rule_definition = $2::jsonb
           WHERE id IN (SELECT id FROM existing_rule)
           RETURNING id
         ),
         inserted_rule AS (
           INSERT INTO governance_rules
             (rule_set_id, code, version, is_active, rule_definition, created_by, created_at)
           SELECT rs.id, $1, 1, true, $2::jsonb, NULL, NOW()
           FROM rs
           WHERE NOT EXISTS (SELECT 1 FROM existing_rule)
           RETURNING id
         ),
         final_rule_id AS (
           SELECT id FROM updated_rule
           UNION ALL
           SELECT id FROM inserted_rule
         )
         INSERT INTO governance_rule_active_versions (rule_set_id, code, active_rule_id)
         SELECT rs.id, $1, final_rule_id.id
         FROM rs, final_rule_id
         ON CONFLICT (rule_set_id, code)
         DO UPDATE SET active_rule_id = EXCLUDED.active_rule_id`,
        [code, JSON.stringify(def)],
      );
    };

    await ensurePhaseGateRule('platform.gate.init-to-plan', INIT_TO_PLAN);
    await ensurePhaseGateRule('platform.gate.plan-to-exec', PLAN_TO_EXEC);
    await ensurePhaseGateRule('platform.gate.exec-to-monitor', EXEC_TO_MONITOR);
    await ensurePhaseGateRule('platform.gate.monitor-to-closure', MONITOR_TO_CLOSURE);
    await ensurePhaseGateRule('platform.gate.closure-to-closed', CLOSURE_TO_CLOSED);
    await ensurePhaseGateRule('platform.gate.evidence-required', EVIDENCE_REQUIRED);
    await ensurePhaseGateRule('platform.gate.closeout-remediation-owner', CLOSEOUT_REMEDIATION_OWNER);

    // ── UPDATE: 2 stub promotions — remove roadmap flag, update definition ──
    const RISK_ALERT_V2 = {
      when: {},
      conditions: [{ type: 'NUMBER_GTE', field: 'openRiskCount', value: 10 }],
      message: 'High-priority risk threshold exceeded.',
      severity: 'WARNING',
    };

    const CAPACITY_GOV_V2 = {
      when: { toStatus: 'IN_PROGRESS' },
      conditions: [{ type: 'NUMBER_LTE', field: 'activeTaskCount', value: 15 }],
      message: 'Resource allocation governance — active task capacity exceeded.',
      severity: 'WARNING',
    };

    // Replace rule_definition wholesale (new value has no roadmap key) and activate
    await queryRunner.query(
      `UPDATE governance_rules
       SET rule_definition = $1::jsonb,
           is_active = true
       WHERE code = 'risk-threshold-alert' AND ${SYSTEM_FILTER}`,
      [JSON.stringify(RISK_ALERT_V2)],
    );

    await queryRunner.query(
      `UPDATE governance_rules
       SET rule_definition = $1::jsonb,
           is_active = true
       WHERE code = 'resource-capacity-governance' AND ${SYSTEM_FILTER}`,
      [JSON.stringify(CAPACITY_GOV_V2)],
    );
  }

  public async down(): Promise<void> {
    /* Forward-only W2 seed. Stub promotion down would reintroduce roadmap flag;
       not worth the complexity for a catalog-alignment migration. */
  }
}
