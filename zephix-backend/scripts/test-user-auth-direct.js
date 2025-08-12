#!/usr/bin/env node

const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function testUserAuthDirect() {
  console.log('🔐 Testing User Authentication Directly...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully!');

    const testEmail = 'adeel99sa@yahoo.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'test123';

    console.log(`\n📧 Testing authentication for: ${testEmail}`);

    // 1. Check if user exists and is verified
    console.log('\n1️⃣  Checking user existence and verification status...');
    const userQuery = await client.query(`
      SELECT id, email, password, "firstName", "lastName", "isActive", "isEmailVerified", "emailVerifiedAt"
      FROM users 
      WHERE email = $1
    `, [testEmail]);

    if (userQuery.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userQuery.rows[0];
    console.log('✅ User found:');
    console.log('   - ID:', user.id);
    console.log('   - Email:', user.email);
    console.log('   - Name:', user.firstName, user.lastName);
    console.log('   - Active:', user.isActive);
    console.log('   - Email Verified:', user.isEmailVerified);
    console.log('   - Email Verified At:', user.emailVerifiedAt);

    // 2. Check if user can authenticate (password verification)
    console.log('\n2️⃣  Testing password authentication...');
    if (user.password) {
      try {
        const isPasswordValid = await bcrypt.compare(testPassword, user.password);
        if (isPasswordValid) {
          console.log('✅ Password authentication successful!');
        } else {
          console.log('❌ Password authentication failed');
          console.log('💡 Note: This might be expected if the test password is different from the actual password');
        }
      } catch (bcryptError) {
        console.log('⚠️  Password verification error:', bcryptError.message);
      }
    } else {
      console.log('⚠️  No password hash found for user');
    }

    // 3. Check email verification table
    console.log('\n3️⃣  Checking email verification table...');
    const emailVerificationsQuery = await client.query(`
      SELECT id, token, status, "expiresAt", "verifiedAt", "createdAt"
      FROM email_verifications 
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
    `, [user.id]);

    if (emailVerificationsQuery.rows.length > 0) {
      console.log(`✅ Found ${emailVerificationsQuery.rows.length} email verification records:`);
      emailVerificationsQuery.rows.forEach((verification, index) => {
        console.log(`   ${index + 1}. Status: ${verification.status}, Expires: ${verification.expiresAt}, Verified: ${verification.verifiedAt || 'Not verified'}`);
      });
    } else {
      console.log('ℹ️  No email verification records found (this is fine if user was verified manually)');
    }

    // 4. Check if user meets all login requirements
    console.log('\n4️⃣  Checking login requirements...');
    const loginRequirements = {
      userExists: true,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      hasPassword: !!user.password
    };

    console.log('📋 Login Requirements:');
    Object.entries(loginRequirements).forEach(([requirement, met]) => {
      const status = met ? '✅' : '❌';
      console.log(`   ${status} ${requirement}: ${met}`);
    });

    const canLogin = Object.values(loginRequirements).every(Boolean);
    if (canLogin) {
      console.log('\n🎉 User can successfully log in! All requirements are met.');
    } else {
      console.log('\n⚠️  User cannot log in. Some requirements are not met.');
    }

    // 5. Test creating a new email verification record (for future use)
    console.log('\n5️⃣  Testing email verification table functionality...');
    try {
      const testVerification = await client.query(`
        INSERT INTO email_verifications (
          token, email, "userId", status, "expiresAt", "ipAddress", "userAgent"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING id, token, status
      `, [
        'test-token-' + Date.now(),
        testEmail,
        user.id,
        'pending',
        new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        '127.0.0.1',
        'Test-Script/1.0'
      ]);

      console.log('✅ Successfully created test email verification record:');
      console.log('   - ID:', testVerification.rows[0].id);
      console.log('   - Token:', testVerification.rows[0].token);
      console.log('   - Status:', testVerification.rows[0].status);

      // Clean up test record
      await client.query('DELETE FROM email_verifications WHERE id = $1', [testVerification.rows[0].id]);
      console.log('🧹 Cleaned up test verification record');

    } catch (verificationError) {
      console.log('❌ Error testing email verification table:', verificationError.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  testUserAuthDirect().catch(console.error);
}

module.exports = { testUserAuthDirect };
