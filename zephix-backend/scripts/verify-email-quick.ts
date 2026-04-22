#!/usr/bin/env ts-node
/**
 * Quick Email Verification Script
 * Manually verifies a user's email for local development
 *
 * Uses raw SQL so we don't need every TypeORM relation entity loaded.
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';

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
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    const normalized = email.trim().toLowerCase();

    const rows = await dataSource.query<
      { id: string; email: string; is_email_verified: boolean }[]
    >(
      `SELECT id, email, is_email_verified FROM users WHERE lower(trim(email)) = $1 LIMIT 1`,
      [normalized],
    );

    if (!rows?.length) {
      console.log('❌ User not found');
      await dataSource.destroy();
      process.exit(1);
    }

    const row = rows[0];
    console.log('✅ User found:');
    console.log(`   ID: ${row.id}`);
    console.log(`   Email: ${row.email}`);
    console.log(`   Currently Verified: ${row.is_email_verified ? 'Yes' : 'No'}\n`);

    if (row.is_email_verified) {
      console.log('ℹ️  Email is already verified');
      await dataSource.destroy();
      return;
    }

    console.log('📝 Updating verification status...');
    const updated = await dataSource.query<{ id: string; email_verified_at: Date }[]>(
      `UPDATE users
       SET is_email_verified = true,
           email_verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email_verified_at`,
      [row.id],
    );

    const verifiedAt = updated[0]?.email_verified_at;

    console.log('\n✅ Email verified successfully!');
    if (verifiedAt) {
      console.log(`   Verified At: ${new Date(verifiedAt).toLocaleString()}`);
    }
    console.log('\n🎉 User can now log in!');

    await dataSource.destroy();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', message);
    if (message.includes('DATABASE_URL')) {
      console.log('\n💡 Make sure DATABASE_URL is set in .env');
    }
    process.exit(1);
  }
}

verifyEmail();
