# Phase 7.4.3: Test Database Setup for Integration Tests

## Overview

This document describes how to set up and use the Railway test Postgres database (`zephix-postgres-test`) for running integration tests safely without touching production.

## Prerequisites

1. **Railway Setup** (Manual - do in Railway dashboard):
   - Create `zephix-postgres-test` service (new Postgres)
   - Create `test` environment in Railway
   - Attach `zephix-backend` to both `production` and `test` environments
   - Attach `zephix-postgres-test` only to `test` environment
   - Set environment variables in `test` environment for `zephix-backend`:
     - `DATABASE_URL` = connection string from `zephix-postgres-test`
     - `NODE_ENV` = `test`
     - `JWT_SECRET` = test-only secret (different from production)

## Local Setup

### Step 1: Get Values from Railway

1. Go to Railway dashboard
2. Open `zephix-postgres-test` service → Variables tab
3. Copy `DATABASE_URL` (or `DATABASE_PUBLIC_URL` if `DATABASE_URL` not available)
4. Open `zephix-backend` service → Variables tab (in test environment)
5. Copy `JWT_SECRET`

### Step 2: Create .env.test File

The file `zephix-backend/.env.test` has been created with placeholders. Fill in the values:

```bash
cd zephix-backend
# Edit .env.test and add:
DATABASE_URL=postgresql://user:pass@hostname.railway.app:5432/railway
JWT_SECRET=your-test-jwt-secret-here
NODE_ENV=test
```

**Important:** `.env.test` is gitignored - never commit it.

### Step 3: Verify Test Database Connection

```bash
cd zephix-backend
./scripts/verify-test-db.sh
```

Expected output:
```
✅ Connecting to test database host: <hostname>
✅ Database connected successfully
✅ Found tables: users, organizations, ...
```

## Running Migrations

Run migrations against the test database:

```bash
cd zephix-backend
npm run migration:run:test
```

This script:
1. Loads `.env.test`
2. Verifies it's not production DB
3. Runs migrations using TypeORM

## Running Integration Tests

### Run All Integration Tests

```bash
cd zephix-backend
npm run test:integration
```

### Run Specific Test Files

```bash
# Bulk actions tests
npm run test:integration:bulk

# My Work tests
npm run test:integration:my-work

# Rollups tests
npm run test:integration:rollups
```

## Safety Guardrails

### Automatic Checks

All integration test files include guardrails that:
1. ✅ Check `NODE_ENV === 'test'`
2. ✅ Verify `DATABASE_URL` is set
3. ✅ Reject `DATABASE_URL` containing "production", "prod", or "main"
4. ✅ Exit with error if any check fails

### Script-Level Checks

The `load-test-env.sh` script performs the same checks before executing any command.

## Available NPM Scripts

| Script | Description |
|--------|-------------|
| `migration:run:test` | Run migrations against test DB |
| `test:integration` | Run all integration tests |
| `test:integration:bulk` | Run bulk actions integration tests |
| `test:integration:my-work` | Run My Work integration tests |
| `test:integration:rollups` | Run rollups integration tests |

## Troubleshooting

### Error: "DATABASE_URL appears to be production"

**Cause:** Your `.env.test` file contains a production database URL.

**Fix:**
1. Verify you copied the URL from `zephix-postgres-test` service, not the production Postgres
2. Check that the hostname doesn't contain "production" or "prod"

### Error: "NODE_ENV must be 'test'"

**Cause:** `NODE_ENV` is not set to `test` in `.env.test`.

**Fix:** Ensure `.env.test` contains `NODE_ENV=test`

### Error: "DATABASE_URL is not set"

**Cause:** `.env.test` file is missing or `DATABASE_URL` is empty.

**Fix:**
1. Verify `.env.test` exists in `zephix-backend/` directory
2. Ensure `DATABASE_URL` has a value (not empty)

### Error: "Unable to connect to the database"

**Cause:** Test database is not accessible or credentials are wrong.

**Fix:**
1. Verify `zephix-postgres-test` service is running in Railway
2. Check that `DATABASE_URL` is correct (copy fresh from Railway)
3. Ensure the database is in the same Railway project as backend

## Manual Verification

After running migrations, verify tables exist:

```bash
cd zephix-backend
./scripts/verify-test-db.sh
```

Or use psql directly (if available):

```bash
# Extract connection details from DATABASE_URL
psql "$DATABASE_URL" -c "\dt" | head -20
```

## Test Execution Summary

After running tests, you should see output like:

```
✅ Test database guardrail passed
   Host: <hostname>.railway.app
   NODE_ENV: test

PASS  src/modules/work-items/work-items-bulk.integration.spec.ts
  Work Items Bulk Actions (e2e)
    POST /work-items/bulk/update
      ✓ 1. Guest bulk update blocked
      ✓ 2. Member bulk update allowed in own workspace
      ...
```

## Next Steps

Once tests pass:
1. ✅ Phase 7.4.3 is complete
2. ✅ Ready for Phase 7.5 (Permissions Enforcement Sweep)
3. ✅ Integration tests can be run before each deployment

## Files Created/Modified

- ✅ `zephix-backend/.env.test` (gitignored)
- ✅ `zephix-backend/scripts/load-test-env.sh`
- ✅ `zephix-backend/scripts/verify-test-db.sh`
- ✅ `zephix-backend/scripts/test-db-guardrail.ts`
- ✅ `zephix-backend/package.json` (added test scripts)
- ✅ `.gitignore` (added `.env.test`)
- ✅ Integration test files (added guardrails)
