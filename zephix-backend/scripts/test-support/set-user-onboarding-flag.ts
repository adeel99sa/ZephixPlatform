import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

type E2EIds = {
  auth?: { email?: string };
};

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex((arg) => arg === `--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function readDefaultEmailFromSeed(): string | undefined {
  const filePath = resolve(process.cwd(), '..', 'scripts', 'smoke', 'e2e-ids.json');
  if (!existsSync(filePath)) return undefined;
  const payload = JSON.parse(readFileSync(filePath, 'utf-8')) as E2EIds;
  return payload.auth?.email;
}

async function main() {
  const emailArg = getArg('email');
  const valueArg = getArg('value');
  const email = emailArg || readDefaultEmailFromSeed();
  const value = valueArg === 'true' ? true : valueArg === 'false' ? false : undefined;

  if (!email) {
    throw new Error('Missing --email and no default found in scripts/smoke/e2e-ids.json');
  }
  if (value === undefined) {
    throw new Error('Missing --value true|false');
  }

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
    const result = await client.query(
      `UPDATE users
       SET onboarding_completed = $2
       WHERE email = $1
       RETURNING id, email, onboarding_completed`,
      [email.toLowerCase(), value],
    );

    if (result.rowCount === 0) {
      throw new Error(`No user found for email ${email}`);
    }

    const updated = result.rows[0];
    console.log(
      JSON.stringify({
        ok: true,
        userId: updated.id,
        email: updated.email,
        onboardingCompleted: updated.onboarding_completed,
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
