import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecurityTables1734567890002 implements MigrationInterface {
  name = 'AddSecurityTables1734567890002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // MFA table
    await queryRunner.query(`
      CREATE TABLE "user_mfa" (
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

    // Refresh tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
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

    // Create indexes for refresh tokens
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at");`);

    // Audit logs table - append only
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
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

    // Create indexes for audit logs
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp");`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id");`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action");`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_correlation_id" ON "audit_logs" ("correlation_id");`);

    // Login attempts tracking
    await queryRunner.query(`
      CREATE TABLE "login_attempts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255),
        "ip" varchar(45),
        "success" boolean,
        "attempted_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_attempts" PRIMARY KEY ("id")
      );
    `);

    // Create indexes for login attempts
    await queryRunner.query(`CREATE INDEX "IDX_login_attempts_email" ON "login_attempts" ("email");`);
    await queryRunner.query(`CREATE INDEX "IDX_login_attempts_ip" ON "login_attempts" ("ip");`);
    await queryRunner.query(`CREATE INDEX "IDX_login_attempts_attempted_at" ON "login_attempts" ("attempted_at");`);

    // Add security columns to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "email_verified" boolean DEFAULT false,
      ADD COLUMN "verification_token" varchar(255),
      ADD COLUMN "password_reset_token" varchar(255),
      ADD COLUMN "password_reset_expires" TIMESTAMP,
      ADD COLUMN "last_login_at" TIMESTAMP,
      ADD COLUMN "failed_login_attempts" integer DEFAULT 0,
      ADD COLUMN "locked_until" TIMESTAMP;
    `);

    // Create indexes for new user columns
    await queryRunner.query(`CREATE INDEX "IDX_users_email_verified" ON "users" ("email_verified");`);
    await queryRunner.query(`CREATE INDEX "IDX_users_verification_token" ON "users" ("verification_token");`);
    await queryRunner.query(`CREATE INDEX "IDX_users_password_reset_token" ON "users" ("password_reset_token");`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_password_reset_token";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_verification_token";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_verified";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_login_attempts_attempted_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_login_attempts_ip";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_login_attempts_email";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_correlation_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_action";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_actor_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_timestamp";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_expires_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_user_id";`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "login_attempts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_mfa";`);

    // Remove security columns from users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "locked_until",
      DROP COLUMN IF EXISTS "failed_login_attempts",
      DROP COLUMN IF EXISTS "last_login_at",
      DROP COLUMN IF EXISTS "password_reset_expires",
      DROP COLUMN IF EXISTS "password_reset_token",
      DROP COLUMN IF EXISTS "verification_token",
      DROP COLUMN IF EXISTS "email_verified";
    `);
  }
}
