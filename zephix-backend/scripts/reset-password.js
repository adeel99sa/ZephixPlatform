#!/usr/bin/env node

/**
 * Reset User Password
 * Sets a user's password to a known value for testing
 */

require('dotenv').config();
const { createConnection } = require('typeorm');
const bcrypt = require('bcrypt');

const email = process.argv[2] || 'adeel99sa@yahoo.com';
const newPassword = process.argv[3] || 'TestPass123!@#';

async function resetPassword() {
  console.log('🔐 Resetting User Password\n');
  console.log(`Email: ${email}`);
  console.log(`New Password: ${newPassword}\n`);

  try {
    const connection = await createConnection({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [],
      synchronize: false,
      logging: false,
    });

    // Check if user exists
    const userCheck = await connection.query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userCheck.length === 0) {
      console.log('❌ User not found');
      await connection.close();
      process.exit(1);
    }

    const userId = userCheck[0].id;
    console.log(`✅ User found: ${userCheck[0].email} (${userId})\n`);

    // Hash new password (using 12 rounds like signup)
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...\n`);

    // Update password
    console.log('📝 Updating password in database...');
    await connection.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    console.log('✅ Password reset successfully!\n');
    console.log('🎉 You can now log in with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}\n`);

    // Verify the new password works
    console.log('🔍 Verifying new password...');
    const verify = await connection.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    const match = await bcrypt.compare(newPassword, verify[0].password);
    
    if (match) {
      console.log('✅ Password verification successful!\n');
    } else {
      console.log('❌ Password verification failed (this should not happen)');
    }

    await connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
