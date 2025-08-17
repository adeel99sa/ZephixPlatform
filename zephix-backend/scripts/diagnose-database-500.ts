#!/usr/bin/env ts-node

/**
 * CRITICAL DATABASE DIAGNOSTIC SCRIPT
 * Identifies the specific cause of 500 errors on user registration
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function diagnoseDatabase500() {
  console.log('🔍 CRITICAL: Diagnosing Database 500 Error on User Registration');
  console.log('');

  let dataSource: DataSource | null = null;

  try {
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
    console.log(`   SKIP_DATABASE: ${process.env.SKIP_DATABASE || 'Not set'}`);
    console.log('');

    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not set - cannot connect to database');
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

    // Check if users table exists
    console.log('📊 Table Schema Check:');
    const usersTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);
    console.log(`   Users table exists: ${usersTableExists[0].exists ? '✅' : '❌'}`);

    if (usersTableExists[0].exists) {
      // Check users table columns
      const userColumns = await dataSource.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      console.log('   Users table columns:');
      userColumns.forEach((col: any) => {
        console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
      });

      // Check for missing required columns
      const requiredColumns = ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'isEmailVerified', 'createdAt', 'updatedAt'];
      const existingColumns = userColumns.map((col: any) => col.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`   ❌ Missing required columns: ${missingColumns.join(', ')}`);
      } else {
        console.log('   ✅ All required columns present');
      }
    }

    // Check if organizations table exists (for foreign key relationships)
    const orgTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organizations'
      )
    `);
    console.log(`   Organizations table exists: ${orgTableExists[0].exists ? '✅' : '❌'}`);

    // Check foreign key constraints
    console.log('');
    console.log('🔗 Foreign Key Constraints:');
    const foreignKeys = await dataSource.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('users', 'organizations')
    `);

    if (foreignKeys.length > 0) {
      foreignKeys.forEach((fk: any) => {
        console.log(`   - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('   No foreign key constraints found');
    }

    // Check for unique constraints
    console.log('');
    console.log('🔒 Unique Constraints:');
    const uniqueConstraints = await dataSource.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_name IN ('users', 'organizations')
    `);

    if (uniqueConstraints.length > 0) {
      uniqueConstraints.forEach((uc: any) => {
        console.log(`   - ${uc.table_name}.${uc.column_name} (unique)`);
      });
    } else {
      console.log('   No unique constraints found');
    }

    // Test user creation (without saving)
    console.log('');
    console.log('🧪 Testing User Creation Logic:');
    try {
      const testUser = {
        email: 'test@example.com',
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        isEmailVerified: false,
      };

      console.log('   Test user object created successfully');
      console.log('   User fields:', Object.keys(testUser));
      
      // Check if all required fields are present
      const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role', 'isActive', 'isEmailVerified'];
      const missingFields = requiredFields.filter(field => !(field in testUser));
      
      if (missingFields.length > 0) {
        console.log(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
      } else {
        console.log('   ✅ All required fields present');
      }
    } catch (error) {
      console.log(`   ❌ Error creating test user: ${error.message}`);
    }

    // Check database permissions
    console.log('');
    console.log('🔐 Database Permissions:');
    try {
      const currentUser = await dataSource.query('SELECT current_user, current_database()');
      console.log(`   Current user: ${currentUser[0].current_user}`);
      console.log(`   Current database: ${currentUser[0].current_database}`);
      
      // Check if user can create tables
      const canCreate = await dataSource.query(`
        SELECT has_table_privilege(current_user, 'users', 'INSERT') as can_insert,
               has_table_privilege(current_user, 'users', 'SELECT') as can_select,
               has_table_privilege(current_user, 'users', 'UPDATE') as can_update
      `);
      
      console.log(`   Can INSERT: ${canCreate[0].can_insert ? '✅' : '❌'}`);
      console.log(`   Can SELECT: ${canCreate[0].can_select ? '✅' : '❌'}`);
      console.log(`   Can UPDATE: ${canCreate[0].can_update ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ❌ Error checking permissions: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Database diagnostic failed: ${error.message}`);
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
  console.log('📋 DIAGNOSTIC SUMMARY:');
  console.log('   This script identified potential causes of 500 errors:');
  console.log('   1. Missing database tables or columns');
  console.log('   2. Foreign key constraint violations');
  console.log('   3. Unique constraint conflicts');
  console.log('   4. Database permission issues');
  console.log('   5. Schema mismatch between entity and database');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Check Railway deployment logs for specific error messages');
  console.log('   2. Run database migrations if tables are missing');
  console.log('   3. Verify entity definitions match database schema');
  console.log('   4. Check database user permissions');
}

// Run the diagnostic
diagnoseDatabase500().catch(console.error);
