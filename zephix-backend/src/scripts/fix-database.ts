import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function fixDatabase() {
  console.log('🔧 Starting database fix...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // IMPORTANT: This SQL will be generated based on verification results
    // This is the complete fix based on our entity

    const fixSQL = `
      -- Add missing columns if they don't exist
      ALTER TABLE project_templates
        ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS task_templates JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS available_kpis JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS default_enabled_kpis TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS scope VARCHAR(50) DEFAULT 'organization',
        ADD COLUMN IF NOT EXISTS team_id UUID NULL,
        ADD COLUMN IF NOT EXISTS created_by_id UUID NULL,
        ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

      -- Add NOT NULL constraints where needed (after adding columns with defaults)
      ALTER TABLE project_templates
        ALTER COLUMN scope SET NOT NULL,
        ALTER COLUMN is_default SET NOT NULL,
        ALTER COLUMN is_system SET NOT NULL;

      -- Create indexes if they don't exist
      CREATE INDEX IF NOT EXISTS idx_templates_scope ON project_templates(scope);
    `;

    console.log('📝 Executing fix SQL...\n');
    await dataSource.query(fixSQL);
    console.log('✅ Database structure updated\n');

    // Verify fix
    const columns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'project_templates'
      ORDER BY ordinal_position;
    `);

    console.log('✅ Updated columns:');
    columns.forEach((col: any) => {
      console.log(
        `  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '[NULLABLE]' : '[NOT NULL]'}`,
      );
    });

    await dataSource.destroy();
    console.log('\n✅ Database fix complete\n');
  } catch (error) {
    console.error('❌ Fix failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

fixDatabase();
