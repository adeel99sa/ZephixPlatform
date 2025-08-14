#!/usr/bin/env node

/**
 * Zephix Migration State Fix Script
 * This script surgically fixes migration state conflicts without data loss
 * 
 * Usage:
 * 1. railway run node scripts/fix-migration-state.js
 * 2. Or: railway run npm run fix:migrations
 */

const { DataSource } = require('typeorm');
const path = require('path');

// Import the data source configuration
const dataSource = require('../src/data-source');

async function fixMigrationState() {
  console.log('🔧 Starting Migration State Fix...');
  
  try {
    // Initialize database connection
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Step 1: Check current migration state
    console.log('\n📋 Current Migration State:');
    const currentMigrations = await dataSource.query(
      'SELECT timestamp, name FROM migrations ORDER BY timestamp'
    );
    console.table(currentMigrations);

    // Step 2: Check for conflicting tables
    console.log('\n🔍 Checking for Conflicting Tables:');
    
    // Check users table structure
    try {
      const usersColumns = await dataSource.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      console.log('✅ Users table exists with columns:');
      console.table(usersColumns);
    } catch (error) {
      console.log('❌ Users table not found or error:', error.message);
    }

    // Check organizations table
    try {
      const orgTables = await dataSource.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'organizations'
      `);
      console.log(`✅ Organizations table: ${orgTables.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    } catch (error) {
      console.log('❌ Error checking organizations table:', error.message);
    }

    // Check status_reports table
    try {
      const statusTables = await dataSource.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'status_reports'
      `);
      console.log(`✅ Status reports table: ${statusTables.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    } catch (error) {
      console.log('❌ Error checking status_reports table:', error.message);
    }

    // Step 3: Remove problematic migration entries
    console.log('\n🗑️ Removing Problematic Migration Entries...');
    const deleteResult = await dataSource.query(`
      DELETE FROM migrations WHERE name IN (
        'CreateAuthTables1700000000002',
        'FixMigrationConflict1755044976001',
        'ResetMigrationState1700000000000'
      )
    `);
    console.log(`✅ Removed ${deleteResult.length} problematic migration entries`);

    // Step 4: Check if organizationId column exists and mark migration as completed
    console.log('\n🔧 Checking organizationId Column Status...');
    try {
      const orgIdExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'organizationId'
        )
      `);

      if (orgIdExists[0].exists) {
        console.log('✅ organizationId column already exists in users table');
        
        // Mark migration as completed
        await dataSource.query(`
          INSERT INTO migrations (timestamp, name) 
          VALUES (1700000000002, 'CreateAuthTables1700000000002')
          ON CONFLICT DO NOTHING
        `);
        console.log('✅ Marked CreateAuthTables migration as completed');
      } else {
        console.log('❌ organizationId column does not exist - will be created by migration');
      }
    } catch (error) {
      console.log('⚠️ Error checking organizationId column:', error.message);
    }

    // Step 5: Check if status_reports table exists and mark migration as completed
    console.log('\n🔧 Checking status_reports Table Status...');
    try {
      const statusReportsExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'status_reports'
        )
      `);

      if (statusReportsExists[0].exists) {
        console.log('✅ status_reports table already exists');
        
        // Mark migration as completed
        await dataSource.query(`
          INSERT INTO migrations (timestamp, name) 
          VALUES (1755044971817, 'StatusReporting1755044971817')
          ON CONFLICT DO NOTHING
        `);
        console.log('✅ Marked StatusReporting migration as completed');
      } else {
        console.log('❌ status_reports table does not exist - will be created by migration');
      }
    } catch (error) {
      console.log('⚠️ Error checking status_reports table:', error.message);
    }

    // Step 6: Verify final migration state
    console.log('\n📋 Final Migration State:');
    const finalMigrations = await dataSource.query(
      'SELECT timestamp, name FROM migrations ORDER BY timestamp'
    );
    console.table(finalMigrations);

    console.log('\n🎉 Migration State Fix Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: railway run npm run migration:run');
    console.log('2. Check if any new migrations run successfully');
    console.log('3. If successful, deploy: railway up');
    console.log('4. If issues persist, consider database reset');

  } catch (error) {
    console.error('❌ Error during migration state fix:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixMigrationState();
}

module.exports = { fixMigrationState };
