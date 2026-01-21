# Phase 7 Integration Test Fix Plan

## Root Causes Identified

### 1. Test Command Execution Issues ✅ FIXED
- **Problem**: `load-test-env.sh` uses `exec "$@"` which replaces the shell, but `jest` may not be in PATH
- **Solution**: Updated script to use `npx jest` when jest command is detected

### 2. Jest Hanging/Timeout Issues 🔄 IN PROGRESS
- **Problem**: Tests don't exit cleanly, causing Jest to hang
- **Root causes**:
  - DataSource connections not properly closed
  - App not fully closed in afterAll
  - Background workers/cron jobs still running
  - TypeORM query logging still active

### 3. Test Output Piping Issues ✅ UNDERSTOOD
- **Problem**: Using `| head`, `| tail`, `| grep` causes Jest to hang because pipes close early
- **Solution**: Use `tee` to capture full output, then analyze the file

## Fix Plan

### Step 1: Fix Test Command Execution ✅
- Updated `load-test-env.sh` to use `npx jest` when jest command is detected
- This ensures jest is found in node_modules/.bin

### Step 2: Fix Jest Cleanup 🔄
- Added timeout to afterAll (60 seconds)
- Added cleanup timeout guard (30 seconds)
- Ensure all DataSource instances are destroyed
- Ensure app.close() is awaited properly
- Ensure moduleFixture.close() is called
- Disable TypeORM logging in test mode (already done in database.config.ts)

### Step 3: Fix Test Output Capture ✅
- Run tests with `tee` to capture full output
- Analyze log file after test completes or times out
- Don't use pipes that close early

### Step 4: Fix Remaining Code Issues ✅
- Migration column name detection (fixed)
- ProgramsModule DI (fixed - added ResourceModule import)
- Console.log guards (fixed - AppModule, ProjectsController, ProjectsService)

## Execution Order

1. ✅ Build passes
2. ✅ Migrations run
3. 🔄 Fix test cleanup in afterAll (added timeout)
4. 🔄 Run test with tee to capture output
5. 🔄 Analyze first failure from log
6. 🔄 Fix the root error
7. 🔄 Re-run until all tests pass

## Next Steps

1. Run test with timeout and proper output capture
2. Analyze the first actual error
3. Fix the root cause
4. Re-run until green
