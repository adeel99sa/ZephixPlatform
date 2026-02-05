import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Compound indexes for work_tasks list patterns to avoid full scans.
 * - workspace_id + project_id + deleted_at + due_date (project-scoped due lists)
 * - workspace_id + deleted_at + updated_at (default sort)
 * - workspace_id + assignee_user_id + deleted_at + due_date (my-tasks due lists)
 */
export class WorkTasksListIndexes17980202400000 implements MigrationInterface {
  name = 'WorkTasksListIndexes17980202400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_work_tasks_workspace_project_deleted_due" ON "work_tasks" ("workspace_id", "project_id", "deleted_at", "due_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_work_tasks_workspace_deleted_updated" ON "work_tasks" ("workspace_id", "deleted_at", "updated_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_work_tasks_workspace_assignee_deleted_due" ON "work_tasks" ("workspace_id", "assignee_user_id", "deleted_at", "due_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_work_tasks_workspace_project_deleted_due"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_work_tasks_workspace_deleted_updated"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_work_tasks_workspace_assignee_deleted_due"`,
    );
  }
}
