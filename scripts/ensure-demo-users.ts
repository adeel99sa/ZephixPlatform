#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: '../zephix-backend/.env' });

const accounts = [
  { email: 'demo@zephix.ai', password: 'demo123456', firstName: 'Demo', lastName: 'User', role: 'admin' },
  { email: 'admin@zephix.ai', password: 'admin123456', firstName: 'Admin', lastName: 'User', role: 'admin' },
  { email: 'member@zephix.ai', password: 'member123456', firstName: 'Member', lastName: 'User', role: 'pm' },
  { email: 'guest@zephix.ai', password: 'guest123456', firstName: 'Guest', lastName: 'User', role: 'viewer' },
];

async function ensureDemoUsers() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await dataSource.initialize();

  console.log('🔍 Verifying demo users...');

  // Get or create org
  let org = await dataSource.query('SELECT id FROM organizations WHERE slug = $1', ['demo']);
  let orgId: string;

  if (org.length === 0) {
    const newOrg = await dataSource.query(
      `INSERT INTO organizations (name, slug) VALUES ('Zephix Demo', 'demo') RETURNING id`
    );
    orgId = newOrg[0].id;
    console.log('✅ Created demo organization');
  } else {
    orgId = org[0].id;
  }

  // Upsert users
  const results = [];
  for (const account of accounts) {
    const hash = await bcrypt.hash(account.password, 10);
    const result = await dataSource.query(
      `SELECT email, role FROM users WHERE email = $1`,
      [account.email]
    );

    if (result.length === 0) {
      await dataSource.query(
        `INSERT INTO users (email, password, first_name, last_name, role, organization_id, is_active, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW(), NOW())`,
        [account.email, hash, account.firstName, account.lastName, account.role, orgId]
      );
      results.push({ email: account.email, role: account.role, status: 'created' });
    } else {
      await dataSource.query(
        `UPDATE users SET password = $1, role = $2, organization_id = $3, updated_at = NOW() WHERE email = $4`,
        [hash, account.role, orgId, account.email]
      );
      results.push({ email: account.email, role: account.role, status: 'updated' });
    }
  }

  console.log('\n📊 Demo Users Status:');
  console.table(results);

  await dataSource.destroy();
}

ensureDemoUsers().catch(console.error);

