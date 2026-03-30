import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const PROOF_EMAIL = process.env.PROOF_USER_EMAIL || 'proof.e2e@zephix.dev';
const PROOF_PASSWORD = process.env.PROOF_USER_PASSWORD || 'ProofPass123!@#';
const PROOF_ORG_NAME = process.env.PROOF_ORG_NAME || 'Proof E2E Organization';
const PROOF_ORG_SLUG = process.env.PROOF_ORG_SLUG || 'proof-e2e-org';

async function main() {
  const client = new Client(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_URL.includes('railway')
            ? { rejectUnauthorized: false }
            : undefined,
        }
      : {
          host: process.env.DATABASE_HOST || 'localhost',
          port: Number(process.env.DATABASE_PORT || 5432),
          user: process.env.DATABASE_USER || 'zephix_user',
          password: process.env.DATABASE_PASSWORD || 'zephix_password',
          database: process.env.DATABASE_NAME || 'zephix_auth_db',
        },
  );

  await client.connect();
  try {
    const orgResult = await client.query(
      `SELECT id FROM organizations WHERE slug = $1 LIMIT 1`,
      [PROOF_ORG_SLUG],
    );
    let organizationId = orgResult.rows[0]?.id as string | undefined;
    if (!organizationId) {
      const insertedOrg = await client.query(
        `INSERT INTO organizations (name, slug, status, settings)
         VALUES ($1, $2, 'trial', $3::jsonb)
         RETURNING id`,
        [
          PROOF_ORG_NAME,
          PROOF_ORG_SLUG,
          JSON.stringify({
            resourceManagement: {
              maxAllocationPercentage: 150,
              warningThreshold: 80,
              criticalThreshold: 100,
            },
          }),
        ],
      );
      organizationId = insertedOrg.rows[0]?.id as string | undefined;
    }
    if (!organizationId) throw new Error('Failed to resolve proof organization id');

    const passwordHash = await bcrypt.hash(PROOF_PASSWORD, 12);
    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [PROOF_EMAIL.toLowerCase()],
    );

    let userId: string;
    if (existingUser.rowCount && existingUser.rows[0]?.id) {
      userId = existingUser.rows[0].id as string;
      await client.query(
        `UPDATE users
         SET password = $2,
             first_name = COALESCE(first_name, 'Proof'),
             last_name = COALESCE(last_name, 'User'),
             is_active = true,
             is_email_verified = true,
             email_verified_at = COALESCE(email_verified_at, NOW()),
             role = 'ADMIN',
             organization_id = $3,
             onboarding_completed = false
         WHERE id = $1`,
        [userId, passwordHash, organizationId],
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO users (
          email, password, first_name, last_name, is_active,
          is_email_verified, email_verified_at, role, organization_id, onboarding_completed
        )
        VALUES ($1, $2, 'Proof', 'User', true, true, NOW(), 'ADMIN', $3, false)
        RETURNING id`,
        [PROOF_EMAIL.toLowerCase(), passwordHash, organizationId],
      );
      userId = inserted.rows[0].id as string;
    }

    await client.query(
      `UPDATE user_organizations
       SET "isActive" = false
       WHERE user_id = $1 AND organization_id <> $2`,
      [userId, organizationId],
    );

    const existingUserOrg = await client.query(
      `SELECT id FROM user_organizations WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
      [userId, organizationId],
    );
    if (existingUserOrg.rowCount && existingUserOrg.rows[0]?.id) {
      await client.query(
        `UPDATE user_organizations
         SET role = 'admin', "isActive" = true
         WHERE id = $1`,
        [existingUserOrg.rows[0].id],
      );
    } else {
      await client.query(
        `INSERT INTO user_organizations (user_id, organization_id, role, "isActive", "joinedAt")
         VALUES ($1, $2, 'admin', true, NOW())`,
        [userId, organizationId],
      );
    }

    await client.query(
      `UPDATE workspaces
       SET deleted_at = COALESCE(deleted_at, NOW())
       WHERE organization_id = $1`,
      [organizationId],
    );

    console.log(
      JSON.stringify({
        ok: true,
        email: PROOF_EMAIL.toLowerCase(),
        password: PROOF_PASSWORD,
        organizationId,
        userId,
        onboardingCompleted: false,
      }),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
