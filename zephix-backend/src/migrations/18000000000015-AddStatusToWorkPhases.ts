import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds status column to work_phases for phase completion lifecycle.
 * Required for methodology gate enforcement: waterfall projects
 * must have approved gate submissions before phase can be completed.
 */
export class AddStatusToWorkPhases18000000000015
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_phases
      ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active' NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE work_phases DROP COLUMN IF EXISTS status
    `);
  }
}
