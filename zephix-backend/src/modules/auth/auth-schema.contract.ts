// zephix-backend/src/modules/auth/auth-schema.contract.ts
// Single source of truth for auth schema. Do not import TypeORM entities here.

export const AUTH_REQUIRED_TABLES = [
  'users',
  'organizations',
  'user_organizations',
  'auth_sessions',
] as const;

// Real database column names only (snake_case). Do not use entity property names.
export const AUTH_REQUIRED_COLUMNS: Array<{
  table: string;
  column: string;
}> = [
  { table: 'users', column: 'id' },
  { table: 'users', column: 'email' },
  { table: 'users', column: 'password' },
  { table: 'organizations', column: 'id' },
  // user_organizations: snake_case (migration 20260201090000 adds and backfills; camelCase columns kept for 1–2 deploys)
  { table: 'user_organizations', column: 'user_id' },
  { table: 'user_organizations', column: 'organization_id' },
  { table: 'auth_sessions', column: 'user_id' },
  { table: 'auth_sessions', column: 'current_refresh_token_hash' },
  { table: 'auth_sessions', column: 'refresh_expires_at' },
  // Nullable; login does not depend on it being non-null. Required to exist (migrations gate it).
  { table: 'auth_sessions', column: 'last_active_organization_id' },
] as const;

export const AUTH_REQUIRED_MIGRATIONS_MIN_COUNT = 1 as const;
