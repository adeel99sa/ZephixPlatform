# Railway Deployment Verification Checklist

## Pre-Merge Verification (phase7/workspace-mvp-smoke branch)

### 1. Confirm Deployment Configuration

**Railway → Backend Service → Deployments → Latest Deployment**

Verify:
- ✅ **Branch:** `phase7/workspace-mvp-smoke`
- ✅ **Commit SHA:** Matches expected commit (check with `git rev-parse HEAD`)
- ✅ **Root Directory:** `zephix-backend`
- ✅ **Start Command:** `npm run start:railway`

If any mismatch, redeploy with correct configuration.

### 2. Run Migrations and Verify

**Step 1: Run migrations**
- Railway → Backend Service → Deployments → One-time command
- Command: `npm run migration:run`
- Wait for completion

**Step 2: Verify migrations executed**
- Railway → Backend Service → Deployments → One-time command
- Command: `npm run migration:show`
- Expected: See `AddAuthOutboxCompositeIndexes1796000000001` listed as executed

**Step 3: Verify indexes created (optional DB-level proof)**
- Railway → Backend Service → Deployments → One-time command
- Command:
  ```bash
  node -e "const { Client } = require('pg'); (async()=>{ const c=new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}}); await c.connect(); const r=await c.query(\`select indexname, indexdef from pg_indexes where tablename='auth_outbox' order by indexname\`); console.log(JSON.stringify(r.rows, null, 2)); await c.end(); })()"
  ```
- Expected: See `idx_auth_outbox_pending_claim` and `idx_auth_outbox_failed_retry` in results

### 3. Health Endpoint Verification

**From your laptop (use public Railway domain):**

```bash
# Fast health check (should return in <1 second)
curl -i https://YOUR_BACKEND_DOMAIN.railway.app/api/health

# Expected: HTTP 200 OK
# Response time: <1 second
```

```bash
# Detailed health check (can be slower)
curl -i https://YOUR_BACKEND_DOMAIN.railway.app/api/health/detailed

# Expected: HTTP 200 OK
# Response time: May be slower (has DB queries)
```

**Note:** Do not wire `/api/health/detailed` into Railway healthchecks. Use `/api/health` only.

### 4. Log Signal Validation (5 minutes)

**Railway → Backend Service → Logs**

Watch logs for 5 minutes. You should **NOT** see:

- ❌ `query:` spam (TypeORM query logging)
- ❌ `request_start` or `request_end` JSON logs (RequestContextLoggerInterceptor)
- ❌ `auth_outbox` cron processing logs (OutboxProcessorService)
- ❌ `OutboxProcessorService` activity messages

**If you still see request logs:**
1. Verify Railway Variables: `REQUEST_CONTEXT_LOGGER_ENABLED = false` (exact value)
2. Redeploy (new code only takes effect after redeploy)
3. Check startup logs show: `⚠️  RequestContextLoggerInterceptor disabled`

**If you still see query logs:**
1. Verify Railway Variables: `TYPEORM_LOGGING = false` (exact value)
2. Verify `NODE_ENV = production` (or not set, defaults to production behavior)
3. Redeploy

### 5. Merge Strategy (Reduce Blast Radius)

**Do in this exact order:**

1. **Merge branch to main:**
   ```bash
   git checkout main
   git merge phase7/workspace-mvp-smoke
   git push origin main
   ```

2. **Switch Railway to main:**
   - Railway → Backend Service → Settings
   - Change deployment branch to `main`
   - Save

3. **Redeploy:**
   - Railway → Backend Service → Deployments
   - Click "Redeploy" or wait for auto-deploy

4. **Re-run verification:**
   - Repeat steps 2-4 above (migrations, health checks, log validation)

**⚠️ Do NOT switch Railway to main before merging.** You will redeploy older code.

## Post-Merge Verification (main branch)

After switching Railway to `main` and redeploying:

1. ✅ Confirm deployment shows `main` branch
2. ✅ Confirm commit SHA matches merged commit
3. ✅ Re-run migration verification (step 2)
4. ✅ Re-test health endpoints (step 3)
5. ✅ Re-validate logs for 5 minutes (step 4)

## Troubleshooting

### High Volume Startup Logs

If Railway rate limits during boot due to route mapping logs:

1. Keep `REQUEST_CONTEXT_LOGGER_ENABLED=false`
2. Keep `TYPEORM_LOGGING=false`
3. If still hitting limits, lower Nest logger levels in production:
   - Set `LOG_LEVEL=error` or `LOG_LEVEL=warn` in Railway variables
   - Or configure NestJS logger to only show errors in production

### Worker Service Setup

See `WORKER_SERVICE_SETUP.md` for dedicated worker service configuration.

**Minimum worker config:**
- `OUTBOX_PROCESSOR_ENABLED=true`
- `TYPEORM_LOGGING=false`
- `REQUEST_CONTEXT_LOGGER_ENABLED=false`
- Same `DATABASE_URL` and secrets as API service
- Replicas: 1
- Public Domain: Disabled
