import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToProjects18000000000042
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_projects_org_ws_deleted_at"
      ON "projects" ("organization_id", "workspace_id", "deleted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_projects_org_ws_deleted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN IF EXISTS "deleted_at"
    `);
  }
}
