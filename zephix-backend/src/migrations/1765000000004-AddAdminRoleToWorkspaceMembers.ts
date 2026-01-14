import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3: Add 'admin' role to workspace_members
 * This migration extends the workspace role model to support workspace_admin
 */
export class AddAdminRoleToWorkspaceMembers1765000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing CHECK constraint
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP CONSTRAINT IF EXISTS "workspace_members_role_check"
    `);

    // Add new CHECK constraint that includes 'admin'
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "workspace_members_role_check"
      CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original constraint (without 'admin')
    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      DROP CONSTRAINT IF EXISTS "workspace_members_role_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace_members"
      ADD CONSTRAINT "workspace_members_role_check"
      CHECK (role IN ('owner', 'member', 'viewer'))
    `);

    // Note: Any existing 'admin' roles will need to be manually converted
    // This is acceptable as this is a new feature in Phase 3
  }
}
