import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add partial indexes for stats queries on work_tasks.
 * These indexes only include non-deleted rows for optimal stats performance.
 */
export class WorkTasksStatsIndexes17980202500000 implements MigrationInterface {
  name = 'WorkTasksStatsIndexes17980202500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partial index for workspace-level stats (excludes deleted tasks)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_work_tasks_stats_workspace"
      ON "work_tasks" ("workspace_id", "status")
      WHERE "deleted_at" IS NULL
    `);

    // Partial index for project-level stats (excludes deleted tasks)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_work_tasks_stats_project"
      ON "work_tasks" ("workspace_id", "project_id", "status")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_work_tasks_stats_project"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_work_tasks_stats_workspace"`,
    );
  }
}
