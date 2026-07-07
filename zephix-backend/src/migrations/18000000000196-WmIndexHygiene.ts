import { MigrationInterface, QueryRunner } from 'typeorm';

export class WmIndexHygiene18000000000196 implements MigrationInterface {
  name = 'WmIndexHygiene18000000000196';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the redundant non-partial index on (project_id, status, rank).
    // The partial index idx_work_tasks_board_column (WHERE deleted_at IS NULL) is
    // strictly better for all board/list queries that filter deleted_at IS NULL.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_work_tasks_project_status_rank"`,
    );

    // Add composite index on task_comments(workspace_id, task_id) so
    // listComments queries (filtered by both columns) use a covering index
    // instead of two single-column scans.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_task_comments_workspace_task"
       ON "task_comments" ("workspace_id", "task_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_task_comments_workspace_task"`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_work_tasks_project_status_rank"
       ON "work_tasks" ("project_id", "status", "rank")`,
    );
  }
}
