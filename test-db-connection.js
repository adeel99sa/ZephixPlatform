const { Client } = require('pg');

async function testDbConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'zephix_user',
    password: 'zephix_password',
    database: 'zephix_auth_db'
  });

  try {
    await client.connect();
    console.log('✅ Database connection successful');

    // Test user lookup
    const result = await client.query(
      'SELECT id, email, "firstName", "lastName", role, "isActive", "isEmailVerified", "organizationId" FROM users WHERE email = $1',
      ['test@example.com']
    );

    console.log('User lookup result:', result.rows);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Found user:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        organizationId: user.organizationId
      });
    } else {
      console.log('❌ No user found with email test@example.com');
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await client.end();
  }
}

testDbConnection();
