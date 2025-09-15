import { Client } from 'pg';

const testConnection = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Database connection successful');
    
    // Test query for organizations table
    const result = await client.query(`
      SELECT id, name, created_at, updated_at, trial_ends_at 
      FROM organizations 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    console.log('✅ Query successful:', result.rows);
    await client.end();
  } catch (error) {
    console.error('❌ Database error:', error);
  }
};

testConnection();
