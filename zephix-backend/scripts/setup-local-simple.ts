#!/usr/bin/env ts-node

/**
 * SIMPLE LOCAL SETUP SCRIPT
 * Sets up local database and creates development user
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';

// Load environment variables
config();

async function setupLocalDatabase() {
  console.log('🚀 Setting up Local Development Environment');
  console.log('');

  let dataSource: DataSource | null = null;

  try {
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'Not set'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'Not set'}`);
    console.log(`   DB_USERNAME: ${process.env.DB_USERNAME || 'Not set'}`);
    console.log('');

    // Use DATABASE_URL if available, otherwise construct from individual variables
    let databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      const host = process.env.DB_HOST || 'localhost';
      const port = process.env.DB_PORT || '5432';
      const database = process.env.DB_NAME || 'zephix_development';
      const username = process.env.DB_USERNAME || 'zephix_user';
      const password = process.env.DB_PASSWORD || 'zephix_dev_password_1755409904';
      
      databaseUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`;
      console.log('🔧 Constructed DATABASE_URL from individual variables');
    }

    console.log(`🔌 Connecting to: ${databaseUrl.replace(/:[^:@]*@/, ':****@')}`);
    console.log('');

    // Create data source
    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [],
      synchronize: false,
      logging: true,
    });

    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connection successful');
    console.log('');

    // Check if users table exists
    console.log('📊 Checking database schema...');
    const usersTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);
    
    if (!usersTableExists[0].exists) {
      console.log('❌ Users table does not exist');
      console.log('💡 Creating basic users table...');
      
      // Create basic users table
      await dataSource.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          "firstName" VARCHAR(255) NOT NULL,
          "lastName" VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          "isActive" BOOLEAN DEFAULT true,
          "isEmailVerified" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Basic users table created');
    } else {
      console.log('✅ Users table exists');
    }

    // Development user credentials
    const devUser = {
      email: 'demo@zephix.com',
      password: 'Knight3967#!@',
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
    };

    console.log('');
    console.log('👤 Development User Details:');
    console.log(`   Email: ${devUser.email}`);
    console.log(`   Password: ${devUser.password}`);
    console.log(`   Name: ${devUser.firstName} ${devUser.lastName}`);
    console.log(`   Role: ${devUser.role}`);
    console.log('');

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await dataSource.query(`
      SELECT id, email, "firstName", "lastName", role, "isActive", "isEmailVerified"
      FROM users 
      WHERE email = $1
    `, [devUser.email]);

    if (existingUser.length > 0) {
      console.log('⚠️  User already exists:');
      console.log(`   ID: ${existingUser[0].id}`);
      console.log(`   Email: ${existingUser[0].email}`);
      console.log(`   Name: ${existingUser[0].firstName} ${existingUser[0].lastName}`);
      console.log(`   Role: ${existingUser[0].role}`);
      console.log(`   Active: ${existingUser[0].isActive}`);
      console.log(`   Email Verified: ${existingUser[0].isEmailVerified}`);
      console.log('');
      
      console.log('💡 User is ready for testing!');
      console.log('🔑 Login Credentials:');
      console.log(`   Email: ${devUser.email}`);
      console.log(`   Password: ${devUser.password}`);
      return;
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(devUser.password, saltRounds);
    console.log('✅ Password hashed successfully');

    // Create the user
    console.log('📝 Creating development user...');
    const result = await dataSource.query(`
      INSERT INTO users (
        email, 
        password, 
        "firstName", 
        "lastName", 
        role, 
        "isActive", 
        "isEmailVerified",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, "firstName", "lastName", role, "isActive", "isEmailVerified", "createdAt"
    `, [
      devUser.email,
      hashedPassword,
      devUser.firstName,
      devUser.lastName,
      devUser.role,
      devUser.isActive,
      devUser.isEmailVerified,
    ]);

    const createdUser = result[0];
    console.log('✅ Development user created successfully!');
    console.log('');
    console.log('🎉 User Details:');
    console.log(`   ID: ${createdUser.id}`);
    console.log(`   Email: ${createdUser.email}`);
    console.log(`   Password: ${devUser.password} (plain text for development)`);
    console.log(`   Name: ${createdUser.firstName} ${createdUser.lastName}`);
    console.log(`   Role: ${createdUser.role}`);
    console.log(`   Active: ${createdUser.isActive}`);
    console.log(`   Email Verified: ${createdUser.isEmailVerified}`);
    console.log(`   Created: ${createdUser.createdAt}`);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log(`   Email: ${devUser.email}`);
    console.log(`   Password: ${devUser.password}`);
    console.log('');
    console.log('✅ Local development setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up local database:', error);
    
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check database credentials in .env');
    console.log('   3. Verify database exists');
    console.log('   4. Check user permissions');
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup function
setupLocalDatabase()
  .then(() => {
    console.log('🏁 Setup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup script failed:', error);
    process.exit(1);
  });
