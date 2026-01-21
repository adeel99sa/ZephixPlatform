#!/usr/bin/env node

require('dotenv').config();
const { createConnection } = require('typeorm');
const bcrypt = require('bcrypt');

const email = 'adeel99sa@yahoo.com';
const testPassword = 'ReAdY4wK73967#!@';

async function testPassword() {
  try {
    const connection = await createConnection({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [],
      synchronize: false,
      logging: false,
    });

    console.log('🔐 Testing Password Verification\n');
    console.log(`Email: ${email}`);
    console.log(`Password: ${testPassword.substring(0, 5)}***\n`);

    const user = await connection.query(
      'SELECT id, email, password FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (user.length === 0) {
      console.log('❌ User not found');
      await connection.close();
      return;
    }

    const storedHash = user[0].password;
    console.log('📋 Stored Password Hash:');
    console.log(`   ${storedHash.substring(0, 30)}...`);
    console.log(`   Rounds: ${storedHash.split('$')[2]}\n`);

    console.log('🔍 Testing password comparison...');
    const match = await bcrypt.compare(testPassword, storedHash);
    
    if (match) {
      console.log('✅ Password MATCHES!');
      console.log('\n💡 The password is correct. The issue might be:');
      console.log('   1. Backend login service has a bug');
      console.log('   2. Email normalization issue');
      console.log('   3. User lookup query issue');
    } else {
      console.log('❌ Password DOES NOT MATCH');
      console.log('\n💡 Possible reasons:');
      console.log('   1. Wrong password provided');
      console.log('   2. Password was changed after signup');
      console.log('   3. Password hash is corrupted');
    }

    await connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('bcrypt')) {
      console.log('\n💡 Installing bcrypt...');
      console.log('   Run: npm install bcrypt');
    }
    process.exit(1);
  }
}

testPassword();
