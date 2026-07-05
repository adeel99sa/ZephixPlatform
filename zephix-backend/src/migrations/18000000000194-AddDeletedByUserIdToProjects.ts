import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 194 — add deleted_by_user_id to projects (P-B1 Member Trash)
 *
 * The projects table had no actor column for soft-deletes; work_tasks already
 * had one from migration 17980202500002. This aligns the schema so
 * deleteProject() can record the actor and restoreProject() can enforce
 * member-level ownership checks (workspace_member may only restore their
 * own deletes; write-roles restore anything).
 *
 * No FK constraint — matches work_tasks pattern (nullable UUID, no FK).
 */
export class AddDeletedByUserIdToProjects18000000000194
  implements MigrationInterface
{
  name = 'AddDeletedByUserIdToProjects18000000000194';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_deleted_at
        ON projects (workspace_id, deleted_at)
        WHERE deleted_at IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_deleted_at;`);
    await queryRunner.query(
      `ALTER TABLE projects DROP COLUMN IF EXISTS deleted_by_user_id;`,
    );
  }
}
