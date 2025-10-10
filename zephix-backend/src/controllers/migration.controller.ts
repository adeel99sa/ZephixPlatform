import { Controller, Post, UseGuards, Body, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../modules/auth/guards/admin.guard';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('migrations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MigrationController {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  @Post('workspace-hierarchy')
  async runWorkspaceHierarchyMigration() {
    try {
      console.log('🚀 Starting workspace hierarchy migration...');
      
      // Check if columns already exist
      const checkColumns = await this.dataSource.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'workspaces' 
        AND column_name IN ('parent_workspace_id', 'workspace_type', 'hierarchy_level', 'created_by')
      `);
      
      const existingColumns = checkColumns.map((row: any) => row.column_name);
      console.log('Existing columns:', existingColumns);
      
      const results = [];
      
      // Run first migration - Add workspace hierarchy support
      if (!existingColumns.includes('parent_workspace_id')) {
        await this.dataSource.query(`
          ALTER TABLE workspaces 
          ADD COLUMN parent_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
        `);
        results.push('✅ Added parent_workspace_id column');
        console.log('✅ Added parent_workspace_id column');
      } else {
        results.push('⏭️  parent_workspace_id column already exists');
        console.log('⏭️  parent_workspace_id column already exists');
      }
      
      if (!existingColumns.includes('workspace_type')) {
        await this.dataSource.query(`
          ALTER TABLE workspaces 
          ADD COLUMN workspace_type VARCHAR(50) DEFAULT 'standard';
        `);
        results.push('✅ Added workspace_type column');
        console.log('✅ Added workspace_type column');
      } else {
        results.push('⏭️  workspace_type column already exists');
        console.log('⏭️  workspace_type column already exists');
      }
      
      if (!existingColumns.includes('hierarchy_level')) {
        await this.dataSource.query(`
          ALTER TABLE workspaces 
          ADD COLUMN hierarchy_level INT DEFAULT 0;
        `);
        results.push('✅ Added hierarchy_level column');
        console.log('✅ Added hierarchy_level column');
      } else {
        results.push('⏭️  hierarchy_level column already exists');
        console.log('⏭️  hierarchy_level column already exists');
      }
      
      if (!existingColumns.includes('created_by')) {
        await this.dataSource.query(`
          ALTER TABLE workspaces 
          ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
        `);
        results.push('✅ Added created_by column');
        console.log('✅ Added created_by column');
      } else {
        results.push('⏭️  created_by column already exists');
        console.log('⏭️  created_by column already exists');
      }
      
      // Create indexes
      try {
        await this.dataSource.query(`
          CREATE INDEX IF NOT EXISTS idx_workspaces_parent ON workspaces(parent_workspace_id);
        `);
        results.push('✅ Created parent index');
        console.log('✅ Created parent index');
      } catch (error: any) {
        results.push('⏭️  Parent index already exists or error: ' + error.message);
        console.log('⏭️  Parent index already exists or error:', error.message);
      }
      
      try {
        await this.dataSource.query(`
          CREATE INDEX IF NOT EXISTS idx_workspaces_hierarchy ON workspaces(organization_id, hierarchy_level);
        `);
        results.push('✅ Created hierarchy index');
        console.log('✅ Created hierarchy index');
      } catch (error: any) {
        results.push('⏭️  Hierarchy index already exists or error: ' + error.message);
        console.log('⏭️  Hierarchy index already exists or error:', error.message);
      }
      
      // Run second migration - Create organization workspace config table
      const checkTable = await this.dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'organization_workspace_config'
      `);
      
      if (checkTable.length === 0) {
        await this.dataSource.query(`
          CREATE TABLE organization_workspace_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            max_depth INT DEFAULT 2,
            level_0_label VARCHAR(50) DEFAULT 'Workspace',
            level_1_label VARCHAR(50) DEFAULT 'Sub-workspace',
            level_2_label VARCHAR(50) DEFAULT 'Project',
            allow_projects_at_all_levels BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(organization_id)
          );
        `);
        results.push('✅ Created organization_workspace_config table');
        console.log('✅ Created organization_workspace_config table');
        
        // Create default config for existing organizations
        await this.dataSource.query(`
          INSERT INTO organization_workspace_config (organization_id)
          SELECT id FROM organizations;
        `);
        results.push('✅ Created default configs for existing organizations');
        console.log('✅ Created default configs for existing organizations');
      } else {
        results.push('⏭️  organization_workspace_config table already exists');
        console.log('⏭️  organization_workspace_config table already exists');
      }
      
      console.log('🎉 All workspace migrations completed successfully!');
      
      // Test the organization_workspace_config table
      try {
        const testQuery = await this.dataSource.query(`
          SELECT * FROM organization_workspace_config LIMIT 1;
        `);
        results.push('✅ organization_workspace_config table is accessible');
        console.log('✅ organization_workspace_config table is accessible');
      } catch (error: any) {
        results.push('❌ organization_workspace_config table error: ' + error.message);
        console.log('❌ organization_workspace_config table error:', error.message);
      }
      
      return {
        success: true,
        message: 'Workspace hierarchy migration completed successfully',
        results: results
      };
      
    } catch (error: any) {
      console.error('❌ Migration error:', error.message);
      console.error('Full error:', error);
      
      return {
        success: false,
        message: 'Migration failed: ' + error.message,
        error: error.message
      };
    }
  }

  @Post('folders')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async runFoldersMigration() {
    const results = [];
    
    try {
      // Check if workspace_folders table exists
      const tableExists = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'workspace_folders'
        );
      `);
      
      if (!tableExists[0].exists) {
        // Create workspace_folders table
        await this.dataSource.query(`
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
        results.push('✅ Created workspace_folders table');
        console.log('✅ Created workspace_folders table');
      } else {
        results.push('⏭️  workspace_folders table already exists');
        console.log('⏭️  workspace_folders table already exists');
      }

      // Check if folder_id column exists in projects table
      const columnExists = await this.dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'projects' 
          AND column_name = 'folder_id'
        );
      `);
      
      if (!columnExists[0].exists) {
        // Add folder_id to projects table
        await this.dataSource.query(`
          ALTER TABLE projects 
          ADD COLUMN folder_id UUID REFERENCES workspace_folders(id) ON DELETE SET NULL;
        `);
        results.push('✅ Added folder_id column to projects table');
        console.log('✅ Added folder_id column to projects table');
      } else {
        results.push('⏭️  folder_id column already exists in projects table');
        console.log('⏭️  folder_id column already exists in projects table');
      }

      // Create indexes
      const indexes = [
        { name: 'idx_folders_workspace', query: 'CREATE INDEX IF NOT EXISTS idx_folders_workspace ON workspace_folders(workspace_id);' },
        { name: 'idx_folders_parent', query: 'CREATE INDEX IF NOT EXISTS idx_folders_parent ON workspace_folders(parent_folder_id);' },
        { name: 'idx_folders_org', query: 'CREATE INDEX IF NOT EXISTS idx_folders_org ON workspace_folders(organization_id);' },
        { name: 'idx_projects_folder', query: 'CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);' },
        { name: 'idx_folders_deleted', query: 'CREATE INDEX IF NOT EXISTS idx_folders_deleted ON workspace_folders(deleted_at);' }
      ];

      for (const index of indexes) {
        try {
          await this.dataSource.query(index.query);
          results.push(`✅ Created ${index.name} index`);
          console.log(`✅ Created ${index.name} index`);
        } catch (error: any) {
          results.push(`⏭️  ${index.name} index already exists or error: ${error.message}`);
          console.log(`⏭️  ${index.name} index already exists or error:`, error.message);
        }
      }

    } catch (error: any) {
      console.error('❌ Folders migration error:', error);
      results.push(`❌ Migration error: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'Folders migration completed successfully',
      results
    };
  }

  @Post('update-project-workspace')
  async updateProjectWorkspace(@Body() body: { projectId: string; workspaceId: string }, @Request() req) {
    try {
      // Update project workspace
      await this.dataSource.query(`
        UPDATE projects 
        SET workspace_id = $1, updated_at = NOW()
        WHERE id = $2 AND organization_id = $3
      `, [body.workspaceId, body.projectId, req.user.organizationId]);

      return { success: true, message: 'Project workspace updated successfully' };
    } catch (error: any) {
      console.error('Error updating project workspace:', error);
      return { success: false, error: error.message };
    }
  }
}
