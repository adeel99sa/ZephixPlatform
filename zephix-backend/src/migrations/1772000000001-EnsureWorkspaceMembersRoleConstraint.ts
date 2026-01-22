import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensure workspace_members role constraint includes delivery_owner and stakeholder
 *
 * This migration is idempotent and ensures the constraint is correct even if
 * Sprint6WorkspaceRoles migration hasn't been run or was modified in-place.
 */
export class EnsureWorkspaceMembersRoleConstraint1772000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing constraint if it exists
    await queryRunner.query(`
      ALTER TABLE workspace_members
      DROP CONSTRAINT IF EXISTS workspace_members_role_check
    `);

    // Add constraint with all required roles
    await queryRunner.query(`
      ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_role_check
      CHECK (role IN ('workspace_owner', 'workspace_member', 'workspace_viewer', 'delivery_owner', 'stakeholder'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore constraint without delivery_owner and stakeholder
    await queryRunner.query(`
      ALTER TABLE workspace_members
      DROP CONSTRAINT IF EXISTS workspace_members_role_check
    `);

    await queryRunner.query(`
      ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_role_check
      CHECK (role IN ('workspace_owner', 'workspace_member', 'workspace_viewer'))
    `);
  }
}
