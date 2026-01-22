require('dotenv').config();
const { execSync } = require('child_process');
const { Client } = require('pg');

async function forceRunMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database\n');

    // Check current migration count
    const current = await client.query('SELECT COUNT(*) FROM migrations');
    console.log(`Current migrations in DB: ${current.rows[0].count}\n`);

    // Get list of Template Center v1 migrations
    const migrations = [
      'AddTemplateV1Columns1769000000101',
      'AddLegoBlockV1Columns1769000000102',
      'CreateTemplateBlocksV11769000000103',
      'AddProjectTemplateSnapshot1769000000104',
      'AddTemplateIdToProjectTemplates1769000000105',
      'CreateAndLinkTemplatesFromProjectTemplates1769000000106',
      'BackfillTemplatesV1Fields1769000000107',
      'BackfillTemplateBlocksV11769000000108',
    ];

    // Check which ones are already run
    const existing = await client.query('SELECT name FROM migrations WHERE name = ANY($1)', [migrations]);
    const existingNames = existing.rows.map(r => r.name);
    const pending = migrations.filter(m => !existingNames.includes(m));

    console.log(`Pending migrations: ${pending.length}`);
    pending.forEach(m => console.log(`  - ${m}`));
    console.log('');

    if (pending.length === 0) {
      console.log('✅ All Template Center v1 migrations already executed');
      await client.end();
      return;
    }

    console.log('Running migrations via TypeORM...\n');
    await client.end();

    // Run migrations
    execSync('npm run typeorm migration:run -- -d src/config/data-source.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log('\n✅ Migrations complete. Verifying...\n');

    // Reconnect and verify
    const verifyClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
    });
    await verifyClient.connect();
    const after = await verifyClient.query('SELECT name FROM migrations WHERE name = ANY($1) ORDER BY timestamp', [migrations]);
    console.log(`Executed migrations: ${after.rows.length}`);
    after.rows.forEach(r => console.log(`  ✅ ${r.name}`));
    await verifyClient.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

forceRunMigrations();




