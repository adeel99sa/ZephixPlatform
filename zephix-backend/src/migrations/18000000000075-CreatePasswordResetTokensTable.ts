import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Password reset tokens: hashed only, single-use, 1h expiry (enforced in AuthService).
 * Idempotent: safe to re-run.
 */
export class CreatePasswordResetTokensTable18000000000075
  implements MigrationInterface
{
  name = 'CreatePasswordResetTokensTable18000000000075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "consumed" boolean NOT NULL DEFAULT false,
        "consumed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_reset_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_user_id"
      ON "password_reset_tokens" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_expires_at"
      ON "password_reset_tokens" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_reset_expires_at"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_password_reset_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
