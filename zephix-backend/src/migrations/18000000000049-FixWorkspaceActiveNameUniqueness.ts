import { MigrationInterface, QueryRunner } from "typeorm";

export class FixWorkspaceActiveNameUniqueness1800000000049 implements MigrationInterface {
  name = "FixWorkspaceActiveNameUniqueness1800000000049";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop legacy full-table unique constraint on (org_id, name) if it exists.
    // Current schema uses slug-based uniqueness, but some environments may have
    // this leftover constraint that blocks reuse of deleted workspace names.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'UQ_workspaces_org_id_name'
        ) THEN
          DROP INDEX "UQ_workspaces_org_id_name";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'UQ_workspaces_org_id_name'
        ) THEN
          ALTER TABLE "workspaces" DROP CONSTRAINT "UQ_workspaces_org_id_name";
        END IF;
      END
      $$;
    `);

    // Create partial unique index: only active (non-deleted) workspaces
    // within the same org cannot share a name (case-insensitive).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_workspaces_org_name_active_unique"
      ON "workspaces" ("organization_id", lower("name"))
      WHERE "deleted_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_workspaces_org_name_active_unique";
    `);
  }
}
