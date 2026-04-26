import { MigrationInterface, QueryRunner } from 'typeorm';

const SYSTEM_FILTER = `rule_set_id IN (SELECT id FROM governance_rule_sets WHERE scope_type = 'SYSTEM')`;

const SCOPE_CHANGE = {
  when: { creationOnly: true },
  conditions: [
    {
      type: 'ROLE_ALLOWED',
      params: { roles: ['ADMIN', 'workspace_owner', 'workspace_admin'] },
    },
  ],
  message:
    'Only organization or workspace admins may create tasks when this policy is enabled on the project template.',
  severity: 'ERROR',
};

const TASK_SIGNOFF = {
  when: { toStatus: 'DONE' },
  conditions: [{ type: 'FIELD_NOT_EMPTY', field: 'assigneeUserId' }],
  message: 'Task must have an assignee before marking as Done.',
  severity: 'ERROR',
};

const PHASE_GATE = {
  when: {},
  conditions: [],
  message:
    'Phase advancement requires approval (configure approvals in a future release).',
  severity: 'ERROR',
};

const DELIVERABLE_DOC = {
  when: {},
  conditions: [],
  message: 'At least one document must be attached before closing phase.',
  severity: 'ERROR',
};

const WIP_LIMITS = {
  when: { toStatus: 'IN_PROGRESS' },
  conditions: [],
  message: 'Work in progress limit exceeded (enforcement in a future release).',
  severity: 'WARNING',
};

const RISK_ALERT = {
  when: {},
  conditions: [],
  message:
    'High-priority task threshold exceeded (enforcement in a future release).',
  severity: 'WARNING',
};

const BUDGET = {
  when: {},
  conditions: [],
  message:
    'Project budget threshold exceeded (enforcement in a future release).',
  severity: 'WARNING',
};

const SCHEDULE_TOLERANCE = {
  when: {},
  conditions: [],
  message: 'Schedule variance escalation (enforcement in a future release).',
  severity: 'WARNING',
};

const RESOURCE_CAPACITY = {
  when: {},
  conditions: [],
  message: 'Resource allocation governance (enforcement in a future release).',
  severity: 'WARNING',
};

/**
 * Nine-policy SYSTEM catalog: honest evaluable definitions, two PROJECT placeholders,
 * remove mandatory-fields. All rule_definition UPDATEs scoped to SYSTEM sets only.
 */
export class GovernanceCatalogNinePolicies18000000000071
  implements MigrationInterface
{
  name = 'GovernanceCatalogNinePolicies18000000000071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const upd = async (code: string, def: Record<string, unknown>) => {
      await queryRunner.query(
        `UPDATE governance_rules SET rule_definition = $1::jsonb
         WHERE code = $2 AND version = 1 AND ${SYSTEM_FILTER}`,
        [JSON.stringify(def), code],
      );
    };

    await upd('scope-change-control', SCOPE_CHANGE);
    await upd('task-completion-signoff', TASK_SIGNOFF);
    await upd('phase-gate-approval', PHASE_GATE);
    await upd('deliverable-doc-required', DELIVERABLE_DOC);
    await upd('wip-limits', WIP_LIMITS);
    await upd('risk-threshold-alert', RISK_ALERT);
    await upd('budget-threshold', BUDGET);

    await queryRunner.query(
      `DELETE FROM governance_rule_active_versions WHERE code = 'mandatory-fields'`,
    );
    await queryRunner.query(
      `DELETE FROM governance_rules WHERE code = 'mandatory-fields' AND version = 1`,
    );

    const ensureRule = async (
      code: string,
      def: Record<string, unknown>,
    ): Promise<void> => {
      await queryRunner.query(
        `WITH rs AS (
           SELECT id
           FROM governance_rule_sets
           WHERE scope_type = 'SYSTEM'
             AND entity_type = 'PROJECT'
             AND name = 'System PROJECT Governance Policies'
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
             (rule_set_id, code, version, is_active, rule_definition,
              created_by, created_at)
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
         INSERT INTO governance_rule_active_versions
           (rule_set_id, code, active_rule_id)
         SELECT rs.id, $1, final_rule_id.id
         FROM rs, final_rule_id
         ON CONFLICT (rule_set_id, code)
         DO UPDATE SET active_rule_id = EXCLUDED.active_rule_id`,
        [code, JSON.stringify(def)],
      );
    };

    await ensureRule('schedule-tolerance', SCHEDULE_TOLERANCE);
    await ensureRule('resource-capacity-governance', RESOURCE_CAPACITY);
  }

  public async down(): Promise<void> {
    /* Forward-only catalog alignment. */
  }
}
