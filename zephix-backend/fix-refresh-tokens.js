const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:IzCgTGNmVDQHunqICLyuUbMEtfWaSMmL@ballast.proxy.rlwy.net:38318/railway',
  ssl: { rejectUnauthorized: false }
});

async function fixRefreshTokens() {
  try {
    await client.connect();
    console.log('Connected to Railway database');

    // Add missing columns to refresh_tokens table
    const columns = [
      { name: 'token_hash', type: 'varchar(255)' },
      { name: 'jti', type: 'varchar(255)' },
      { name: 'device_name', type: 'varchar(255)' },
      { name: 'expires_at', type: 'TIMESTAMP' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT now()' }
    ];

    for (const column of columns) {
      try {
        await client.query(`ALTER TABLE "refresh_tokens" ADD COLUMN "${column.name}" ${column.type};`);
        console.log(`✅ Added ${column.name} column to refresh_tokens`);
      } catch (error) {
        if (error.code === '42701') {
          console.log(`⚠️ Column ${column.name} already exists`);
        } else {
          console.log(`❌ Error adding ${column.name}:`, error.message);
        }
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("userId");',
      'CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");',
      'CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_jti" ON "refresh_tokens" ("jti");'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log(`✅ Created index: ${indexQuery.split('"')[1]}`);
      } catch (error) {
        console.log(`⚠️ Index might already exist: ${error.message}`);
      }
    }

    console.log('🎉 Refresh tokens table fixed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixRefreshTokens();
