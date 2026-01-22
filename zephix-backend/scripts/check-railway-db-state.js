require('dotenv').config();
const { Client } = require('pg');

async function checkDBState() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database\n');

    // Check what tables exist
    console.log('=== Existing Tables ===');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`Total tables: ${tables.rows.length}`);
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    // Check migrations table
    console.log('=== Migration Status ===');
    try {
      const migrations = await client.query(`
        SELECT * FROM migrations
        ORDER BY timestamp DESC
        LIMIT 20
      `);
      console.log(`Total migrations: ${migrations.rows.length}`);
      console.log('Recent migrations:');
      migrations.rows.forEach(m => {
        console.log(`  [${m.timestamp}] ${m.name}`);
      });

      // Check for Template Center v1 migrations
      const templateMigrations = migrations.rows.filter(m =>
        m.name.includes('Template') ||
        m.name.includes('template') ||
        m.timestamp >= 1769000000101
      );
      if (templateMigrations.length > 0) {
        console.log('\n✅ Template Center v1 migrations found:');
        templateMigrations.forEach(m => {
          console.log(`  [${m.timestamp}] ${m.name}`);
        });
      } else {
        console.log('\n❌ No Template Center v1 migrations found');
      }
    } catch (e) {
      console.log(`❌ Migrations table error: ${e.message}`);
    }
    console.log('');

    // Check project_templates table if it exists
    if (tables.rows.some(t => t.table_name === 'project_templates')) {
      console.log('=== Project Templates Table ===');
      const ptCount = await client.query('SELECT COUNT(*) FROM project_templates');
      console.log(`Project templates count: ${ptCount.rows[0].count}`);

      const ptColumns = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'project_templates'
        AND column_name = 'template_id'
      `);
      if (ptColumns.rows.length > 0) {
        console.log('✅ template_id column exists in project_templates');
        const linked = await client.query(`
          SELECT COUNT(*) FILTER (WHERE template_id IS NOT NULL) AS linked
          FROM project_templates
        `);
        console.log(`Linked project_templates: ${linked.rows[0].linked}`);
      } else {
        console.log('❌ template_id column does NOT exist in project_templates');
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkDBState();




