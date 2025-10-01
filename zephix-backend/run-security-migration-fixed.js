const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:IzCgTGNmVDQHunqICLyuUbMEtfWaSMmL@ballast.proxy.rlwy.net:38318/railway',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to Railway database');

    // MFA table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user_mfa" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "secret" varchar(255) NOT NULL,
        "backup_codes" text[],
        "is_enabled" boolean DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP,
        CONSTRAINT "PK_user_mfa" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_mfa_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_mfa_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    console.log('✅ Created user_mfa table');

    // Refresh tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "jti" varchar(255) NOT NULL,
        "device_name" varchar(255),
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    console.log('✅ Created refresh_tokens table');

    // Create indexes for refresh tokens
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");`);
    console.log('✅ Created refresh_tokens indexes');

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        "correlation_id" varchar(255) NOT NULL,
        "actor_id" uuid,
        "organization_id" uuid,
        "action" varchar(100) NOT NULL,
        "target" varchar(255),
        "result" varchar(50) NOT NULL,
        "ip" varchar(45),
        "user_agent" text,
        "metadata" jsonb,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Created audit_logs table');

    // Create indexes for audit logs
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_action" ON "audit_logs" ("action");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_correlation_id" ON "audit_logs" ("correlation_id");`);
    console.log('✅ Created audit_logs indexes');

    // Login attempts tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS "login_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255),
        "ip" varchar(45),
        "success" boolean,
        "attempted_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_attempts" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Created login_attempts table');

    // Create indexes for login attempts
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_login_attempts_email" ON "login_attempts" ("email");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_login_attempts_ip" ON "login_attempts" ("ip");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_login_attempts_attempted_at" ON "login_attempts" ("attempted_at");`);
    console.log('✅ Created login_attempts indexes');

    // Check if security columns already exist in users table
    const userColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('email_verified', 'verification_token', 'password_reset_token', 'password_reset_expires', 'last_login_at', 'failed_login_attempts', 'locked_until');
    `);

    const existingColumns = userColumns.rows.map(row => row.column_name);
    console.log('Existing security columns in users table:', existingColumns);

    // Add missing security columns to users table
    const missingColumns = [
      { name: 'email_verified', type: 'boolean DEFAULT false' },
      { name: 'verification_token', type: 'varchar(255)' },
      { name: 'password_reset_token', type: 'varchar(255)' },
      { name: 'password_reset_expires', type: 'TIMESTAMP' },
      { name: 'last_login_at', type: 'TIMESTAMP' },
      { name: 'failed_login_attempts', type: 'integer DEFAULT 0' },
      { name: 'locked_until', type: 'TIMESTAMP' }
    ];

    for (const column of missingColumns) {
      if (!existingColumns.includes(column.name)) {
        await client.query(`ALTER TABLE "users" ADD COLUMN "${column.name}" ${column.type};`);
        console.log(`✅ Added ${column.name} column to users table`);
      } else {
        console.log(`⚠️ Column ${column.name} already exists in users table`);
      }
    }

    // Create indexes for new user columns (only if they don't exist)
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS "IDX_users_email_verified" ON "users" ("email_verified");`,
      `CREATE INDEX IF NOT EXISTS "IDX_users_verification_token" ON "users" ("verification_token");`,
      `CREATE INDEX IF NOT EXISTS "IDX_users_password_reset_token" ON "users" ("password_reset_token");`
    ];

    for (const query of indexQueries) {
      await client.query(query);
    }
    console.log('✅ Created user security indexes');

    console.log('🎉 Security migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
