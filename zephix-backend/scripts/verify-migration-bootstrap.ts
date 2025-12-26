import { Client } from 'pg';

async function verifyBootstrap() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  console.log('🔍 Verifying Bootstrap Migration Results\n');

  // Step 1: Check core tables exist
  console.log('Step 1: Checking core tables...');
  const tables = [
    'organizations',
    'users',
    'user_organizations',
    'workspaces',
    'projects',
  ];

  for (const table of tables) {
    const result = await client.query(
      `SELECT to_regclass($1) AS exists`,
      [`public.${table}`]
    );
    const exists = result.rows[0]?.exists;
    console.log(`  ${exists ? '✅' : '❌'} ${table}: ${exists || 'MISSING'}`);
  }

  // Step 2: Check migrations executed
  console.log('\nStep 2: Checking migrations...');
  try {
    const migrationCount = await client.query(
      `SELECT COUNT(*)::int AS count FROM migrations`
    );
    console.log(`  Migrations executed: ${migrationCount.rows[0].count}`);

    const recentMigrations = await client.query(
      `SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 10`
    );
    console.log('  Recent migrations:');
    recentMigrations.rows.forEach((row: any) => {
      console.log(`    - ${row.name}`);
    });
  } catch (e) {
    console.log('  ⚠️  Migrations table not found or empty');
  }

  // Step 3: Verify no test users
  console.log('\nStep 3: Checking for test users (should be none)...');
  const testUsers = await client.query(
    `SELECT id, email FROM users WHERE email = 'test@zephix.com'`
  );
  if (testUsers.rows.length > 0) {
    console.log('  ❌ Found test users (should be removed):');
    testUsers.rows.forEach((row: any) => {
      console.log(`    - ${row.email} (${row.id})`);
    });
  } else {
    console.log('  ✅ No test users found');
  }

  // Step 4: Check user_organizations structure
  console.log('\nStep 4: Verifying user_organizations structure...');
  try {
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_organizations'
      ORDER BY ordinal_position
    `);
    console.log('  Columns:');
    columns.rows.forEach((row: any) => {
      console.log(`    - ${row.column_name} (${row.data_type})`);
    });
  } catch (e) {
    console.log('  ⚠️  Could not check user_organizations structure');
  }

  // Step 5: Check users.organization_id (should exist but no FK)
  console.log('\nStep 5: Checking users.organization_id (legacy, deprecated)...');
  try {
    const fkCheck = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'users'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'organization_id'
    `);

    if (fkCheck.rows.length > 0) {
      console.log('  ⚠️  Found FK constraint on users.organization_id (should be removed)');
      fkCheck.rows.forEach((row: any) => {
        console.log(`    - ${row.constraint_name}`);
      });
    } else {
      console.log('  ✅ No FK constraint on users.organization_id (correct - user_organizations is source of truth)');
    }
  } catch (e) {
    console.log('  ⚠️  Could not check FK constraints');
  }

  await client.end();
  console.log('\n✅ Verification complete');
}

verifyBootstrap().catch((e) => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});

