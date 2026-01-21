#!/usr/bin/env ts-node
/**
 * Quick Email Verification Script
 * Manually verifies a user's email for local development
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npx ts-node scripts/verify-email-quick.ts user@example.com');
  process.exit(1);
}

async function verifyEmail() {
  console.log('🔧 Quick Email Verification\n');
  console.log(`Verifying: ${email}\n`);

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      console.log('❌ User not found');
      await dataSource.destroy();
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Currently Verified: ${user.isEmailVerified ? 'Yes' : 'No'}\n`);

    if (user.isEmailVerified) {
      console.log('ℹ️  Email is already verified');
      await dataSource.destroy();
      return;
    }

    console.log('📝 Updating verification status...');
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    await userRepo.save(user);

    console.log('\n✅ Email verified successfully!');
    console.log(`   Verified At: ${user.emailVerifiedAt.toLocaleString()}`);
    console.log('\n🎉 User can now log in!');

    await dataSource.destroy();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n💡 Make sure DATABASE_URL is set in .env');
    }
    process.exit(1);
  }
}

verifyEmail();
