const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:IzCgTGNmVDQHunqICLyuUbMEtfWaSMmL@ballast.proxy.rlwy.net:38318/railway',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to Railway database');

    // 1. Create MFA table
    console.log('Creating user_mfa table...');
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
        CONSTRAINT "UQ_user_mfa_user_id" UNIQUE ("user_id")
      );
    `);
    console.log('✅ Created user_mfa table');

    // 2. Create refresh tokens table
    console.log('Creating refresh_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "jti" varchar(255) NOT NULL,
        "device_name" varchar(255),
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Created refresh_tokens table');

    // 3. Create audit logs table
    console.log('Creating audit_logs table...');
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

    // 4. Create login attempts table
    console.log('Creating login_attempts table...');
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

    // 5. Add foreign key constraints
    console.log('Adding foreign key constraints...');
    try {
      await client.query(`
        ALTER TABLE "user_mfa" 
        ADD CONSTRAINT "FK_user_mfa_user_id" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      `);
      console.log('✅ Added foreign key to user_mfa');
    } catch (error) {
      if (error.code === '42710') {
        console.log('⚠️ Foreign key already exists for user_mfa');
      } else {
        throw error;
      }
    }

    try {
      await client.query(`
        ALTER TABLE "refresh_tokens" 
        ADD CONSTRAINT "FK_refresh_tokens_user_id" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      `);
      console.log('✅ Added foreign key to refresh_tokens');
    } catch (error) {
      if (error.code === '42710') {
        console.log('⚠️ Foreign key already exists for refresh_tokens');
      } else {
        throw error;
      }
    }

    // 6. Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");',
      'CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");',
      'CREATE INDEX IF NOT EXISTS "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp");',
      'CREATE INDEX IF NOT EXISTS "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id");',
      'CREATE INDEX IF NOT EXISTS "IDX_audit_logs_action" ON "audit_logs" ("action");',
      'CREATE INDEX IF NOT EXISTS "IDX_audit_logs_correlation_id" ON "audit_logs" ("correlation_id");',
      'CREATE INDEX IF NOT EXISTS "IDX_login_attempts_email" ON "login_attempts" ("email");',
      'CREATE INDEX IF NOT EXISTS "IDX_login_attempts_ip" ON "login_attempts" ("ip");',
      'CREATE INDEX IF NOT EXISTS "IDX_login_attempts_attempted_at" ON "login_attempts" ("attempted_at");'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log(`✅ Created index: ${indexQuery.split('"')[1]}`);
      } catch (error) {
        console.log(`⚠️ Index might already exist: ${error.message}`);
      }
    }

    console.log('🎉 Security migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
