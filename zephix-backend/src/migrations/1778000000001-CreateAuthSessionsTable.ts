import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature 2A: Create auth_sessions table for server-side session management
 *
 * Stores:
 * - Session metadata (user, org, device info)
 * - Refresh token hash (never plain token)
 * - Last seen timestamp
 * - Revocation status
 */
export class CreateAuthSessionsTable1778000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create auth_sessions table
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "user_agent" text NULL,
        "ip_address" varchar(45) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_seen_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz NULL,
        "revoke_reason" text NULL,
        "current_refresh_token_hash" varchar(64) NULL,
        "refresh_expires_at" timestamptz NULL,
        CONSTRAINT "PK_auth_sessions" PRIMARY KEY ("id")
      )
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "auth_sessions"
      ADD CONSTRAINT "FK_auth_sessions_organization"
      FOREIGN KEY ("organization_id")
      REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "auth_sessions"
      ADD CONSTRAINT "FK_auth_sessions_user"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_auth_sessions_user"
      ON "auth_sessions" ("user_id", "last_seen_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_sessions_user_active"
      ON "auth_sessions" ("user_id", "revoked_at")
      WHERE "revoked_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_sessions_organization"
      ON "auth_sessions" ("organization_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_sessions_token_hash"
      ON "auth_sessions" ("current_refresh_token_hash")
      WHERE "current_refresh_token_hash" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_sessions_token_hash"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_sessions_organization"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_auth_sessions_user_active"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_auth_sessions_user"`);

    await queryRunner.query(`
      ALTER TABLE "auth_sessions"
      DROP CONSTRAINT IF EXISTS "FK_auth_sessions_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "auth_sessions"
      DROP CONSTRAINT IF EXISTS "FK_auth_sessions_organization"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "auth_sessions"`);
  }
}
