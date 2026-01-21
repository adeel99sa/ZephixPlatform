#!/usr/bin/env node

require('dotenv').config();
const { createConnection } = require('typeorm');

const email = process.argv[2] || 'adeel99sa@yahoo.com';

async function checkUser() {
  try {
    const connection = await createConnection({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [],
      synchronize: false,
      logging: false,
    });

    console.log('🔍 Checking for user:', email, '\n');

    // Check all users with similar email
    const allUsers = await connection.query(
      'SELECT id, email, is_email_verified, is_active, created_at, LEFT(password, 20) as password_preview FROM users WHERE LOWER(email) LIKE LOWER($1)',
      [`%${email.split('@')[0]}%`]
    );

    if (allUsers.length === 0) {
      console.log('❌ No users found with email containing:', email.split('@')[0]);
      console.log('\n💡 Checking all users in database...\n');
      
      const all = await connection.query(
        'SELECT email, is_email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 10'
      );
      
      if (all.length === 0) {
        console.log('❌ No users found in database at all!');
      } else {
        console.log('📋 Recent users in database:');
        all.forEach(u => console.log(`   - ${u.email} (verified: ${u.is_email_verified}, created: ${u.created_at})`));
      }
    } else {
      console.log(`✅ Found ${allUsers.length} user(s):\n`);
      allUsers.forEach(u => {
        console.log(`   Email: ${u.email}`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Verified: ${u.is_email_verified}`);
        console.log(`   Active: ${u.is_active}`);
        console.log(`   Created: ${u.created_at}`);
        console.log(`   Password Hash: ${u.password_preview}...`);
        console.log('');
      });
    }

    // Check exact match
    const exact = await connection.query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (exact.length === 0) {
      console.log(`\n❌ Exact match for "${email}" NOT FOUND`);
      console.log('\n💡 The user may have been created with a different email or in a different database.');
    } else {
      console.log(`\n✅ Exact match found: ${exact[0].email}`);
    }

    await connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();
