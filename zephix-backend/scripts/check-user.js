#!/usr/bin/env node

/**
 * User Database Check Script
 * 
 * Usage: node scripts/check-user.js [email]
 * 
 * This script checks the database state of a user including email verification status
 */

require('dotenv').config();
const { createConnection } = require('typeorm');
const path = require('path');

const userEmail = process.argv[2] || 'adeel99sa@yahoo.com';

async function checkUser() {
  console.log('🔍 Checking User Database State\n');
  console.log(`Looking for user: ${userEmail}\n`);

  try {
    // Create database connection
    const connection = await createConnection({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [path.join(__dirname, '../dist/**/*.entity.js')],
      synchronize: false,
      logging: false,
    });

    // Query user table
    const userResult = await connection.query(
      `SELECT 
        id,
        email,
        "firstName",
        "lastName",
        "isActive",
        "isEmailVerified",
        "emailVerifiedAt",
        "createdAt",
        "updatedAt"
      FROM users 
      WHERE email = $1`,
      [userEmail]
    );

    if (userResult.length === 0) {
      console.log('❌ User not found in database\n');
    } else {
      const user = userResult[0];
      console.log('✅ User Found:\n');
      console.log('📧 Email:', user.email);
      console.log('👤 Name:', `${user.firstName} ${user.lastName}`);
      console.log('🆔 User ID:', user.id);
      console.log('🔓 Active:', user.isActive ? 'Yes' : 'No');
      console.log('✉️  Email Verified:', user.isEmailVerified ? 'Yes' : 'No');
      console.log('📅 Verified At:', user.emailVerifiedAt || 'Never');
      console.log('📅 Created:', new Date(user.createdAt).toLocaleString());
      console.log('📅 Updated:', new Date(user.updatedAt).toLocaleString());
      
      // Check why user can't login
      console.log('\n🚫 Login Issues:');
      if (!user.isActive) {
        console.log('- Account is not active');
      }
      if (!user.isEmailVerified) {
        console.log('- Email is not verified (this is likely the issue)');
      }
      
      // Check for verification records
      console.log('\n📋 Checking Email Verification Records...');
      const verificationResult = await connection.query(
        `SELECT 
          id,
          token,
          status,
          "createdAt",
          "expiresAt",
          "verifiedAt"
        FROM email_verifications
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 5`,
        [user.id]
      );

      if (verificationResult.length === 0) {
        console.log('❌ No verification emails found for this user');
      } else {
        console.log(`✅ Found ${verificationResult.length} verification record(s):\n`);
        verificationResult.forEach((record, index) => {
          console.log(`Record ${index + 1}:`);
          console.log(`  Status: ${record.status}`);
          console.log(`  Created: ${new Date(record.createdAt).toLocaleString()}`);
          console.log(`  Expires: ${new Date(record.expiresAt).toLocaleString()}`);
          console.log(`  Token: ${record.token.substring(0, 8)}...`);
          if (record.verifiedAt) {
            console.log(`  Verified: ${new Date(record.verifiedAt).toLocaleString()}`);
          }
          console.log('');
        });
      }
    }

    await connection.close();
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your DATABASE_URL is set correctly in .env');
    }
  }
}

checkUser();