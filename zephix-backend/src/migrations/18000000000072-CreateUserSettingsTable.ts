import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `user_settings` to match {@link UserSettings} (users/entities/user-settings.entity.ts).
 * Idempotent: safe to re-run.
 */
export class CreateUserSettingsTable18000000000072 implements MigrationInterface {
  name = 'CreateUserSettingsTable18000000000072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "preferences" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "notifications" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "theme" character varying(20) NOT NULL DEFAULT 'light',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_settings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_settings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_settings_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_settings_unique"
      ON "user_settings" ("user_id", "organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_settings_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings"`);
  }
}
