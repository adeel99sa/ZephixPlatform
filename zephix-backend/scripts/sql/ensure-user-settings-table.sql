-- Run manually if `npm run migration:run` is blocked by a later migration:
--   psql "$DATABASE_URL" -f scripts/sql/ensure-user-settings-table.sql
-- Then register the migration row (see register-migration-ensure-user-settings.sql).
-- Matches UserSettings entity + migration 18000000000072-CreateUserSettingsTable.

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_settings_user') THEN
    ALTER TABLE user_settings
      ADD CONSTRAINT fk_user_settings_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_settings_organization') THEN
    ALTER TABLE user_settings
      ADD CONSTRAINT fk_user_settings_organization
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
