#!/usr/bin/env node

/**
 * Manual Email Verification Script (Fixed)
 *
 * Usage: node scripts/verify-user-email-fixed.js [email]
 *
 * This script manually sets a user's email as verified
 */

require('dotenv').config();
const { Client } = require('pg');

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/verify-user-email-fixed.js user@example.com');
  process.exit(1);
}

async function verifyUserEmail() {
  console.log('🔧 Manual Email Verification Tool\n');
  console.log(`Verifying email for: ${userEmail}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Check if user exists
    const userCheck = await client.query(
      'SELECT id, email, is_email_verified FROM users WHERE email = $1',
      [userEmail.toLowerCase()]
    );

    if (userCheck.rows.length === 0) {
      console.log('❌ User not found in database');
      await client.end();
      return;
    }

    const user = userCheck.rows[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Currently Verified: ${user.is_email_verified ? 'Yes' : 'No'}\n`);

    if (user.is_email_verified) {
      console.log('ℹ️  Email is already verified');

      const confirmUpdate = process.argv[3] === '--force';
      if (!confirmUpdate) {
        console.log('   Use --force flag to update anyway');
        await client.end();
        return;
      }
    }

    // Update user email verification status
    console.log('📝 Updating user verification status...');
    await client.query(
      `UPDATE users
       SET is_email_verified = true,
           email_verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Mark verification tokens as used
    await client.query(
      `UPDATE email_verification_tokens
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    // Verify the update
    const updatedUser = await client.query(
      'SELECT is_email_verified, email_verified_at FROM users WHERE id = $1',
      [user.id]
    );

    console.log('\n✅ Email verification complete!');
    console.log(`   Email Verified: ${updatedUser.rows[0].is_email_verified ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   Verified At: ${new Date(updatedUser.rows[0].email_verified_at).toLocaleString()}`);
    console.log('\n🎉 User can now log in successfully!');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your DATABASE_URL is set correctly in .env');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Database table might not exist. Run migrations first.');
    }
    process.exit(1);
  }
}

verifyUserEmail();

