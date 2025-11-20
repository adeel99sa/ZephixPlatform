const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function testAuthService() {
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

    // Test user lookup (simulating the auth service)
    const email = 'test@example.com';
    const password = 'test123456';

    console.log('Testing auth service logic:');
    console.log('Email:', email);
    console.log('Password:', password);

    // Find user with organization (simulating the auth service query)
    const result = await client.query(
      'SELECT id, email, password, "firstName", "lastName", role, "isActive", "isEmailVerified", "organizationId" FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    console.log('User lookup result:', result.rows.length > 0 ? 'User found' : 'User not found');

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('User details:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      organizationId: user.organizationId
    });

    // Check password (simulating the auth service password check)
    console.log('Checking password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Password validation failed');
      return;
    }

    console.log('✅ Authentication successful!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testAuthService();
