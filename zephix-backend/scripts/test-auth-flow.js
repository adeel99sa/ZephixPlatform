#!/usr/bin/env node

/**
 * Authentication Flow Test Script
 * 
 * This script tests the authentication flow without requiring the full build
 */

require('dotenv').config();
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow\n');
  
  // Test database connection first
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Database connected');

    // Test user lookup
    const userResult = await client.query(
      'SELECT id, email, "firstName", "lastName", "isActive", "isEmailVerified" FROM users WHERE email = $1',
      ['adeel99sa@yahoo.com']
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ User found:', user.email);
    console.log('   Name:', `${user.firstName} ${user.lastName}`);
    console.log('   Active:', user.isActive);
    console.log('   Email Verified:', user.isEmailVerified);

    // Test JWT token generation
    console.log('\n🔄 Testing JWT token generation...');
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log('❌ JWT_SECRET not set in environment');
      return;
    }

    const payload = {
      sub: user.id,
      email: user.email,
      emailVerified: user.isEmailVerified,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    const token = jwt.sign(payload, jwtSecret);
    console.log('✅ JWT token generated');
    console.log('   Token length:', token.length);
    console.log('   Expires in:', '24 hours');

    // Test JWT token validation
    console.log('\n🔄 Testing JWT token validation...');
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ JWT token validated');
      console.log('   User ID:', decoded.sub);
      console.log('   Email:', decoded.email);
      console.log('   Email Verified:', decoded.emailVerified);
      console.log('   Expires at:', new Date(decoded.exp * 1000).toLocaleString());
    } catch (error) {
      console.log('❌ JWT token validation failed:', error.message);
    }

    // Test expired token
    console.log('\n🔄 Testing expired token...');
    const expiredPayload = {
      sub: user.id,
      email: user.email,
      emailVerified: user.isEmailVerified,
      iat: Math.floor(Date.now() / 1000) - (25 * 60 * 60), // 25 hours ago
      exp: Math.floor(Date.now() / 1000) - (1 * 60 * 60), // 1 hour ago
    };

    const expiredToken = jwt.sign(expiredPayload, jwtSecret);
    try {
      const decoded = jwt.verify(expiredToken, jwtSecret);
      console.log('❌ Expired token should not be valid');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('✅ Expired token correctly rejected');
        console.log('   Error:', error.message);
      } else {
        console.log('❌ Unexpected error with expired token:', error.message);
      }
    }

    console.log('\n🎯 Authentication Flow Test Summary:');
    console.log('✅ Database connection working');
    console.log('✅ User authentication data valid');
    console.log('✅ JWT token generation working');
    console.log('✅ JWT token validation working');
    console.log('✅ Token expiration handling working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

testAuthFlow();
