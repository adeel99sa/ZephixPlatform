-- After applying `ensure-user-settings-table.sql` manually, register the migration row
-- so boot-time schema verification passes. Uses **072** (not 068) — see migration file
-- `18000000000072-EnsureUserSettingsTable.ts` (068 collides with governance migration).
--
-- Timestamp convention (matches TypeORM): 18000000000072 -> 8000000000072

INSERT INTO migrations (timestamp, name)
SELECT 8000000000072, 'EnsureUserSettingsTable18000000000072'
WHERE NOT EXISTS (
  SELECT 1 FROM migrations WHERE name = 'EnsureUserSettingsTable18000000000072'
);

-- If you previously registered the wrong name (068), remove it:
-- DELETE FROM migrations WHERE name = 'EnsureUserSettingsTable18000000000068';
