const { Client } = require('pg');
require('dotenv').config();

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Checking database tables...');
    await client.connect();
    
    // Check what tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Tables in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if core tables exist
    const coreTables = ['users', 'organizations', 'projects', 'teams', 'feedback', 'waitlist'];
    const missingTables = coreTables.filter(table => 
      !result.rows.some(row => row.table_name === table)
    );
    
    if (missingTables.length > 0) {
      console.log('❌ Missing core tables:', missingTables);
    } else {
      console.log('✅ All core tables exist');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    process.exit(1);
  }
}

checkTables();
