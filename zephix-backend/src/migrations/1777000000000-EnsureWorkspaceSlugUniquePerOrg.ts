import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PROMPT 10: Ensure workspace slug is unique per organization
 *
 * Creates unique index on (organization_id, slug) to support slug-based routing
 */
export class EnsureWorkspaceSlugUniquePerOrg1777000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if index already exists
    const indexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'IDX_workspaces_org_slug_unique'
      )
    `);

    if (!indexExists[0]?.exists) {
      // Create unique index on (organization_id, slug)
      // Only for non-null slugs
      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_workspaces_org_slug_unique"
        ON "workspaces" ("organization_id", "slug")
        WHERE "slug" IS NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_workspaces_org_slug_unique"
    `);
  }
}
