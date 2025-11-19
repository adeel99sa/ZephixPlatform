import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function verifyDatabase() {
  console.log('🔍 Starting database verification...\n');

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

    // Check if project_templates table exists
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'project_templates'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('❌ Table project_templates does NOT exist');
      console.log('\n📝 Need to create table with migration');
      await dataSource.destroy();
      return;
    }

    console.log('✅ Table project_templates exists\n');

    // Get current table structure
    const columns = await dataSource.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'project_templates'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Current table structure:');
    console.log('═══════════════════════════════════════════════════════════');
    columns.forEach((col: any) => {
      console.log(`Column: ${col.column_name}`);
      console.log(`  Type: ${col.data_type}`);
      console.log(`  Nullable: ${col.is_nullable}`);
      console.log(`  Default: ${col.column_default || 'none'}`);
      console.log('─────────────────────────────────────────────────────────');
    });

    // Required columns for our entity
    const requiredColumns: Record<string, { type: string; nullable: string }> =
      {
        id: { type: 'uuid', nullable: 'NO' },
        name: { type: 'character varying', nullable: 'NO' },
        description: { type: 'text', nullable: 'YES' },
        methodology: { type: 'character varying', nullable: 'NO' },
        phases: { type: 'jsonb', nullable: 'YES' },
        task_templates: { type: 'jsonb', nullable: 'YES' },
        available_kpis: { type: 'jsonb', nullable: 'YES' },
        default_enabled_kpis: { type: 'ARRAY', nullable: 'YES' },
        scope: { type: 'character varying', nullable: 'NO' },
        team_id: { type: 'uuid', nullable: 'YES' },
        organization_id: { type: 'uuid', nullable: 'YES' },
        created_by_id: { type: 'uuid', nullable: 'YES' },
        is_default: { type: 'boolean', nullable: 'NO' },
        is_system: { type: 'boolean', nullable: 'NO' },
        created_at: { type: 'timestamp with time zone', nullable: 'NO' },
        updated_at: { type: 'timestamp with time zone', nullable: 'NO' },
      };

    console.log('\n📋 Checking required columns...\n');

    const existingColumnNames = columns.map((c: any) => c.column_name);
    const missingColumns: string[] = [];
    const wrongTypeColumns: string[] = [];

    for (const [colName, requirements] of Object.entries(requiredColumns)) {
      const existing = columns.find((c: any) => c.column_name === colName);

      if (!existing) {
        missingColumns.push(colName);
        console.log(`❌ MISSING: ${colName}`);
      } else {
        // Check type match (simplified check)
        const typeMatch =
          existing.data_type.includes(requirements.type) ||
          requirements.type.includes(existing.data_type) ||
          (requirements.type === 'ARRAY' && existing.data_type === 'ARRAY') ||
          (requirements.type === 'character varying' &&
            existing.data_type === 'character varying');

        if (!typeMatch) {
          wrongTypeColumns.push(
            `${colName} (expected: ${requirements.type}, got: ${existing.data_type})`,
          );
          console.log(
            `⚠️  WRONG TYPE: ${colName} - expected ${requirements.type}, got ${existing.data_type}`,
          );
        } else {
          console.log(`✅ OK: ${colName}`);
        }
      }
    }

    // Generate SQL to fix issues
    if (missingColumns.length > 0 || wrongTypeColumns.length > 0) {
      console.log('\n🔧 FIXES NEEDED:\n');
      console.log('Run this SQL to fix the database:\n');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );

      if (missingColumns.length > 0) {
        console.log('-- Add missing columns:');
        console.log('');

        const columnSQL: Record<string, string> = {
          phases: "ADD COLUMN phases JSONB DEFAULT '[]'",
          task_templates: "ADD COLUMN task_templates JSONB DEFAULT '[]'",
          available_kpis: "ADD COLUMN available_kpis JSONB DEFAULT '[]'",
          default_enabled_kpis:
            "ADD COLUMN default_enabled_kpis TEXT[] DEFAULT '{}'",
          scope: "ADD COLUMN scope VARCHAR(50) DEFAULT 'organization'",
          team_id: 'ADD COLUMN team_id UUID NULL',
          created_by_id: 'ADD COLUMN created_by_id UUID NULL',
          is_default: 'ADD COLUMN is_default BOOLEAN DEFAULT false',
          is_system: 'ADD COLUMN is_system BOOLEAN DEFAULT false',
          description: 'ADD COLUMN description TEXT NULL',
        };

        console.log('ALTER TABLE project_templates');
        missingColumns.forEach((col, index) => {
          const sql = columnSQL[col];
          if (sql) {
            console.log(
              `  ${sql}${index < missingColumns.length - 1 ? ',' : ';'}`,
            );
          }
        });
        console.log('');

        // Add NOT NULL constraints after adding columns
        const notNullColumns = missingColumns.filter((col) =>
          ['scope', 'is_default', 'is_system'].includes(col),
        );

        if (notNullColumns.length > 0) {
          console.log('-- Add NOT NULL constraints:');
          console.log('ALTER TABLE project_templates');
          notNullColumns.forEach((col, index) => {
            console.log(
              `  ALTER COLUMN ${col} SET NOT NULL${index < notNullColumns.length - 1 ? ',' : ';'}`,
            );
          });
          console.log('');
        }
      }

      console.log(
        '═══════════════════════════════════════════════════════════\n',
      );
    } else {
      console.log('\n✅ ALL REQUIRED COLUMNS EXIST WITH CORRECT TYPES\n');
    }

    // Check indexes
    const indexes = await dataSource.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'project_templates';
    `);

    console.log('📑 Existing indexes:');
    if (indexes.length === 0) {
      console.log('  No indexes found (consider adding for performance)');
    } else {
      indexes.forEach((idx: any) => {
        console.log(`  ✅ ${idx.indexname}`);
      });
    }

    // Check for existing data
    const count = await dataSource.query(`
      SELECT COUNT(*) as count FROM project_templates;
    `);

    console.log(`\n📊 Existing records: ${count[0].count}`);

    if (parseInt(count[0].count) > 0) {
      const templates = await dataSource.query(`
        SELECT id, name, methodology, is_system, organization_id
        FROM project_templates
        LIMIT 5;
      `);

      console.log('\n📋 Sample templates:');
      templates.forEach((t: any) => {
        console.log(
          `  - ${t.name} (${t.methodology}) ${t.is_system ? '[SYSTEM]' : '[ORG]'}`,
        );
      });
    } else {
      console.log('  ℹ️  No templates yet - need to run seed');
    }

    await dataSource.destroy();
    console.log('\n✅ Verification complete\n');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

verifyDatabase();
