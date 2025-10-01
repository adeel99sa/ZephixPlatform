const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:IzCgTGNmVDQHunqICLyuUbMEtfWaSMmL@ballast.proxy.rlwy.net:38318/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkUsersTable() {
  try {
    await client.connect();
    console.log('Connected to Railway database');

    // Check users table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);

    console.log('Users table structure:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check if users table has id column
    const hasId = result.rows.some(row => row.column_name === 'id');
    console.log(`\nUsers table has 'id' column: ${hasId}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkUsersTable();
