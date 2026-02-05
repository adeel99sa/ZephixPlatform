# Railway E2E Test Setup

## Prerequisites

1. Railway service shell access for `zephix-backend`
2. `DATABASE_URL` environment variable set in Railway
3. Optional: `ADMIN_DATABASE_URL` for privileged operations

## Steps

### 1. Open Railway Service Shell

In Railway dashboard:
- Navigate to your `zephix-backend` service
- Open the service shell/terminal

### 2. Set Environment Variables

```bash
cd zephix-backend

# DATABASE_URL should already be set in Railway
# Verify it's set:
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."

# If ADMIN_DATABASE_URL is not set, create it from DATABASE_URL
# Extract connection details and point to 'postgres' database
# Example pattern:
# postgresql://admin_user:admin_pass@host:port/postgres

# If your DATABASE_URL user has admin privileges, you can use:
export ADMIN_DATABASE_URL="${DATABASE_URL%/*}/postgres"
```

### 3. Reset Test Database

```bash
bash scripts/reset-test-db.sh
```

**Expected output:**
- Connection summary with masked passwords
- Safety check passes (database name contains "test" or "e2e")
- Database dropped and recreated
- Migrations run successfully

### 4. Verify Migrations

```bash
npm run migration:show
npm run migration:run
```

**Expected:**
- `Phase5WorkManagementCore1767637754000` shows as `[X]` executed
- No "column does not exist" errors

### 5. Run E2E Route Order Guard Test

```bash
npm run test:e2e -- work-management-routing.e2e-spec.ts
```

**Expected:**
- All tests pass
- Routes return `403 WORKSPACE_REQUIRED` (not `404 Task not found`)
- No route shadowing detected

## Troubleshooting

### Reset Script Fails

**Error: "Database name does not contain 'test' or 'e2e'"**
- The safety check is working
- Rename your database to include "test" or "e2e" in the name
- Or temporarily comment out the safety check (not recommended)

**Error: "role does not exist" or "permission denied"**
- Set `ADMIN_DATABASE_URL` to a connection with admin privileges
- Or grant the DATABASE_URL user permissions to drop/create databases

**Error: "column does not exist" during migration**
- Database is dirty from previous failed migration
- Run reset script again to clean state

### Migration Fails

**Error: "Migration already executed"**
- Check `migrations` table: `SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;`
- If Phase5WorkManagementCore is marked executed but tables don't exist, manually remove the migration record

**Error: "table already exists"**
- Database is dirty
- Run reset script to clean state

### E2E Test Fails

**Error: "404 Task not found" instead of "403 WORKSPACE_REQUIRED"**
- Route shadowing detected - static routes are being caught by `:id` handler
- Check controller route order in `work-tasks.controller.ts`
- Verify CI route order guard passes

**Error: "Cannot connect to database"**
- Verify DATABASE_URL is set correctly
- Check Railway service has database access
- Verify network connectivity

## Success Criteria

✅ Reset script prints masked connection summary  
✅ Safety check passes (database name contains "test" or "e2e")  
✅ Migration:run finishes with no "column does not exist" errors  
✅ E2E routing test returns 403 WORKSPACE_REQUIRED, not 404  
✅ All route order guard tests pass

