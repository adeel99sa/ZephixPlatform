import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create the `project_statuses` table.
 *
 * Per-project status definition rows that replace the global TaskStatus
 * enum as the source of truth for status display + lifecycle bucketing.
 * `status_key` matches the legacy enum string values exactly so existing
 * application-level string comparisons keep working unchanged.
 *
 * Backfill of existing projects and the work_tasks column-type swap are
 * in the follow-up migration `18000000000176-MigrateWorkTaskStatusToVarchar`.
 */
export class AddProjectStatusesTable18000000000175
  implements MigrationInterface
{
  name = 'AddProjectStatusesTable18000000000175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_statuses" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "organization_id" UUID NOT NULL,
        "status_key" VARCHAR(50) NOT NULL,
        "display_name" VARCHAR(100) NOT NULL,
        "color" VARCHAR(7) NOT NULL DEFAULT '#888780',
        "order" INTEGER NOT NULL DEFAULT 0,
        "bucket" VARCHAR(20) NOT NULL DEFAULT 'open',
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UX_project_statuses_project_key" UNIQUE ("project_id", "status_key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_statuses_project_id"
        ON "project_statuses"("project_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_statuses_org_id"
        ON "project_statuses"("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_statuses"`);
  }
}
