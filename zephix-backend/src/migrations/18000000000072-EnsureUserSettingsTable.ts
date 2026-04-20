import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures `user_settings` exists for GET/PATCH /users/me/preferences (Admin Preferences UI).
 * The table was previously only in migrations-archive; new local DBs never created it.
 * Matches `UserSettings` entity (snake_case columns).
 *
 * Note: Uses timestamp **18000000000072** (not 68) to avoid colliding with
 * `18000000000068-StabilizeGovernanceCatalogRuleDefinitions.ts` in the same folder.
 */
export class EnsureUserSettingsTable18000000000072 implements MigrationInterface {
  name = 'EnsureUserSettingsTable18000000000072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        organization_id uuid NOT NULL,
        preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
        notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
        theme character varying(20) NOT NULL DEFAULT 'light',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_settings_user_org UNIQUE (user_id, organization_id)
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_settings_user'
        ) THEN
          ALTER TABLE user_settings
            ADD CONSTRAINT fk_user_settings_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_settings_organization'
        ) THEN
          ALTER TABLE user_settings
            ADD CONSTRAINT fk_user_settings_organization
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_settings`);
  }
}
