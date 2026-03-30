import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add organization_id to workspace_members
 *
 * Defect: PR #59 added organization_id to the WorkspaceMember entity and
 * all 6 write paths populate it, but no migration creates the column.
 * Every workspace member INSERT fails with:
 *   column "organization_id" of relation "workspace_members" does not exist
 *
 * Design decisions:
 * - Column is NULLABLE initially to allow safe backfill of existing rows.
 * - Backfill derives organization_id from the parent workspace.
 * - After backfill, column is set to NOT NULL.
 * - Index IDX_wm_org_id added to match entity @Index decorator.
 */
export class AddOrganizationIdToWorkspaceMembers18000000000057
  implements MigrationInterface
{
  name = 'AddOrganizationIdToWorkspaceMembers18000000000057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add column as nullable (safe for existing rows)
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD COLUMN IF NOT EXISTS "organization_id" uuid
    `);

    // Step 2: Backfill from parent workspace
    await queryRunner.query(`
      UPDATE "workspace_members" wm
      SET "organization_id" = w."organization_id"
      FROM "workspaces" w
      WHERE wm."workspace_id" = w."id"
        AND wm."organization_id" IS NULL
    `);

    // Step 3: Set NOT NULL after backfill (matches entity: no nullable flag)
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ALTER COLUMN "organization_id" SET NOT NULL
    `);

    // Step 4: Add index to match entity @Index('IDX_wm_org_id')
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wm_org_id"
      ON "workspace_members" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_wm_org_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP COLUMN IF EXISTS "organization_id"
    `);
  }
}