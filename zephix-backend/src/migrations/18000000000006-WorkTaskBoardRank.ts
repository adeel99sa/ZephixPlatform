import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2H: Board View — board rank index
 *
 * The `rank` column already exists on work_tasks.
 * This migration adds the composite index for board column ordering:
 *   (project_id, status, rank)
 *
 * All DDL idempotent.
 */
export class WorkTaskBoardRank18000000000006 implements MigrationInterface {
  name = 'WorkTaskBoardRank18000000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite index for board view: fast column queries sorted by rank
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_work_tasks_project_status_rank"
        ON work_tasks (project_id, status, rank);
    `);

    // Set default rank for existing tasks that have null rank
    await queryRunner.query(`
      UPDATE work_tasks SET rank = 0 WHERE rank IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_work_tasks_project_status_rank";
    `);
  }
}
