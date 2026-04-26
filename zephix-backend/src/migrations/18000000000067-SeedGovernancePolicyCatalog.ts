import { MigrationInterface, QueryRunner } from 'typeorm';

type RuleSetSeed = {
  entityType: string;
  name: string;
  description: string;
};

type RuleSeed = {
  entityType: string;
  code: string;
  ruleDefinition: Record<string, unknown>;
};

const RULE_SETS: RuleSetSeed[] = [
  {
    entityType: 'PHASE_GATE',
    name: 'System PHASE_GATE Governance Policies',
    description: 'Governance policy catalog for PHASE_GATE entities.',
  },
  {
    entityType: 'TASK',
    name: 'System TASK Governance Policies',
    description: 'Governance policy catalog for TASK entities.',
  },
  {
    entityType: 'PROJECT',
    name: 'System PROJECT Governance Policies',
    description: 'Governance policy catalog for PROJECT entities.',
  },
];

/**
 * Seeds the canonical SYSTEM-scoped governance policy catalog.
 *
 * Rule codes per entity_type:
 * - PHASE_GATE: phase-gate-approval, deliverable-doc-required
 * - TASK: scope-change-control, task-completion-signoff, wip-limits,
 *   risk-threshold-alert, mandatory-fields
 * - PROJECT: budget-threshold
 *
 * Nullable fields are kept null to match the original TypeORM seed:
 * organization_id, workspace_id, scope_id, created_by.
 *
 * Idempotent: safe to re-run without duplicating rule sets, rules, or active
 * version pointers.
 */
const RULES: RuleSeed[] = [
  {
    entityType: 'PHASE_GATE',
    code: 'phase-gate-approval',
    ruleDefinition: {
      conditions: [],
      message:
        'Phase advancement requires approval (configure approvals in PR #139).',
      severity: 'ERROR',
    },
  },
  {
    entityType: 'PHASE_GATE',
    code: 'deliverable-doc-required',
    ruleDefinition: {
      conditions: [],
      message: 'At least one document must be attached before closing phase.',
      severity: 'ERROR',
    },
  },
  {
    entityType: 'TASK',
    code: 'scope-change-control',
    ruleDefinition: {
      when: { creationOnly: true },
      conditions: [{ type: 'ROLE_ALLOWED', params: { roles: ['ADMIN'] } }],
      message:
        'Only organization admins may create tasks when this policy is enabled on the project template.',
      severity: 'ERROR',
    },
  },
  {
    entityType: 'TASK',
    code: 'task-completion-signoff',
    ruleDefinition: {
      when: { toStatus: 'DONE' },
      conditions: [{ type: 'FIELD_NOT_EMPTY', field: 'assigneeUserId' }],
      message: 'Task must have an assignee before marking as Done.',
      severity: 'ERROR',
    },
  },
  {
    entityType: 'TASK',
    code: 'wip-limits',
    ruleDefinition: {
      when: { toStatus: 'IN_PROGRESS' },
      conditions: [],
      message: 'Work in progress limit exceeded (enforcement in PR #139).',
      severity: 'WARNING',
    },
  },
  {
    entityType: 'TASK',
    code: 'risk-threshold-alert',
    ruleDefinition: {
      conditions: [],
      message:
        'High-priority task threshold exceeded (enforcement in PR #139).',
      severity: 'WARNING',
    },
  },
  {
    entityType: 'TASK',
    code: 'mandatory-fields',
    ruleDefinition: {
      when: { fromStatus: 'TODO' },
      conditions: [
        { type: 'FIELD_NOT_EMPTY', field: 'assigneeUserId' },
        { type: 'FIELD_NOT_EMPTY', field: 'dueDate' },
      ],
      message: 'Assignee and due date are required before moving from To Do.',
      severity: 'ERROR',
    },
  },
  {
    entityType: 'PROJECT',
    code: 'budget-threshold',
    ruleDefinition: {
      conditions: [],
      message: 'Project budget threshold exceeded (finance domain in PR #139).',
      severity: 'WARNING',
    },
  },
];

export class SeedGovernancePolicyCatalog18000000000067
  implements MigrationInterface
{
  name = 'SeedGovernancePolicyCatalog18000000000067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const ruleSet of RULE_SETS) {
      await queryRunner.query(
        `INSERT INTO governance_rule_sets
           (organization_id, workspace_id, scope_type, scope_id, entity_type,
            name, description, enforcement_mode, is_active, created_by,
            created_at, updated_at)
         SELECT NULL, NULL, 'SYSTEM', NULL, $1, $2, $3, 'OFF', true, NULL,
                NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM governance_rule_sets
           WHERE scope_type = 'SYSTEM' AND entity_type = $1 AND name = $2
         )`,
        [ruleSet.entityType, ruleSet.name, ruleSet.description],
      );
    }

    for (const rule of RULES) {
      await queryRunner.query(
        `WITH rs AS (
           SELECT id
           FROM governance_rule_sets
           WHERE scope_type = 'SYSTEM' AND entity_type = $1
             AND name = CONCAT('System ', $1::text, ' Governance Policies')
           LIMIT 1
         ),
         existing_rule AS (
           SELECT gr.id
           FROM governance_rules gr
           JOIN rs ON gr.rule_set_id = rs.id
           WHERE gr.code = $2 AND gr.version = 1
         ),
         inserted_rule AS (
           INSERT INTO governance_rules
             (rule_set_id, code, version, is_active, rule_definition,
              created_by, created_at)
           SELECT rs.id, $2, 1, true, $3::jsonb, NULL, NOW()
           FROM rs
           WHERE NOT EXISTS (SELECT 1 FROM existing_rule)
           RETURNING id
         ),
         final_rule_id AS (
           SELECT id FROM existing_rule
           UNION ALL
           SELECT id FROM inserted_rule
         )
         INSERT INTO governance_rule_active_versions
           (rule_set_id, code, active_rule_id)
         SELECT rs.id, $2, final_rule_id.id
         FROM rs, final_rule_id
         ON CONFLICT (rule_set_id, code)
         DO UPDATE SET active_rule_id = EXCLUDED.active_rule_id`,
        [rule.entityType, rule.code, JSON.stringify(rule.ruleDefinition)],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM governance_rule_sets
       WHERE scope_type = 'SYSTEM'
         AND name IN (
           'System TASK Governance Policies',
           'System PROJECT Governance Policies',
           'System PHASE_GATE Governance Policies'
         )`,
    );
  }
}
