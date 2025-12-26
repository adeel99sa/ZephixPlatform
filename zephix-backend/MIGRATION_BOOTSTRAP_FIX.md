# Migration Bootstrap Fix - Railway Database

## Problem Summary

Two critical issues were blocking migrations on Railway:

1. **Database Connection Mismatch**: Migrations might be running against a different database than expected (local vs Railway)
2. **Missing Bootstrap Migration**: The migration chain cannot bootstrap a fresh database because core tables (users, organizations, workspaces, projects) are missing before other migrations try to reference them.

## Solution Implemented

### 1. Database Fingerprint Script

Created `scripts/db-fingerprint.ts` to verify which database migrations are actually running against.

**Usage:**
```bash
cd zephix-backend
npm run db:fingerprint
```

**What it shows:**
- Database name
- Server IP and port
- PostgreSQL version
- Number of migrations executed
- DATABASE_URL (with password masked)
- NODE_ENV

**Expected output for Railway:**
- `database_url_host` should contain `ballast.proxy.rlwy.net` or similar Railway domain
- `server_ip` should be a Railway IP address

### 2. Bootstrap Migration

Created `src/migrations/0000000000000-InitCoreSchema.ts` with the lowest timestamp to ensure it runs first.

**What it creates:**
1. **UUID extension** - Tries pgcrypto, falls back to uuid-ossp, or uses built-in gen_random_uuid() (PostgreSQL 13+)
2. **organizations table** - Base multi-tenancy table
3. **users table** - Base user table with all required columns
   - **NOTE**: `organization_id` column exists but has NO foreign key constraint
   - `user_organizations` table is the source of truth for org membership
   - `users.organization_id` is kept for legacy compatibility only
4. **user_organizations table** - Join table for user-organization relationships (source of truth)
   - Uses camelCase column names (userId, organizationId) to match existing schema
5. **workspaces table** - Workspace table (required by projects)
6. **projects table** - Minimal projects schema (will be extended by later migrations)

**Key features:**
- Uses `IF NOT EXISTS` guards to be safe if tables already exist
- Creates all foreign key relationships (except users.organization_id - deprecated)
- Creates essential indexes
- **NO test user inserts** - Use seed scripts instead
- Uses proper column names: camelCase for user_organizations (matches existing), snake_case for others

## Migration Order

The bootstrap migration will run first (timestamp `0000000000000`), then:

1. `0000000000000-InitCoreSchema.ts` - Creates core tables
2. `1756696874831-ProductionBaseline2025.ts` - Empty (no-op)
3. `1757000000000-EnsureProjectsTableExists.ts` - Ensures projects table (now redundant but safe)
4. `1757227595839-AddProjectPhases.ts` - Adds project phases (now works because projects exists)
5. `1757227595840-CreateResourceManagementSystem.ts` - Creates resources (now works because users and organizations exist)
6. ... rest of migrations

## Verification Steps

### Step 1: Verify Database Connection

```bash
cd zephix-backend
npm run db:fingerprint
```

**Check:**
- Is `database_url_host` pointing to Railway?
- Does `migrations_rows` match what you expect?

### Step 2: Run Migrations

```bash
cd zephix-backend
npm run migration:run
```

**Expected:**
- Bootstrap migration runs first
- All subsequent migrations run without "relation does not exist" errors

### Step 3: Verify Core Tables Exist

Run the verification script:

```bash
cd zephix-backend
npm run db:verify-bootstrap
```

Or manually connect to Railway database and run:

```sql
SELECT to_regclass('public.users');
SELECT to_regclass('public.organizations');
SELECT to_regclass('public.workspaces');
SELECT to_regclass('public.projects');
SELECT to_regclass('public.user_organizations');
```

All should return the table name (not null).

**Verification script checks:**
- Core tables exist
- Migration count
- No test users (test@zephix.com)
- user_organizations structure
- No FK constraint on users.organization_id (correct - user_organizations is source of truth)

### Step 4: Check Migration Status

```bash
cd zephix-backend
npm run migration:show
```

Should show all migrations as executed, including the bootstrap migration.

## Common Issues and Fixes

### Issue: "relation 'users' does not exist"

**Cause:** Bootstrap migration didn't run or failed.

**Fix:**
1. Check migration order: `npm run migration:show`
2. If bootstrap migration is missing, it should be first in the list
3. If it failed, check error logs and fix the issue
4. Re-run: `npm run migration:run`

### Issue: Database fingerprint shows localhost instead of Railway

**Cause:** DATABASE_URL environment variable is pointing to local database.

**Fix:**
1. Check `.env` file - ensure `DATABASE_URL` points to Railway
2. Check Railway environment variables - ensure `DATABASE_URL` is set correctly
3. If running migrations via CLI, ensure you're using Railway DATABASE_URL:
   ```bash
   DATABASE_URL="postgresql://..." npm run migration:run
   ```

### Issue: "migration already executed" but tables don't exist

**Cause:** Migration was marked as executed but failed partway through.

**Fix:**
1. Manually remove the migration record:
   ```sql
   DELETE FROM migrations WHERE name = 'InitCoreSchema0000000000000';
   ```
2. Re-run migrations: `npm run migration:run`

## Files Changed

1. `zephix-backend/scripts/db-fingerprint.ts` - New file (verifies database connection)
2. `zephix-backend/scripts/verify-migration-bootstrap.ts` - New file (verifies bootstrap results)
3. `zephix-backend/src/migrations/0000000000000-InitCoreSchema.ts` - New file (bootstrap migration)
4. `zephix-backend/src/migrations/1757255630596-CreateUsersTable.ts` - Updated (removed test user, made no-op)
5. `zephix-backend/package.json` - Added `db:fingerprint` and `db:verify-bootstrap` scripts

## Critical Fixes Applied

1. ✅ **Removed test user insert** from CreateUsersTable migration
2. ✅ **Removed FK constraint** on users.organization_id (user_organizations is source of truth)
3. ✅ **Kept users.organization_id column** for legacy compatibility (nullable, no FK)
4. ✅ **Consistent naming**: camelCase for user_organizations (matches existing), snake_case for others
5. ✅ **Extension handling**: Tries pgcrypto → uuid-ossp → built-in gen_random_uuid()
6. ✅ **CreateUsersTable made no-op** for fresh installs (bootstrap handles it)

## Next Steps

1. **Run fingerprint script** to verify Railway connection
2. **Run migrations** on Railway
3. **Verify core tables exist**
4. **Continue with Template Center v1 migrations** - they should now run successfully

## Notes

- The bootstrap migration uses `IF NOT EXISTS` guards, so it's safe to run multiple times
- Column names match entity definitions (camelCase for user_organizations, snake_case for others)
- Foreign keys are created with appropriate CASCADE/SET NULL behavior
- The migration is idempotent - safe to run on databases that already have some tables

