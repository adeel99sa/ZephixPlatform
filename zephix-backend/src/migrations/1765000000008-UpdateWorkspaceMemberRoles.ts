import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1: Update workspace_members role values to use workspace_ prefix
 *
 * Migration updates existing role values:
 * - 'owner' -> 'workspace_owner'
 * - 'member' -> 'workspace_member'
 * - 'viewer' -> 'workspace_viewer'
 * - 'admin' -> 'workspace_owner' (if exists)
 *
 * This aligns with the new WorkspaceRole type definition.
 */
export class UpdateWorkspaceMemberRoles1765000000008
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing role values to new workspace_ prefixed names
    await queryRunner.query(`
      UPDATE workspace_members
      SET role = CASE
        WHEN role = 'owner' THEN 'workspace_owner'
        WHEN role = 'admin' THEN 'workspace_owner'
        WHEN role = 'member' THEN 'workspace_member'
        WHEN role = 'viewer' THEN 'workspace_viewer'
        ELSE role
      END
      WHERE role IN ('owner', 'admin', 'member', 'viewer')
    `);

    // Update the CHECK constraint to allow new role values
    // First, drop the old constraint if it exists
    await queryRunner.query(`
      ALTER TABLE workspace_members
      DROP CONSTRAINT IF EXISTS workspace_members_role_check
    `);

    // Add new constraint with updated role values
    await queryRunner.query(`
      ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_role_check
      CHECK (role IN ('workspace_owner', 'workspace_member', 'workspace_viewer'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert role values back to old names
    await queryRunner.query(`
      UPDATE workspace_members
      SET role = CASE
        WHEN role = 'workspace_owner' THEN 'owner'
        WHEN role = 'workspace_member' THEN 'member'
        WHEN role = 'workspace_viewer' THEN 'viewer'
        ELSE role
      END
      WHERE role IN ('workspace_owner', 'workspace_member', 'workspace_viewer')
    `);

    // Restore old constraint
    await queryRunner.query(`
      ALTER TABLE workspace_members
      DROP CONSTRAINT IF EXISTS workspace_members_role_check
    `);

    await queryRunner.query(`
      ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_role_check
      CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
    `);
  }
}

