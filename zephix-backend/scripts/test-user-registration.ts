#!/usr/bin/env ts-node

/**
 * USER REGISTRATION TEST SCRIPT
 * Tests user registration to identify where the 500 error occurs
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';

// Load environment variables
config();

async function testUserRegistration() {
  console.log('🧪 Testing User Registration to Identify 500 Error');
  console.log('');

  let dataSource: DataSource | null = null;

  try {
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
    console.log('');

    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not set - cannot test database operations');
      return;
    }

    // Create data source
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [],
      synchronize: false,
      logging: true,
    });

    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connection successful');
    console.log('');

    // Test 1: Check if users table exists and has correct schema
    console.log('📊 Test 1: Table Schema Validation');
    const usersTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);
    
    if (!usersTableExists[0].exists) {
      console.log('❌ Users table does not exist - this is the problem!');
      console.log('💡 Solution: Run database migrations');
      return;
    }
    console.log('✅ Users table exists');

    // Test 2: Check table columns
    const userColumns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('   Table columns:');
    userColumns.forEach((col: any) => {
      console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });

    // Test 3: Check for required columns
    const requiredColumns = ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'isEmailVerified', 'createdAt', 'updatedAt'];
    const existingColumns = userColumns.map((col: any) => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      console.log('💡 Solution: Run database migrations or fix schema');
      return;
    }
    console.log('✅ All required columns present');

    // Test 4: Test user creation logic
    console.log('');
    console.log('🧪 Test 4: User Creation Logic');
    
    try {
      // Create test user data
      const testUserData = {
        email: 'test@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        isEmailVerified: false,
      };

      console.log('   Test user data created successfully');
      console.log('   User data:', testUserData);

      // Test 5: Hash password (simulate bcrypt)
      console.log('');
      console.log('🔐 Test 5: Password Hashing');
      try {
        const hashedPassword = await bcrypt.hash(testUserData.password, 12);
        console.log('✅ Password hashed successfully');
        console.log(`   Original: ${testUserData.password}`);
        console.log(`   Hashed: ${hashedPassword.substring(0, 20)}...`);
      } catch (error) {
        console.log(`❌ Password hashing failed: ${error.message}`);
        return;
      }

      // Test 6: Check for existing user (unique constraint)
      console.log('');
      console.log('🔍 Test 6: Unique Constraint Check');
      try {
        const existingUser = await dataSource.query(`
          SELECT id, email FROM users WHERE email = $1
        `, [testUserData.email]);
        
        if (existingUser.length > 0) {
          console.log(`⚠️  User with email ${testUserData.email} already exists`);
          console.log(`   Existing user ID: ${existingUser[0].id}`);
          console.log('💡 This could cause unique constraint violations');
        } else {
          console.log('✅ No existing user with this email');
        }
      } catch (error) {
        console.log(`❌ Error checking existing user: ${error.message}`);
      }

      // Test 7: Test actual user insertion
      console.log('');
      console.log('💾 Test 7: Database Insert Test');
      try {
        const hashedPassword = await bcrypt.hash(testUserData.password, 12);
        
        const insertResult = await dataSource.query(`
          INSERT INTO users (email, password, "firstName", "lastName", role, "isActive", "isEmailVerified")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, email, "firstName", "lastName"
        `, [
          testUserData.email,
          hashedPassword,
          testUserData.firstName,
          testUserData.lastName,
          testUserData.role,
          testUserData.isActive,
          testUserData.isEmailVerified
        ]);

        console.log('✅ User inserted successfully!');
        console.log('   Inserted user:', insertResult[0]);

        // Clean up test user
        console.log('🧹 Cleaning up test user...');
        await dataSource.query(`
          DELETE FROM users WHERE email = $1
        `, [testUserData.email]);
        console.log('✅ Test user cleaned up');

      } catch (error) {
        console.log(`❌ User insertion failed: ${error.message}`);
        console.log('');
        console.log('🔍 Error details:');
        console.log(error);
        
        // Check if it's a constraint violation
        if (error.message.includes('duplicate key')) {
          console.log('💡 Issue: Duplicate key violation (email already exists)');
        } else if (error.message.includes('foreign key')) {
          console.log('💡 Issue: Foreign key constraint violation');
        } else if (error.message.includes('not null')) {
          console.log('💡 Issue: Required field is null');
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('💡 Issue: Column does not exist in table');
        }
      }

    } catch (error) {
      console.log(`❌ Error in user creation logic: ${error.message}`);
    }

    // Test 8: Check database permissions
    console.log('');
    console.log('🔐 Test 8: Database Permissions');
    try {
      const currentUser = await dataSource.query('SELECT current_user, current_database()');
      console.log(`   Current user: ${currentUser[0].current_user}`);
      console.log(`   Current database: ${currentUser[0].current_database}`);
      
      const permissions = await dataSource.query(`
        SELECT has_table_privilege(current_user, 'users', 'INSERT') as can_insert,
               has_table_privilege(current_user, 'users', 'SELECT') as can_select,
               has_table_privilege(current_user, 'users', 'UPDATE') as can_update,
               has_table_privilege(current_user, 'users', 'DELETE') as can_delete
      `);
      
      console.log('   Permissions:');
      console.log(`     INSERT: ${permissions[0].can_insert ? '✅' : '❌'}`);
      console.log(`     SELECT: ${permissions[0].can_select ? '✅' : '❌'}`);
      console.log(`     UPDATE: ${permissions[0].can_update ? '✅' : '❌'}`);
      console.log(`     DELETE: ${permissions[0].can_delete ? '✅' : '❌'}`);
      
      if (!permissions[0].can_insert) {
        console.log('❌ Cannot INSERT into users table - this is the problem!');
        console.log('💡 Solution: Grant INSERT permission to database user');
      }
    } catch (error) {
      console.log(`❌ Error checking permissions: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log('');
    console.log('🔍 Error details:');
    console.log(error);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('');
      console.log('🔌 Database connection closed');
    }
  }

  console.log('');
  console.log('📋 TEST SUMMARY:');
  console.log('   This script tested:');
  console.log('   1. Database connectivity ✅');
  console.log('   2. Table existence ✅');
  console.log('   3. Column schema ✅');
  console.log('   4. User creation logic ✅');
  console.log('   5. Password hashing ✅');
  console.log('   6. Unique constraints ✅');
  console.log('   7. Database insertion ✅');
  console.log('   8. User permissions ✅');
  console.log('');
  console.log('💡 If any test failed, that identifies the cause of the 500 error');
}

// Run the test
testUserRegistration().catch(console.error);
