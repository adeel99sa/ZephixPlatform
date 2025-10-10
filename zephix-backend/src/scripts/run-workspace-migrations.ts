import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

async function runWorkspaceMigrations() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    namingStrategy: new SnakeNamingStrategy(),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');
    
    // Check if columns already exist
    const checkColumns = await dataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workspaces' 
      AND column_name IN ('parent_workspace_id', 'workspace_type', 'hierarchy_level')
    `);
    
    const existingColumns = checkColumns.map((row: any) => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Run first migration - Add workspace hierarchy support
    if (!existingColumns.includes('parent_workspace_id')) {
      await dataSource.query(`
        ALTER TABLE workspaces 
        ADD COLUMN parent_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
      `);
      console.log('✅ Added parent_workspace_id column');
    } else {
      console.log('⏭️  parent_workspace_id column already exists');
    }
    
    if (!existingColumns.includes('workspace_type')) {
      await dataSource.query(`
        ALTER TABLE workspaces 
        ADD COLUMN workspace_type VARCHAR(50) DEFAULT 'standard';
      `);
      console.log('✅ Added workspace_type column');
    } else {
      console.log('⏭️  workspace_type column already exists');
    }
    
    if (!existingColumns.includes('hierarchy_level')) {
      await dataSource.query(`
        ALTER TABLE workspaces 
        ADD COLUMN hierarchy_level INT DEFAULT 0;
      `);
      console.log('✅ Added hierarchy_level column');
    } else {
      console.log('⏭️  hierarchy_level column already exists');
    }
    
    // Create indexes
    try {
      await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_workspaces_parent ON workspaces(parent_workspace_id);
      `);
      console.log('✅ Created parent index');
    } catch (error: any) {
      console.log('⏭️  Parent index already exists or error:', error.message);
    }
    
    try {
      await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_workspaces_hierarchy ON workspaces(organization_id, hierarchy_level);
      `);
      console.log('✅ Created hierarchy index');
    } catch (error: any) {
      console.log('⏭️  Hierarchy index already exists or error:', error.message);
    }
    
    // Run second migration - Create organization workspace config table
    const checkTable = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'organization_workspace_config'
    `);
    
    if (checkTable.length === 0) {
      await dataSource.query(`
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
      console.log('✅ Created organization_workspace_config table');
      
      // Create default config for existing organizations
      await dataSource.query(`
        INSERT INTO organization_workspace_config (organization_id)
        SELECT id FROM organizations;
      `);
      console.log('✅ Created default configs for existing organizations');
    } else {
      console.log('⏭️  organization_workspace_config table already exists');
    }
    
    console.log('🎉 All workspace migrations completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

runWorkspaceMigrations();
