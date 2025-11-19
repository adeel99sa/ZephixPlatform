import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToProjects1762000000000
  implements MigrationInterface
{
  name = 'AddWorkspaceIdToProjects1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column (nullable for now to handle existing data)
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN workspace_id uuid
    `);

    // For existing projects, assign to first workspace in org (if exists)
    // This is a safe default that prevents data loss
    await queryRunner.query(`
      UPDATE projects p
      SET workspace_id = (
        SELECT w.id
        FROM workspaces w
        WHERE w.organization_id = p.organization_id
        LIMIT 1
      )
      WHERE p.workspace_id IS NULL
    `);

    // Now make it NOT NULL if you want strict enforcement
    // Uncomment the next line if you want to enforce workspace_id after backfill
    // await queryRunner.query(`ALTER TABLE projects ALTER COLUMN workspace_id SET NOT NULL`);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_workspace_id
      ON projects(workspace_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_org_ws
      ON projects(organization_id, workspace_id)
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE projects
      ADD CONSTRAINT fk_projects_workspace
      FOREIGN KEY (workspace_id)
      REFERENCES workspaces(id)
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK first
    await queryRunner.query(`
      ALTER TABLE projects
      DROP CONSTRAINT IF EXISTS fk_projects_workspace
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_org_ws
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_workspace_id
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE projects
      DROP COLUMN workspace_id
    `);
  }
}
