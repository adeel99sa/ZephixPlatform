const { Client } = require('pg');

async function checkMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Check if migrations table exists
    const migrationTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'migrations'
    `);
    
    console.log('Migration table exists:', migrationTableCheck.rows.length > 0);
    
    if (migrationTableCheck.rows.length > 0) {
      // Check migration history
      const migrations = await client.query('SELECT * FROM migrations ORDER BY timestamp');
      console.log('Migration history:');
      console.log(migrations.rows);
    }
    
    // Check if roles table exists
    const rolesTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'roles'
    `);
    
    console.log('Roles table exists:', rolesTableCheck.rows.length > 0);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkMigrations();
