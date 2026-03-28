import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C-7: Persist PMBOK gate decision on submission for read-only gate record / audit.
 */
export class AddGateDecisionTypeToPhaseGateSubmissions18000000000055
  implements MigrationInterface
{
  name = 'AddGateDecisionTypeToPhaseGateSubmissions18000000000055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "phase_gate_submissions"
      ADD COLUMN IF NOT EXISTS "gate_decision_type" character varying(32)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "phase_gate_submissions"
      DROP COLUMN IF EXISTS "gate_decision_type"
    `);
  }
}
