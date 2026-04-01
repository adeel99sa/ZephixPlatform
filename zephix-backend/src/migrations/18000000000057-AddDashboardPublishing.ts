import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDashboardPublishing18000000000057
  implements MigrationInterface
{
  name = 'AddDashboardPublishing18000000000057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "dashboards"
      ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "dashboards"
      ADD COLUMN IF NOT EXISTS "audience" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "dashboards"
      ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "dashboards"
      ADD COLUMN IF NOT EXISTS "published_at" timestamp DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "dashboards"
      ADD COLUMN IF NOT EXISTS "published_by_user_id" uuid DEFAULT NULL
    `);

    // Index for published dashboard discovery
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_dashboards_published_workspace"
      ON "dashboards" ("organization_id", "workspace_id", "is_published")
      WHERE "is_published" = true AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dashboards_published_workspace"`);
    await queryRunner.query(`ALTER TABLE "dashboards" DROP COLUMN IF EXISTS "published_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "dashboards" DROP COLUMN IF EXISTS "published_at"`);
    await queryRunner.query(`ALTER TABLE "dashboards" DROP COLUMN IF EXISTS "is_default"`);
    await queryRunner.query(`ALTER TABLE "dashboards" DROP COLUMN IF EXISTS "audience"`);
    await queryRunner.query(`ALTER TABLE "dashboards" DROP COLUMN IF EXISTS "is_published"`);
  }
}
