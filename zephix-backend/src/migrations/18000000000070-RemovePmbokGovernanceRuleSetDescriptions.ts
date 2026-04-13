import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replace governance_rule_sets.description values that reference external
 * methodology branding with neutral Zephix copy. Idempotent on re-run.
 */
export class RemovePmbokGovernanceRuleSetDescriptions18000000000070
  implements MigrationInterface
{
  name = 'RemovePmbokGovernanceRuleSetDescriptions18000000000070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE governance_rule_sets
      SET description = CONCAT('Governance policy catalog for ', entity_type, ' entities.')
      WHERE description IS NOT NULL
        AND description ILIKE '%pmbok%'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* Branding removal is not restored on rollback. */
  }
}
