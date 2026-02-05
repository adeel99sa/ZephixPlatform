# Phase 7.4.3: Test Database Setup - Complete

## ✅ What Was Done

### 1. Files Created

- ✅ `zephix-backend/.env.test` - Test environment variables (gitignored)
- ✅ `zephix-backend/scripts/load-test-env.sh` - Script to load .env.test and execute commands
- ✅ `zephix-backend/scripts/verify-test-db.sh` - Quick database connection verification
- ✅ `zephix-backend/scripts/test-db-guardrail.ts` - TypeScript guardrail checker
- ✅ `docs/PHASE_7_4_3_TEST_SETUP.md` - Complete setup documentation

### 2. Files Modified

- ✅ `zephix-backend/package.json` - Added test scripts:
  - `migration:run:test` - Run migrations against test DB
  - `test:integration` - Run all integration tests
  - `test:integration:bulk` - Run bulk actions tests
  - `test:integration:my-work` - Run My Work tests
  - `test:integration:rollups` - Run rollups tests

- ✅ `.gitignore` - Added `.env.test` to ensure it's never committed

- ✅ Integration test files - Added guardrails to prevent production DB usage:
  - `work-items-bulk.integration.spec.ts`
  - `my-work.integration.spec.ts`
  - `rollups-phase6-closeout.integration.spec.ts`

### 3. Safety Guardrails

All integration tests now include:
- ✅ `NODE_ENV === 'test'` check
- ✅ `DATABASE_URL` presence check
- ✅ Production database rejection (checks for "production", "prod", "main")
- ✅ Automatic exit on violation

## ⚠️ What You Need to Do in Railway (Manual Steps)

### Step 1: Create Test Postgres Service

1. Go to Railway dashboard
2. In your project, click "+ New" → "Database" → "PostgreSQL"
3. Name it: `zephix-postgres-test`
4. Keep it in the same project as your backend

### Step 2: Create Test Environment

1. In Railway project, go to "Environments" tab
2. Click "+ New Environment"
3. Name it: `test`
4. Attach `zephix-backend` service to `test` environment
5. Attach `zephix-postgres-test` service to `test` environment only
6. **Do NOT** attach production Postgres to test environment

### Step 3: Set Environment Variables

In Railway `test` environment for `zephix-backend` service:

1. Go to `zephix-backend` → Variables tab (in `test` environment)
2. Add/Set:
   - `DATABASE_URL` = Copy from `zephix-postgres-test` service → Variables → `DATABASE_URL` (or `DATABASE_PUBLIC_URL`)
   - `NODE_ENV` = `test`
   - `JWT_SECRET` = Use a test-only secret (different from production)

### Step 4: Fill Local .env.test File

1. Open `zephix-backend/.env.test`
2. Copy `DATABASE_URL` from Railway `zephix-postgres-test` service
3. Copy `JWT_SECRET` from Railway `zephix-backend` service (test environment)
4. Save the file

## 🚀 Commands to Run (After Railway Setup)

### 1. Verify Test Database Connection

```bash
cd zephix-backend
./scripts/verify-test-db.sh
```

**Expected:** ✅ Database connected successfully

### 2. Run Migrations

```bash
cd zephix-backend
npm run migration:run:test
```

**Expected:** Migrations applied successfully

### 3. Run Integration Tests

```bash
cd zephix-backend

# Run all integration tests
npm run test:integration

# Or run specific test files:
npm run test:integration:bulk
npm run test:integration:my-work
npm run test:integration:rollups
```

## 📋 Current Migration Command

**Command:** `migration:run` = `npm run typeorm migration:run -- -d src/config/data-source.ts`

**How it works:**
- `data-source.ts` reads `DATABASE_URL` from `process.env.DATABASE_URL`
- The `load-test-env.sh` script loads `.env.test` before running
- TypeORM uses the DATABASE_URL to connect

## 🔒 Safety Features

1. **Script-level guardrails** - `load-test-env.sh` checks before executing
2. **Test file guardrails** - Each integration test file checks on import
3. **Gitignore protection** - `.env.test` is never committed
4. **Production DB rejection** - Any URL containing "production", "prod", or "main" is rejected

## 📝 Next Steps

1. ✅ Complete Railway setup (Steps 1-4 above)
2. ✅ Fill `.env.test` with values from Railway
3. ✅ Run `./scripts/verify-test-db.sh` to verify connection
4. ✅ Run `npm run migration:run:test` to apply migrations
5. ✅ Run `npm run test:integration:bulk` to test bulk actions
6. ✅ Run other integration tests
7. ✅ Proceed to Phase 7.5 once all tests pass

## 🎯 Verification Checklist

Before running tests, verify:

- [ ] `zephix-postgres-test` service exists in Railway
- [ ] `test` environment created in Railway
- [ ] `zephix-backend` attached to `test` environment
- [ ] `zephix-postgres-test` attached to `test` environment only
- [ ] `DATABASE_URL` set in Railway test environment
- [ ] `NODE_ENV=test` set in Railway test environment
- [ ] `JWT_SECRET` set in Railway test environment
- [ ] `.env.test` file filled with values
- [ ] `./scripts/verify-test-db.sh` succeeds
- [ ] Migrations run successfully

## 📚 Documentation

Full documentation: `docs/PHASE_7_4_3_TEST_SETUP.md`
