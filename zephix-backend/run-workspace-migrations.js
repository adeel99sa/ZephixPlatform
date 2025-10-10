const { Client } = require('pg');

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if columns already exist
    const checkWorkspaces = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workspaces' 
      AND column_name IN ('parent_workspace_id', 'workspace_type', 'hierarchy_level')
    `);

    if (checkWorkspaces.rows.length === 0) {
      console.log('Adding workspace hierarchy columns...');
      
      // Add parent_workspace_id for hierarchy
      await client.query(`
        ALTER TABLE workspaces 
        ADD COLUMN parent_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
      `);

      // Add workspace_type to distinguish levels
      await client.query(`
        ALTER TABLE workspaces 
        ADD COLUMN workspace_type VARCHAR(50) DEFAULT 'standard';
      `);

      // Add level indicator (0 = root, 1 = child, 2 = grandchild, etc)
      await client.query(`
        ALTER TABLE workspaces 
        ADD COLUMN hierarchy_level INT DEFAULT 0;
      `);

      // Add index for parent lookups
      await client.query(`
        CREATE INDEX idx_workspaces_parent ON workspaces(parent_workspace_id);
      `);

      // Add index for hierarchy queries
      await client.query(`
        CREATE INDEX idx_workspaces_hierarchy ON workspaces(organization_id, hierarchy_level);
      `);

      console.log('✅ Workspace hierarchy columns added');
    } else {
      console.log('✅ Workspace hierarchy columns already exist');
    }

    // Check if organization_workspace_config table exists
    const checkConfigTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'organization_workspace_config'
    `);

    if (checkConfigTable.rows.length === 0) {
      console.log('Creating organization_workspace_config table...');
      
      await client.query(`
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

      // Create default config for existing organizations
      await client.query(`
        INSERT INTO organization_workspace_config (organization_id)
        SELECT id FROM organizations;
      `);

      console.log('✅ organization_workspace_config table created');
    } else {
      console.log('✅ organization_workspace_config table already exists');
    }

    // Verify the changes
    console.log('\nVerifying changes...');
    
    const workspaceColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'workspaces' 
      AND column_name IN ('parent_workspace_id', 'workspace_type', 'hierarchy_level')
      ORDER BY column_name
    `);
    
    console.log('Workspace columns:');
    workspaceColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

    const configTable = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'organization_workspace_config'
      ORDER BY column_name
    `);
    
    console.log('\nOrganization workspace config table columns:');
    configTable.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ All migrations completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();