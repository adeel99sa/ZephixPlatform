import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectCloneLineageColumns17990000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add lineage tracking columns for project duplication
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "source_project_id" uuid NULL,
        ADD COLUMN IF NOT EXISTS "clone_depth" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "cloned_at" timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "cloned_by" uuid NULL;
    `);

    // Index for querying clones of a project
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_source_project"
        ON "projects"("source_project_id")
        WHERE "source_project_id" IS NOT NULL;
    `);

    // FK to source project (SET NULL if source is deleted) — idempotent
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
          ADD CONSTRAINT "FK_projects_source_project"
          FOREIGN KEY ("source_project_id") REFERENCES "projects"("id")
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // FK to cloning user (SET NULL if user is deleted) — idempotent
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
          ADD CONSTRAINT "FK_projects_cloned_by"
          FOREIGN KEY ("cloned_by") REFERENCES "users"("id")
          ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_cloned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_source_project"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_projects_source_project"`,
    );
    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN IF EXISTS "cloned_by",
        DROP COLUMN IF EXISTS "cloned_at",
        DROP COLUMN IF EXISTS "clone_depth",
        DROP COLUMN IF EXISTS "source_project_id";
    `);
  }
}
