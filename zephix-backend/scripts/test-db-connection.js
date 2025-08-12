#!/usr/bin/env node

/**
 * Simple Database Connection Test Script
 * 
 * This script tests the database connection without loading complex entities
 */

require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 Testing Database Connection\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL environment variable is not set');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Successfully connected to database!');

    // Test a simple query
    console.log('🔄 Testing simple query...');
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Query successful!');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('🗄️  Database version:', result.rows[0].db_version.split(' ')[0]);

    // Test if users table exists
    console.log('🔄 Checking if users table exists...');
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('✅ Users table exists');
      
      // Count users
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log('👥 Total users:', userCount.rows[0].count);
      
      // Check specific user
      const userResult = await client.query(
        'SELECT id, email, "firstName", "lastName", "isActive", "isEmailVerified" FROM users WHERE email = $1',
        ['adeel99sa@yahoo.com']
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        console.log('✅ User found:', user.email);
        console.log('   Name:', `${user.firstName} ${user.lastName}`);
        console.log('   Active:', user.isActive ? 'Yes' : 'No');
        console.log('   Email Verified:', user.isEmailVerified ? 'Yes' : 'No');
      } else {
        console.log('❌ User not found: adeel99sa@yahoo.com');
      }
    } else {
      console.log('❌ Users table does not exist');
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 This usually means the hostname cannot be resolved');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 This usually means the connection was refused');
    } else if (error.message.includes('authentication failed')) {
      console.log('💡 This usually means incorrect username/password');
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

testConnection();
