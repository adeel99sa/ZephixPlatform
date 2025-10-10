import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFolders1759522000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create folders table
    await queryRunner.query(`
      CREATE TABLE workspace_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        parent_folder_id UUID REFERENCES workspace_folders(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7), 
        icon VARCHAR(50),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        created_by UUID NOT NULL REFERENCES users(id),
        hierarchy_depth INT DEFAULT 0,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        deleted_by UUID REFERENCES users(id),
        
        CONSTRAINT max_folder_depth CHECK (hierarchy_depth <= 3),
        CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$' OR color IS NULL)
      );
    `);

    // Add folder_id to projects table
    await queryRunner.query(`
      ALTER TABLE projects 
      ADD COLUMN folder_id UUID REFERENCES workspace_folders(id) ON DELETE SET NULL;
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_folders_workspace ON workspace_folders(workspace_id);
      CREATE INDEX idx_folders_parent ON workspace_folders(parent_folder_id);
      CREATE INDEX idx_folders_org ON workspace_folders(organization_id);
      CREATE INDEX idx_projects_folder ON projects(folder_id);
      CREATE INDEX idx_folders_deleted ON workspace_folders(deleted_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_folders_deleted;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_folder;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_folders_org;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_folders_parent;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_folders_workspace;`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN folder_id;`);
    await queryRunner.query(`DROP TABLE workspace_folders;`);
  }
}
