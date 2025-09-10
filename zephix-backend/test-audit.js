const { Client } = require('pg');

async function testAudit() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check if audit_logs table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    
    console.log('Audit logs table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Count audit logs
      const count = await client.query('SELECT COUNT(*) FROM audit_logs');
      console.log('Audit logs count:', count.rows[0].count);
      
      // Get recent audit logs
      const recent = await client.query(`
        SELECT action, entity_type, created_at 
        FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('Recent audit logs:');
      recent.rows.forEach(row => {
        console.log(`- ${row.action} on ${row.entity_type} at ${row.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testAudit();
