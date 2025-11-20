#!/usr/bin/env npx tsx
import 'dotenv/config';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

const DEMO = [
  { email: 'demo@zephix.ai', password: 'demo123456', firstName: 'Demo', lastName: 'User', role: 'admin' },
  { email: 'admin@zephix.ai', password: 'admin123456', firstName: 'Admin', lastName: 'User', role: 'admin' },
  { email: 'member@zephix.ai', password: 'member123456', firstName: 'Member', lastName: 'User', role: 'pm' },
  { email: 'guest@zephix.ai', password: 'guest123456', firstName: 'Guest', lastName: 'User', role: 'viewer' },
];

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
  });
  await client.connect();
  try {
    // Get or create org
    let org = await client.query('SELECT id FROM organizations WHERE slug = $1', ['demo']);
    let orgId: string;

    if (org.rows.length === 0) {
      const newOrg = await client.query(
        `INSERT INTO organizations (id, name, slug, status, created_at, updated_at) VALUES (gen_random_uuid(), 'Zephix Demo', 'demo', 'active', NOW(), NOW()) RETURNING id`
      );
      orgId = newOrg.rows[0].id;
      console.log('✅ Created demo organization');
    } else {
      orgId = org.rows[0].id;
    }

    for (const u of DEMO) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(`
        INSERT INTO users (id, email, password, first_name, last_name, role, organization_id, is_active, is_email_verified, email_verified_at, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, true, NOW(), NOW(), NOW())
        ON CONFLICT (email)
        DO UPDATE SET password = EXCLUDED.password,
                      role = EXCLUDED.role,
                      organization_id = EXCLUDED.organization_id,
                      updated_at = NOW();
      `, [u.email, hash, u.firstName, u.lastName, u.role, orgId]);
      process.stdout.write(`✓ ensured ${u.email} (${u.role})\n`);
    }
  } finally {
    await client.end();
  }
})();
