import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replace APPROVALS_MET / EXISTS_RELATED on SYSTEM catalog rules with vacuous
 * conditions until relatedEntities are wired in WorkTasksService / phase flows.
 * Prevents false BLOCK when operators enable template policies.
 *
 * Idempotent: same target state on re-run.
 */
const STABILIZED: Array<{ code: string; def: Record<string, unknown> }> = [
  {
    code: 'phase-gate-approval',
    def: {
      conditions: [],
      message:
        'Phase advancement requires approval (configure approvals in PR #139).',
      severity: 'ERROR',
    },
  },
  {
    code: 'deliverable-doc-required',
    def: {
      conditions: [],
      message:
        'At least one document must be attached before closing phase.',
      severity: 'ERROR',
    },
  },
  {
    code: 'task-completion-signoff',
    def: {
      when: { toStatus: 'DONE' },
      conditions: [],
      message:
        'Task completion requires sign-off (wire approvals in PR #139).',
      severity: 'ERROR',
    },
  },
];

const REVERT: Array<{ code: string; def: Record<string, unknown> }> = [
  {
    code: 'phase-gate-approval',
    def: {
      conditions: [{ type: 'APPROVALS_MET', params: { requiredCount: 0 } }],
      message:
        'Phase advancement requires approval (configure approvals in PR #139).',
      severity: 'ERROR',
    },
  },
  {
    code: 'deliverable-doc-required',
    def: {
      conditions: [
        {
          type: 'EXISTS_RELATED',
          relatedEntity: 'documents',
          params: { minCount: 1 },
        },
      ],
      message:
        'At least one document must be attached before closing phase.',
      severity: 'ERROR',
    },
  },
  {
    code: 'task-completion-signoff',
    def: {
      when: { toStatus: 'DONE' },
      conditions: [{ type: 'APPROVALS_MET', params: { requiredCount: 0 } }],
      message:
        'Task completion requires sign-off (wire approvals in PR #139).',
      severity: 'ERROR',
    },
  },
];

export class StabilizeGovernanceCatalogRuleDefinitions18000000000068
  implements MigrationInterface
{
  name = 'StabilizeGovernanceCatalogRuleDefinitions18000000000068';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { code, def } of STABILIZED) {
      await queryRunner.query(
        `UPDATE governance_rules SET rule_definition = $1::jsonb
         WHERE code = $2 AND version = 1
         AND rule_set_id IN (SELECT id FROM governance_rule_sets WHERE scope_type = 'SYSTEM')`,
        [JSON.stringify(def), code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { code, def } of REVERT) {
      await queryRunner.query(
        `UPDATE governance_rules SET rule_definition = $1::jsonb
         WHERE code = $2 AND version = 1
         AND rule_set_id IN (SELECT id FROM governance_rule_sets WHERE scope_type = 'SYSTEM')`,
        [JSON.stringify(def), code],
      );
    }
  }
}
