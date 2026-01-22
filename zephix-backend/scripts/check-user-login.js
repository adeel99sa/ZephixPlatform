#!/usr/bin/env node

/**
 * Check User Login Credentials
 * Verifies if a user exists and if password matches
 */

require('dotenv').config();
const { createConnection } = require('typeorm');
const bcrypt = require('bcryptjs');
const path = require('path');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Usage: node scripts/check-user-login.js email@example.com password');
  process.exit(1);
}

async function checkLogin() {
  console.log('🔍 Checking User Login Credentials\n');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password.substring(0, 3)}***\n`);

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
      'SELECT id, email, password, is_email_verified, email_verified_at, is_active, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userCheck.length === 0) {
      console.log('❌ User NOT FOUND in database');
      console.log('\n💡 Possible reasons:');
      console.log('   1. User was created in a different database');
      console.log('   2. Email address is different');
      console.log('   3. User was deleted');
      await connection.close();
      process.exit(1);
    }

    const user = userCheck[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Is Active: ${user.is_active ? 'Yes' : 'No'}`);
    console.log(`   Email Verified: ${user.is_email_verified ? 'Yes' : 'No'}`);
    console.log(`   Email Verified At: ${user.email_verified_at || 'Never'}`);
    console.log(`   Created At: ${user.created_at}\n`);

    // Check password
    console.log('🔐 Checking password...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Password DOES NOT MATCH');
      console.log('\n💡 Possible reasons:');
      console.log('   1. Password was changed');
      console.log('   2. Wrong password entered');
      console.log('   3. Password hash is corrupted');
      await connection.close();
      process.exit(1);
    }

    console.log('✅ Password MATCHES\n');
    console.log('🎉 User can log in!');
    console.log('\n📋 Account Summary:');
    console.log(`   ✅ User exists`);
    console.log(`   ✅ Password correct`);
    console.log(`   ${user.is_active ? '✅' : '❌'} Account active`);
    console.log(`   ${user.is_email_verified ? '✅' : '❌'} Email verified`);

    if (!user.is_active) {
      console.log('\n⚠️  WARNING: Account is not active. Login may be blocked.');
    }

    if (!user.is_email_verified) {
      console.log('\n⚠️  WARNING: Email is not verified. Login may be blocked.');
    }

    await connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your DATABASE_URL is set correctly in .env');
    }
    process.exit(1);
  }
}

checkLogin();
