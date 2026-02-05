import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add deleted_by_user_id columns to work_tasks and work_phases
 * for soft delete audit trail.
 */
export class AddDeletedByUserIdToWorkTasksAndPhases17980202500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_by_user_id to work_tasks
    await queryRunner.query(`
      ALTER TABLE work_tasks
      ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID NULL;
    `);

    // Add deleted_by_user_id to work_phases
    await queryRunner.query(`
      ALTER TABLE work_phases
      ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID NULL;
    `);

    // Add index for deleted queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_work_tasks_deleted_at
      ON work_tasks (workspace_id, deleted_at)
      WHERE deleted_at IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_work_phases_deleted_at
      ON work_phases (workspace_id, deleted_at)
      WHERE deleted_at IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_phases_deleted_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_tasks_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE work_phases DROP COLUMN IF EXISTS deleted_by_user_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE work_tasks DROP COLUMN IF EXISTS deleted_by_user_id;`,
    );
  }
}
