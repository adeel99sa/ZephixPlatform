# Production Fix Execution Guide

## Root Cause Summary

1. **Backend restart loops** - `NODE_TLS_REJECT_UNAUTHORIZED=0` is set in Railway backend variables
2. **Security exit** - Code now exits on purpose when it detects that variable (see `zephix-backend/src/main.ts:11-22`)
3. **Missing migrations** - `auth_outbox` table does not exist because migrations did not run on production database

## Fix Sequence (Execute in Order)

### Step 1: Remove Insecure TLS Override

**Railway Dashboard Steps:**
1. Go to Railway Dashboard → `zephix-backend` service
2. Click **Variables** tab
3. Search for `NODE_TLS_REJECT_UNAUTHORIZED`
4. **Delete** the variable (click trash icon)
5. **Also check:**
   - Shared environment groups (if any)
   - Service-specific variables
   - Any plugins that might inject it
6. **Save changes**

**Verification:**
- Variable should not appear in Variables list
- No other service should have this variable

### Step 2: Confirm Backend Starts

**Check Deployment Logs:**
After removing the variable, Railway will auto-redeploy. Watch deployment logs for:

```
✅ Nest application successfully started
✅ API endpoints available at: http://localhost:PORT/api
```

**If you still see:**
```
❌ SECURITY ERROR: NODE_TLS_REJECT_UNAUTHORIZED=0 is set
   Exiting in production to prevent insecure deployment.
```

**Then:**
- Variable was not removed in the right scope
- Check shared environment groups
- Check if another service is injecting it

### Step 3: Run Migrations One Time

**Railway Dashboard Steps:**
1. Go to Railway Dashboard → `zephix-backend` service
2. Click **Deployments** tab
3. Click **New Deployment** → **One-Time Command**
4. **Command:**
   ```bash
   cd zephix-backend && npm run migration:run
   ```
5. **Wait for completion** (should show migration execution logs)
6. **Restart backend service** (after migration completes)

**Expected Output:**
```
query: SELECT * FROM "migrations" ORDER BY "id" DESC
query: CREATE TABLE "auth_outbox" ...
query: CREATE TABLE "org_invites" ...
query: CREATE TABLE "email_verification_tokens" ...
Migration CreateAuthTables1770000000001 has been executed successfully.
```

### Step 4: Confirm Tables Exist

**Check Backend Logs:**
After restart, logs should show:
- ✅ No `relation "auth_outbox" does not exist` errors
- ✅ `OutboxProcessorService` running (or disabled gracefully if still missing)
- ✅ Auth routes registered

**Verify via Railway One-Time Command:**
```bash
psql $DATABASE_URL -c "\d auth_outbox"
psql $DATABASE_URL -c "\d org_invites"
psql $DATABASE_URL -c "\d email_verification_tokens"
```

All should return table definitions.

## Production Verification Checklist

### 1. Startup Routing ✅

**Find in backend logs:**
```
[RoutesResolver] AuthController {/api/auth}
Mapped {/api/auth/register, POST} route
```

**If missing:**
- Controller dependency resolution failed
- Check logs for dependency injection errors
- Verify all auth module dependencies are available

### 2. Swagger Documentation ✅

**Open in browser:**
```
https://zephix-backend-production.up.railway.app/api/docs
```

**Verify:**
- ✅ Auth tag exists
- ✅ POST /api/auth/register exists
- ✅ Request/response schemas are visible

### 3. Register Endpoint ✅

**Test request:**
```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "fullName": "Test User",
    "orgName": "Test Org"
  }'
```

**Expected:**
- ✅ 200 (success) or 400 (validation error)
- ❌ NOT 404 (route not found)

**If 404:**
- Controller not loaded
- Check dependency resolution errors in logs
- Verify AuthModule is imported in AppModule

### 4. Frontend Quick Check ✅

**Browser DevTools:**
1. Open `https://getzephix.com`
2. Open DevTools → Network tab
3. Attempt signup/register
4. **Verify:**
   - ✅ Auth requests go to backend domain
   - ✅ No CORS errors
   - ✅ Requests return 200/400 (not 404)

## Why Register Looked Like 404 Earlier

**Root Cause:**
When NestJS fails to resolve a controller dependency, `AuthController` never loads.
- No controller = No routes
- Result: 404 on all `/api/auth/*` endpoints

**Log Evidence:**
```
AuthController dependency resolution failed
```

**Fix:**
- Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` (allows app to start)
- Run migrations (creates required tables)
- Verify all dependencies resolve correctly

## Critical Log Lines to Paste

After removing the variable and restarting, paste these from backend logs:

1. **First route registration:**
   ```
   [RoutesResolver] AuthController {/api/auth}
   ```

2. **Register route mapping:**
   ```
   Mapped {/api/auth/register, POST} route
   ```

3. **Application startup:**
   ```
   Nest application successfully started
   ```

## Troubleshooting

### Backend Still Exits After Removing Variable

**Check:**
1. Variable removed from all scopes (service, shared, plugins)
2. No `.env` file in repo with this variable
3. No build-time injection of this variable

**Verify:**
```bash
# In Railway one-time command
env | grep NODE_TLS_REJECT_UNAUTHORIZED
# Should return nothing
```

### Migration Fails

**Error: "Migration already executed"**
- ✅ This is fine - migration already ran
- Check if tables exist

**Error: "Connection refused"**
- Verify `DATABASE_URL` is set in Railway
- Check database service is running

**Error: "Permission denied"**
- Verify database user has CREATE TABLE permissions
- Check Railway database service settings

### Tables Still Missing After Migration

1. **Check migration status:**
   ```bash
   cd zephix-backend && npm run migration:show
   ```

2. **Verify migration file exists:**
   ```bash
   ls -la zephix-backend/src/migrations/1770000000001-CreateAuthTables.ts
   ```

3. **Check database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

### Register Endpoint Still Returns 404

1. **Check controller is loaded:**
   - Look for `[RoutesResolver] AuthController` in logs
   - If missing, check dependency injection errors

2. **Verify module imports:**
   - `AuthModule` must be imported in `AppModule`
   - All dependencies must resolve

3. **Check for circular dependencies:**
   - Look for "Circular dependency" warnings in logs

---

**Last Updated:** 2025-01-XX
**Status:** Ready for execution
**Next Steps:** Follow steps 1-4 in order, then verify using checklist


