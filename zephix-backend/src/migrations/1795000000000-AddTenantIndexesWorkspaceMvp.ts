import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add tenant indexes for Workspace MVP tables
 *
 * Indexes added:
 * - workspaces: (organizationId, slug) - unique constraint if slug uniqueness per org is required
 * - projects: (organizationId, workspaceId) - for efficient workspace-scoped project queries
 *
 * Note: docs table is workspace-scoped only and does not have organizationId column,
 * so no tenant index is added for it.
 */
export class AddTenantIndexesWorkspaceMvp1795000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for workspaces: (organizationId, slug)
    // This supports efficient workspace lookup by slug within an organization
    // If slug uniqueness per org is already enforced via unique constraint, this index supports that
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workspaces_org_slug 
      ON workspaces(organization_id, slug);
    `);

    // Index for projects: (organizationId, workspaceId)
    // This supports efficient queries for projects within a workspace and organization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_org_workspace 
      ON projects(organization_id, workspace_id);
    `);

    // Note: docs table does not have organizationId column (workspace-scoped only)
    // Existing indexes on (workspaceId, createdAt) and (workspaceId, projectId) are sufficient
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_org_workspace;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_workspaces_org_slug;
    `);
  }
}
