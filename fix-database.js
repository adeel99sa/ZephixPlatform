const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    host: 'yamanote.proxy.rlwy.net',
    port: 24845,
    user: 'postgres',
    password: 'RRhnxMwmjPROoBcgaHZSczHAmkzvIQAZ', // From your environment variables
    database: 'railway',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Add missing columns
    const alterTableSQL = `
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean NOT NULL DEFAULT false;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" timestamp;
    `;

    await client.query(alterTableSQL);
    console.log('✅ Successfully added missing columns to users table');

    // Verify the columns exist
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('isEmailVerified', 'emailVerifiedAt')
      ORDER BY column_name;
    `);

    console.log('📋 Current columns in users table:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from database');
  }
}

fixDatabase();
