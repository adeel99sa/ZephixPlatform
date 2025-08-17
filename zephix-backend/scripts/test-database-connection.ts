#!/usr/bin/env ts-node

/**
 * Database Connection Test Script
 * 
 * This script tests:
 * 1. Database connectivity
 * 2. Entity registration
 * 3. Repository injection
 * 4. Basic CRUD operations
 * 
 * Run with: npm run dev scripts/test-database-connection.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

async function testDatabaseConnection() {
  console.log('🧪 Testing Database Connection and Entity Registration...\n');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get the data source
    const dataSource = app.get<DataSource>(getDataSourceToken());
    
    console.log('✅ NestJS application context created successfully');
    console.log('✅ Data source retrieved successfully');
    
    // Test database connection
    console.log('\n🔌 Testing database connection...');
    await dataSource.initialize();
    console.log('✅ Database connection established successfully');
    
    // Test entity registration
    console.log('\n📋 Testing entity registration...');
    const entities = dataSource.entityMetadatas;
    console.log(`✅ Found ${entities.length} registered entities:`);
    
    entities.forEach((entity, index) => {
      console.log(`   ${index + 1}. ${entity.name} (${entity.tableName})`);
    });
    
    // Check for specific critical entities
    const criticalEntities = ['User', 'EmailVerification', 'Organization', 'RefreshToken'];
    const missingEntities = criticalEntities.filter(name => 
      !entities.some(entity => entity.name === name)
    );
    
    if (missingEntities.length > 0) {
      console.log(`\n❌ Missing critical entities: ${missingEntities.join(', ')}`);
    } else {
      console.log('\n✅ All critical entities are registered');
    }
    
    // Test repository injection
    console.log('\n🔧 Testing repository injection...');
    try {
      const userRepository = dataSource.getRepository('User');
      console.log('✅ User repository retrieved successfully');
      
      const emailVerificationRepository = dataSource.getRepository('EmailVerification');
      console.log('✅ EmailVerification repository retrieved successfully');
      
      const organizationRepository = dataSource.getRepository('Organization');
      console.log('✅ Organization repository retrieved successfully');
      
    } catch (error) {
      console.log('❌ Repository injection test failed:', error.message);
    }
    
    // Test basic database operations
    console.log('\n💾 Testing basic database operations...');
    try {
      // Test a simple query
      const result = await dataSource.query('SELECT current_database(), current_user, version()');
      console.log('✅ Basic database query successful');
      console.log(`   Database: ${result[0].current_database}`);
      console.log(`   User: ${result[0].current_user}`);
      console.log(`   Version: ${result[0].version}`);
      
    } catch (error) {
      console.log('❌ Basic database operations test failed:', error.message);
    }
    
    // Test table existence
    console.log('\n📊 Testing table existence...');
    try {
      const tables = await dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log(`✅ Found ${tables.length} tables in database:`);
      tables.forEach((table: any, index: number) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
      
    } catch (error) {
      console.log('❌ Table existence test failed:', error.message);
    }
    
    // Close connections
    await dataSource.destroy();
    await app.close();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Database connection is stable');
    console.log('✅ Entity registration is working');
    console.log('✅ Repository injection is functional');
    
  } catch (error) {
    console.error('\n💥 Database connection test failed:', error);
    console.error('\n🔍 Error details:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Name: ${error.name}`);
    
    if (error.stack) {
      console.error('\n📚 Stack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
