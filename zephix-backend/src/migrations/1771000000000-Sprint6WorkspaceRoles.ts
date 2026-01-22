import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 6: Extend workspace roles to include delivery_owner and stakeholder
 *
 * Backfill rule:
 * - workspace_owner and workspace_member -> delivery_owner
 * - workspace_viewer -> stakeholder
 */
export class Sprint6WorkspaceRoles1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill existing roles
    await queryRunner.query(`
      UPDATE workspace_members
      SET role = CASE
        WHEN role = 'workspace_owner' THEN 'delivery_owner'
        WHEN role = 'workspace_member' THEN 'delivery_owner'
        WHEN role = 'workspace_viewer' THEN 'stakeholder'
        ELSE role
      END
      WHERE role IN ('workspace_owner', 'workspace_member', 'workspace_viewer')
    `);

    // Update the CHECK constraint to include new roles
    await queryRunner.query(`
      ALTER TABLE workspace_members
      DROP CONSTRAINT IF EXISTS workspace_members_role_check
    `);

    await queryRunner.query(`
      ALTER TABLE workspace_members
      ADD CONSTRAINT workspace_members_role_check
      CHECK (role IN ('workspace_owner', 'workspace_member', 'workspace_viewer', 'delivery_owner', 'stakeholder'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert roles back (approximate - we can't perfectly restore original)
    await queryRunner.query(`
      UPDATE workspace_members
      SET role = CASE
        WHEN role = 'delivery_owner' THEN 'workspace_member'
        WHEN role = 'stakeholder' THEN 'workspace_viewer'
        ELSE role
      END
      WHERE role IN ('delivery_owner', 'stakeholder')
    `);

    // Restore old constraint
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
