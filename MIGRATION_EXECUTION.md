# Migration Execution - Next Steps

## ✅ Completed
1. ✅ Removed `NODE_TLS_REJECT_UNAUTHORIZED=0` from Railway variables
2. ✅ Backend started successfully:
   - "Nest application successfully started"
   - "API endpoints available at: http://localhost:8080/api"
   - No security errors

## ⏳ Next: Run Migrations

**Railway CLI `run` command executes locally**, not in Railway's environment. For migrations, use one of these methods:

### Option 1: Railway Dashboard (Recommended)

1. **Railway Dashboard** → **zephix-backend** service
2. **Deployments** tab → **New Deployment** → **One-Time Command**
3. **Command:**
   ```bash
   cd zephix-backend && npm run migration:run
   ```
4. **Wait for completion** (check logs)
5. **Restart backend** after migration completes

### Option 2: Railway CLI (If Available)

If Railway CLI supports remote execution:
```bash
railway run --service zephix-backend "cd zephix-backend && npm run migration:run"
```

**Note:** Railway CLI `run` typically executes locally with Railway env vars, not in Railway's environment.

## Expected Migration Output

```
query: SELECT * FROM "migrations" ORDER BY "id" DESC
query: CREATE TABLE "auth_outbox" ...
query: CREATE TABLE "org_invites" ...
query: CREATE TABLE "email_verification_tokens" ...
Migration CreateAuthTables1770000000001 has been executed successfully.
```

## After Migrations

1. **Restart backend service**
2. **Verify tables exist:**
   ```bash
   # Via Railway one-time command
   psql $DATABASE_URL -c "\d auth_outbox"
   psql $DATABASE_URL -c "\d org_invites"
   psql $DATABASE_URL -c "\d email_verification_tokens"
   ```
3. **Check backend logs** for:
   - ✅ No `relation "auth_outbox" does not exist` errors
   - ✅ `OutboxProcessorService` running
   - ✅ `[RoutesResolver] AuthController {/api/auth}`
   - ✅ `Mapped {/api/auth/register, POST} route`

## Test Register Endpoint

After migrations and restart:
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

**Expected:** 200 or 400 (NOT 404)


