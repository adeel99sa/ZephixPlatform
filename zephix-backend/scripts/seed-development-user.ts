#!/usr/bin/env ts-node

/**
 * DEVELOPMENT USER SEED SCRIPT
 * Creates a development user with a strong password that meets complexity requirements
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';

// Load environment variables
config();

async function seedDevelopmentUser() {
  console.log('🌱 Seeding Development User with Strong Password');
  console.log('');

  let dataSource: DataSource | null = null;

  try {
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
    console.log('');

    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not set - cannot seed database');
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
      
      // Ask if user wants to update password
      console.log('💡 To update password, delete the user first or modify this script');
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
    console.log('✅ Development user seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding development user:', error);
    
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seed function
seedDevelopmentUser()
  .then(() => {
    console.log('🏁 Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
