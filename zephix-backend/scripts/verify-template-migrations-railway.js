require('dotenv').config();
const { Client } = require('pg');

async function verifyMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database\n');

    // 1. Templates table exists and has v1 columns
    console.log('=== 1. Templates Table ===');
    const templatesCount = await client.query('SELECT COUNT(*) FROM templates');
    console.log(`Templates count: ${templatesCount.rows[0].count}`);

    const templatesColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'templates'
      ORDER BY ordinal_position
    `);
    console.log('Templates columns:');
    templatesColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // 2. Lego blocks table exists and has v1 columns
    console.log('=== 2. Lego Blocks Table ===');
    const legoCount = await client.query('SELECT COUNT(*) FROM lego_blocks');
    console.log(`Lego blocks count: ${legoCount.rows[0].count}`);

    const legoColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'lego_blocks'
      ORDER BY ordinal_position
    `);
    console.log('Lego blocks columns:');
    legoColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // 3. Template blocks v1 table exists, legacy preserved when present
    console.log('=== 3. Template Blocks Tables ===');
    const v1Table = await client.query("SELECT to_regclass('public.template_blocks') AS v1_table");
    const legacyTable = await client.query("SELECT to_regclass('public.template_blocks_legacy') AS legacy_table");
    console.log(`template_blocks v1: ${v1Table.rows[0].v1_table || 'NOT EXISTS'}`);
    console.log(`template_blocks_legacy: ${legacyTable.rows[0].legacy_table || 'NOT EXISTS'}`);
    console.log('');

    // 4. Project templates mapping populated for org rows
    console.log('=== 4. Project Templates Mapping ===');
    const ptMapping = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE organization_id IS NOT NULL) AS pt_with_org,
        COUNT(*) FILTER (WHERE organization_id IS NOT NULL AND template_id IS NOT NULL) AS pt_with_org_and_template_id,
        COUNT(*) FILTER (WHERE organization_id IS NOT NULL AND template_id IS NULL) AS pt_with_org_missing_template_id
      FROM project_templates
    `);
    const mapping = ptMapping.rows[0];
    console.log(`Project templates with org: ${mapping.pt_with_org}`);
    console.log(`Project templates with org AND template_id: ${mapping.pt_with_org_and_template_id}`);
    console.log(`Project templates with org but MISSING template_id: ${mapping.pt_with_org_missing_template_id}`);
    console.log('');

    // 5. Template blocks migrated from legacy
    console.log('=== 5. Template Blocks Migration ===');
    const v1Blocks = await client.query('SELECT COUNT(*) AS v1_blocks FROM template_blocks');
    console.log(`Template blocks v1: ${v1Blocks.rows[0].v1_blocks}`);

    try {
      const legacyBlocks = await client.query('SELECT COUNT(*) AS legacy_blocks FROM template_blocks_legacy');
      console.log(`Template blocks legacy: ${legacyBlocks.rows[0].legacy_blocks}`);
    } catch (e) {
      console.log(`Template blocks legacy: Table does not exist (expected for fresh DB)`);
    }
    console.log('');

    // 6. Unmigrated legacy rows
    console.log('=== 6. Unmigrated Legacy Rows ===');
    try {
      const unmapped = await client.query(`
        SELECT COUNT(*) AS unmapped_legacy_rows
        FROM template_blocks_legacy tbleg
        LEFT JOIN project_templates pt ON pt.id = tbleg.template_id
        LEFT JOIN templates t ON t.id = pt.template_id
        WHERE t.id IS NULL
      `);
      console.log(`Unmapped legacy rows: ${unmapped.rows[0].unmapped_legacy_rows}`);
    } catch (e) {
      console.log(`Unmapped legacy rows: N/A (legacy table does not exist)`);
    }
    console.log('');

    // 7. Default enforcement sanity
    console.log('=== 7. Default Template Enforcement ===');
    const defaults = await client.query(`
      SELECT organization_id, COUNT(*) AS defaults
      FROM templates
      WHERE is_default = true
      AND organization_id IS NOT NULL
      GROUP BY organization_id
      HAVING COUNT(*) > 1
    `);
    if (defaults.rows.length === 0) {
      console.log('✅ No organizations with multiple defaults (good)');
    } else {
      console.log('❌ Organizations with multiple defaults:');
      defaults.rows.forEach(row => {
        console.log(`  - Org ${row.organization_id}: ${row.defaults} defaults`);
      });
    }
    console.log('');

    // 8. Non-system org guardrail enforced by CHECK
    console.log('=== 8. Non-System Org Guardrail ===');
    const violating = await client.query(`
      SELECT COUNT(*) AS violating_rows
      FROM templates
      WHERE (is_system = false OR is_system IS NULL)
      AND organization_id IS NULL
    `);
    const violatingCount = parseInt(violating.rows[0].violating_rows);
    if (violatingCount === 0) {
      console.log('✅ No non-system templates with null organization_id (good)');
    } else {
      console.log(`❌ Non-system templates with null org: ${violatingCount}`);
    }
    console.log('');

    // 9. Projects template snapshot columns
    console.log('=== 9. Projects Template Snapshot ===');
    const projectsColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name IN ('template_id', 'template_version', 'template_locked', 'template_snapshot')
      ORDER BY column_name
    `);
    console.log('Projects template snapshot columns:');
    if (projectsColumns.rows.length === 0) {
      console.log('  ❌ No template snapshot columns found');
    } else {
      projectsColumns.rows.forEach(col => {
        console.log(`  ✅ ${col.column_name}: ${col.data_type}`);
      });
    }
    console.log('');

    console.log('=== ✅ Verification Complete ===\n');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigrations();




