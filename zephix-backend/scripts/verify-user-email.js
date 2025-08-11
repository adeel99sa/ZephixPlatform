#!/usr/bin/env node

/**
 * Manual Email Verification Script
 * 
 * Usage: node scripts/verify-user-email.js [email]
 * 
 * This script manually sets a user's email as verified for testing purposes
 */

require('dotenv').config();
const { createConnection } = require('typeorm');
const path = require('path');

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/verify-user-email.js user@example.com');
  process.exit(1);
}

async function verifyUserEmail() {
  console.log('🔧 Manual Email Verification Tool\n');
  console.log(`Verifying email for: ${userEmail}\n`);

  try {
    // Create database connection
    const connection = await createConnection({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [path.join(__dirname, '../dist/**/*.entity.js')],
      synchronize: false,
      logging: false,
    });

    // Check if user exists
    const userCheck = await connection.query(
      'SELECT id, email, "isEmailVerified" FROM users WHERE email = $1',
      [userEmail]
    );

    if (userCheck.length === 0) {
      console.log('❌ User not found in database');
      await connection.close();
      return;
    }

    const user = userCheck[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Currently Verified: ${user.isEmailVerified ? 'Yes' : 'No'}\n`);

    if (user.isEmailVerified) {
      console.log('ℹ️  Email is already verified');
      
      const confirmUpdate = process.argv[3] === '--force';
      if (!confirmUpdate) {
        console.log('   Use --force flag to update anyway');
        await connection.close();
        return;
      }
    }

    // Update user email verification status
    console.log('📝 Updating user verification status...');
    await connection.query(
      `UPDATE users 
       SET "isEmailVerified" = true, 
           "emailVerifiedAt" = NOW(),
           "updatedAt" = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Mark any pending verification records as verified
    await connection.query(
      `UPDATE email_verifications 
       SET status = 'verified',
           "verifiedAt" = NOW()
       WHERE "userId" = $1 AND status = 'pending'`,
      [user.id]
    );

    // Verify the update
    const updatedUser = await connection.query(
      'SELECT "isEmailVerified", "emailVerifiedAt" FROM users WHERE id = $1',
      [user.id]
    );

    console.log('\n✅ Email verification complete!');
    console.log(`   Email Verified: ${updatedUser[0].isEmailVerified}`);
    console.log(`   Verified At: ${new Date(updatedUser[0].emailVerifiedAt).toLocaleString()}`);
    console.log('\n🎉 User can now log in successfully!');

    await connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your DATABASE_URL is set correctly in .env');
    }
  }
}

verifyUserEmail();