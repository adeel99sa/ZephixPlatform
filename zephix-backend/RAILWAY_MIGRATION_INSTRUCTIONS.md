# Railway Migration Instructions

**Date:** 2025-12-29  
**Issue:** `auth_outbox` table missing - migrations not run in production

## Required Tables

After migrations run, these tables must exist:
- ✅ `auth_outbox`
- ✅ `org_invites`
- ✅ `email_verification_tokens`
- ✅ `users.email_verified_at` (column)

## Migration File

**File:** `src/migrations/1770000000001-CreateAuthTables.ts`

This migration creates all required auth tables.

## Option 1: One-Time Railway Command (Fastest)

### Steps:

1. **Railway Dashboard → Backend Service → Deployments**
2. **Click "New Deployment" → "One-Time Command"**
3. **Run:**
   ```bash
   cd zephix-backend && npm run migration:run
   ```
4. **Wait for completion**
5. **Restart backend service**

### Verify:

```bash
# In Railway one-time command or via Railway CLI
psql $DATABASE_URL -c "\d auth_outbox"
psql $DATABASE_URL -c "\d org_invites"
psql $DATABASE_URL -c "\d email_verification_tokens"
psql $DATABASE_URL -c "\d users" | grep email_verified_at
```

All should return table/column definitions.

## Option 2: Railway CLI (Local)

```bash
# Install Railway CLI if needed
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run --service zephix-backend npm run migration:run

# Restart service
railway restart --service zephix-backend
```

## Option 3: Auto-Run on Deploy (Not Recommended)

**⚠️ WARNING:** Auto-running migrations on deploy is risky and can cause downtime.

If you must enable it:

1. **Railway Dashboard → Backend Service → Variables**
2. **Set:** `AUTO_RUN_MIGRATIONS=true`
3. **Update:** `railway.toml` to check this variable and run migrations

**Better approach:** Use one-time command or separate migration job service.

## Verification After Migration

### 1. Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('auth_outbox', 'org_invites', 'email_verification_tokens');
```

Should return 3 rows.

### 2. Check Column Exists

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'email_verified_at';
```

Should return 1 row.

### 3. Check Backend Logs

After restart, logs should show:
- ✅ No `relation "auth_outbox" does not exist` errors
- ✅ `OutboxProcessorService` running (or disabled if table still missing)
- ✅ Auth routes registered

### 4. Test Signup Flow

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

Then check:
- ✅ Outbox event created in `auth_outbox` table
- ✅ Email sent (if SendGrid configured)

## Troubleshooting

### Migration Fails

**Error:** `Migration already executed`
- ✅ This is fine - migration already ran
- Check if tables exist

**Error:** `Connection refused` or `Database not found`
- Verify `DATABASE_URL` is set in Railway
- Check database service is running

**Error:** `Permission denied`
- Verify database user has CREATE TABLE permissions
- Check Railway database service settings

### Tables Still Missing After Migration

1. Check migration ran successfully:
   ```bash
   npm run migration:show
   ```
2. Verify migration file exists:
   ```bash
   ls -la src/migrations/1770000000001-CreateAuthTables.ts
   ```
3. Check database connection:
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

## Safety Check

**OutboxProcessorService** now includes a safety check:
- If `auth_outbox` table is missing, processor disables itself
- Logs one clear error message
- Prevents spam in logs

After migrations run, processor will automatically resume on next cron cycle.

---

**Last Updated:** 2025-12-29  
**Next Steps:** Run migration, restart backend, verify tables exist

