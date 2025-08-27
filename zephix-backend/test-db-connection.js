const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Testing database connection...');
    console.log('📊 Environment:', process.env.NODE_ENV);
    console.log('🌐 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    await client.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('📊 Database Info:');
    console.log('  - Database:', result.rows[0].current_database);
    console.log('  - User:', result.rows[0].current_user);
    console.log('  - Version:', result.rows[0].version.split(' ')[0]);
    
    await client.end();
    console.log('🔌 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Error details:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Tip: Check if DATABASE_URL is correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Tip: Check if database is running and accessible');
    } else if (error.code === '28P01') {
      console.log('💡 Tip: Check database credentials');
    }
    
    process.exit(1);
  }
}

testConnection();
