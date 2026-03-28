import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 10: Seed approval chain policy definitions.
 * Uses upsert logic (INSERT IF NOT EXISTS) for idempotency.
 */
export class SeedApprovalChainPolicies17980261000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const definitions = [
      {
        key: 'phase_gate_approval_chain_required',
        category: 'GOVERNANCE',
        description:
          'When true, gate definitions must have an approval chain before submission is accepted',
        valueType: 'BOOLEAN',
        defaultValue: false,
        metadata: null,
      },
      {
        key: 'phase_gate_approval_min_steps',
        category: 'GOVERNANCE',
        description:
          'Minimum number of approval steps required in a chain. Only enforced when chain is required.',
        valueType: 'NUMBER',
        defaultValue: 1,
        metadata: JSON.stringify({ min: 1, max: 20 }),
      },
      {
        key: 'phase_gate_approval_escalation_hours',
        category: 'GOVERNANCE',
        description:
          'Hours before an unanswered approval step triggers an escalation notification',
        valueType: 'NUMBER',
        defaultValue: 72,
        metadata: JSON.stringify({ min: 1, max: 720 }),
      },
      {
        key: 'phase_gate_quality_check_enabled',
        category: 'QUALITY',
        description:
          'When true, gate evaluator warns when tasks in phase have fewer acceptance criteria than acceptance_criteria_min_count policy',
        valueType: 'BOOLEAN',
        defaultValue: false,
        metadata: null,
      },
    ];

    for (const def of definitions) {
      const exists = await queryRunner.query(
        `SELECT 1 FROM policy_definitions WHERE key = $1`,
        [def.key],
      );
      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO policy_definitions (key, category, description, value_type, default_value, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            def.key,
            def.category,
            def.description,
            def.valueType,
            JSON.stringify(def.defaultValue),
            def.metadata,
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM policy_definitions WHERE key IN (
        'phase_gate_approval_chain_required',
        'phase_gate_approval_min_steps',
        'phase_gate_approval_escalation_hours',
        'phase_gate_quality_check_enabled'
      )`,
    );
  }
}
