import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDelete1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding soft delete columns to all deletable entities...');

    // Add soft delete columns to all deletable entities
    const tables = [
      'projects',
      'tasks',
      'workspaces',
      'teams',
      'risks',
      'resources',
      'resource_allocations',
      'project_phases',
      'documents',
      'project_documents',
      'comments',
      'workflows',
      'approval_workflows',
      'project_templates'
    ];

    for (const table of tables) {
      try {
        // Check if table exists before adding columns
        const tableExists = await queryRunner.hasTable(table);
        if (!tableExists) {
          console.log(`⚠️  Table ${table} does not exist, skipping...`);
          continue;
        }

        // Add soft delete columns
        await queryRunner.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id)
        `);

        // Create index for faster queries
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_${table}_deleted 
          ON ${table}(deleted_at) 
          WHERE deleted_at IS NOT NULL
        `);

        console.log(`✅ Added soft delete columns to ${table}`);
      } catch (error) {
        console.log(`❌ Error adding soft delete to ${table}:`, error.message);
        // Continue with other tables even if one fails
      }
    }

    // Create organization_settings table for auto-purge configuration
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        trash_auto_purge_enabled BOOLEAN DEFAULT false,
        trash_auto_purge_days INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(organization_id)
      )
    `);

    console.log('✅ Created organization_settings table');

    // Create trash_items view for admin dashboard
    await queryRunner.query(`
      CREATE OR REPLACE VIEW trash_items AS
      SELECT 
        'project' as item_type,
        id,
        name as item_name,
        deleted_at,
        deleted_by,
        organization_id
      FROM projects WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT 
        'task' as item_type,
        id,
        title as item_name,
        deleted_at,
        deleted_by,
        organization_id
      FROM tasks WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT 
        'workspace' as item_type,
        id,
        name as item_name,
        deleted_at,
        deleted_by,
        organization_id
      FROM workspaces WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT 
        'team' as item_type,
        id,
        name as item_name,
        deleted_at,
        deleted_by,
        organization_id
      FROM teams WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT 
        'risk' as item_type,
        id,
        title as item_name,
        deleted_at,
        deleted_by,
        organization_id
      FROM risks WHERE deleted_at IS NOT NULL
    `);

    console.log('✅ Created trash_items view');
    console.log('🎉 Soft delete migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back soft delete migration...');

    // Drop trash_items view
    await queryRunner.query(`DROP VIEW IF EXISTS trash_items`);
    console.log('✅ Dropped trash_items view');

    // Drop organization_settings table
    await queryRunner.query(`DROP TABLE IF EXISTS organization_settings`);
    console.log('✅ Dropped organization_settings table');

    // Remove soft delete columns from all tables
    const tables = [
      'projects',
      'tasks',
      'workspaces',
      'teams',
      'risks',
      'resources',
      'resource_allocations',
      'project_phases',
      'documents',
      'project_documents',
      'comments',
      'workflows',
      'approval_workflows',
      'project_templates'
    ];

    for (const table of tables) {
      try {
        const tableExists = await queryRunner.hasTable(table);
        if (!tableExists) {
          console.log(`⚠️  Table ${table} does not exist, skipping...`);
          continue;
        }

        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS idx_${table}_deleted`);
        
        // Drop columns
        await queryRunner.query(`
          ALTER TABLE ${table} 
          DROP COLUMN IF EXISTS deleted_at,
          DROP COLUMN IF EXISTS deleted_by
        `);

        console.log(`✅ Removed soft delete columns from ${table}`);
      } catch (error) {
        console.log(`❌ Error removing soft delete from ${table}:`, error.message);
      }
    }

    console.log('🎉 Soft delete migration rollback completed!');
  }
}

