import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeProjectWorkspaceIdRequired1765000000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, backfill NULL workspace_ids with the oldest workspace in the same org
    await queryRunner.query(`
      UPDATE "projects" p
      SET "workspace_id" = w.id
      FROM "workspaces" w
      WHERE p."workspace_id" IS NULL
      AND w."organization_id" = p."organization_id"
      AND w.id = (
        SELECT id FROM "workspaces"
        WHERE "organization_id" = p."organization_id"
        ORDER BY "created_at" ASC
        LIMIT 1
      )
    `);

    // If any projects still have NULL workspace_id (no workspace in org), create a default workspace
    await queryRunner.query(`
      INSERT INTO "workspaces" ("id", "name", "slug", "organization_id", "created_by", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        'Default Workspace',
        'default-workspace',
        p."organization_id",
        (SELECT id FROM "users" WHERE "organization_id" = p."organization_id" LIMIT 1),
        NOW(),
        NOW()
      FROM "projects" p
      WHERE p."workspace_id" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "workspaces" w WHERE w."organization_id" = p."organization_id"
      )
      GROUP BY p."organization_id"
    `);

    // Update remaining NULL workspace_ids with the newly created default workspace
    await queryRunner.query(`
      UPDATE "projects" p
      SET "workspace_id" = w.id
      FROM "workspaces" w
      WHERE p."workspace_id" IS NULL
      AND w."organization_id" = p."organization_id"
      AND w."slug" = 'default-workspace'
    `);

    // Drop default if exists
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "workspace_id" DROP DEFAULT
    `);

    // Add NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL
    `);

    // Add foreign key constraint if it doesn't exist
    const fkExists = await queryRunner.query(`
      SELECT 1 FROM pg_constraint
      WHERE conname = 'FK_projects_ws'
      AND conrelid = 'projects'::regclass
    `);

    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "projects"
        ADD CONSTRAINT "FK_projects_ws"
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_ws"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "workspace_id" DROP NOT NULL`,
    );
  }
}
