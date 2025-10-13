import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueRootFolderConstraintAndBackfill1734120000000 implements MigrationInterface {
  name = 'AddUniqueRootFolderConstraintAndBackfill1734120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add a partial unique index on workspace_folders(workspace_id) where parent_folder_id IS NULL AND deleted_at IS NULL
    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_workspace_folders_root_per_workspace" 
      ON "workspace_folders" ("workspace_id") 
      WHERE "parent_folder_id" IS NULL AND "deleted_at" IS NULL
    `);

    // 2. Backfill: for each workspace missing a root, insert a root row
    await queryRunner.query(`
      WITH workspaces_missing_root AS (
        SELECT w.id as workspace_id, w.organization_id, w.created_by
        FROM workspaces w
        LEFT JOIN workspace_folders f ON f.workspace_id = w.id AND f.parent_folder_id IS NULL AND f.deleted_at IS NULL
        WHERE f.id IS NULL
      )
      INSERT INTO workspace_folders (id, workspace_id, organization_id, created_by, name, parent_folder_id, created_at, updated_at)
      SELECT 
        gen_random_uuid(),
        workspace_id,
        organization_id,
        COALESCE(created_by, (SELECT id FROM users WHERE organization_id = wmr.organization_id LIMIT 1)),
        'Root',
        NULL,
        NOW(),
        NOW()
      FROM workspaces_missing_root wmr
    `);

    // 3. For users with current_workspace_id IS NULL but belong to an org with at least 1 workspace, set current_workspace_id = earliest workspace for their org
    await queryRunner.query(`
      UPDATE users 
      SET current_workspace_id = (
        SELECT w.id 
        FROM workspaces w 
        WHERE w.organization_id = users.organization_id 
        ORDER BY w.created_at ASC 
        LIMIT 1
      )
      WHERE current_workspace_id IS NULL 
      AND organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM workspaces w WHERE w.organization_id = users.organization_id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_workspace_folders_root_per_workspace"`);
    
    // Note: We don't delete any data in the down migration to avoid data loss
  }
}
