const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:IzCgTGNmVDQHunqICLyuUbMtfWaSMmL@ballast.proxy.rlwy.net:38318/railway'
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create workspaces table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        organization_id UUID NOT NULL,
        owner_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created workspaces table');

    // Add workspace_id column to projects table
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id UUID;
    `);
    console.log('Added workspace_id column to projects');

    // Add hierarchy tracking columns to projects
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS hierarchy_type VARCHAR(20) DEFAULT 'direct';
    `);
    console.log('Added hierarchy_type column to projects');

    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS hierarchy_path TEXT;
    `);
    console.log('Added hierarchy_path column to projects');

    // Create KPI cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS kpi_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        kpi_data JSONB NOT NULL,
        calculated_at TIMESTAMP DEFAULT NOW(),
        hierarchy_path TEXT,
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
        UNIQUE(entity_type, entity_id)
      );
    `);
    console.log('Created kpi_cache table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workspaces_organization_id ON workspaces(organization_id);
      CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
      CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON workspaces(is_active);
      CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_projects_hierarchy_type ON projects(hierarchy_type);
      CREATE INDEX IF NOT EXISTS idx_projects_hierarchy_path ON projects(hierarchy_path);
      CREATE INDEX IF NOT EXISTS idx_kpi_cache_entity_type ON kpi_cache(entity_type);
      CREATE INDEX IF NOT EXISTS idx_kpi_cache_entity_id ON kpi_cache(entity_id);
      CREATE INDEX IF NOT EXISTS idx_kpi_cache_calculated_at ON kpi_cache(calculated_at);
      CREATE INDEX IF NOT EXISTS idx_kpi_cache_expires_at ON kpi_cache(expires_at);
      CREATE INDEX IF NOT EXISTS idx_kpi_cache_hierarchy_path ON kpi_cache(hierarchy_path);
    `);
    console.log('Created indexes');

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.end();
  }
}

runMigrations();
















