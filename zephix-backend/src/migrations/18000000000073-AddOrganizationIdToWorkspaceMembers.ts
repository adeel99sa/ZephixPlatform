import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WorkspaceMember entity requires organization_id for tenancy; early workspace_members
 * migrations never added it. Inserts from createWithOwners() then fail at Postgres with
 * "column organization_id does not exist", surfaced as 400 WORKSPACE_CREATION_FAILED.
 */
export class AddOrganizationIdToWorkspaceMembers18000000000073
  implements MigrationInterface
{
  name = 'AddOrganizationIdToWorkspaceMembers18000000000073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'workspace_members'
            AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE workspace_members
            ADD COLUMN organization_id uuid;

          UPDATE workspace_members wm
          SET organization_id = w.organization_id
          FROM workspaces w
          WHERE wm.workspace_id = w.id
            AND wm.organization_id IS NULL;

          DELETE FROM workspace_members WHERE organization_id IS NULL;

          ALTER TABLE workspace_members
            ALTER COLUMN organization_id SET NOT NULL;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_workspace_members_organization'
          ) THEN
            ALTER TABLE workspace_members
              ADD CONSTRAINT fk_workspace_members_organization
              FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
          END IF;

          CREATE INDEX IF NOT EXISTS idx_workspace_members_organization_id
            ON workspace_members(organization_id);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'workspace_members'
            AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE workspace_members
            DROP CONSTRAINT IF EXISTS fk_workspace_members_organization;
          DROP INDEX IF EXISTS idx_workspace_members_organization_id;
          ALTER TABLE workspace_members DROP COLUMN organization_id;
        END IF;
      END $$;
    `);
  }
}
