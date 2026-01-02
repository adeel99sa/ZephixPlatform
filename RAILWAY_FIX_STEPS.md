# Railway Backend Fix - Step-by-Step Execution

## ✅ Step 1: Remove NODE_TLS_REJECT_UNAUTHORIZED (Dashboard Required)

**Railway CLI cannot remove variables directly - must use Dashboard:**

1. **Open Railway Dashboard:**
   - Go to: https://railway.app
   - Navigate to: **Zephix Application** → **zephix-backend** service

2. **Remove Variable:**
   - Click **Variables** tab
   - Find `NODE_TLS_REJECT_UNAUTHORIZED` (value: `0`)
   - Click **trash icon** to delete
   - **Also check:**
     - Shared environment groups (if any)
     - Service-specific variables
     - Any plugins that might inject it

3. **Save and Redeploy:**
   - Railway will auto-redeploy after variable removal
   - Wait for deployment to complete

**Current Status:** Variable found in Railway CLI output:
```
NODE_TLS_REJECT_UNAUTHORIZED = 0
```

**Action Required:** Delete via Railway Dashboard (Variables tab)

---

## ✅ Step 2: Verify Backend Starts

**After variable removal, check deployment logs for:**

```
✅ Nest application successfully started
✅ API endpoints available at: http://localhost:PORT/api
```

**If you still see:**
```
❌ SECURITY ERROR: NODE_TLS_REJECT_UNAUTHORIZED=0 is set
   Exiting in production to prevent insecure deployment.
```

**Then:** Variable was not removed in the right scope - check shared environment groups.

---

## ✅ Step 3: Run Migrations (CLI Ready)

**Once backend starts, run migrations via Railway CLI:**

```bash
cd /Users/malikadeel/Downloads/ZephixApp
railway run --service zephix-backend "cd zephix-backend && npm run migration:run"
```

**Or via Dashboard One-Time Command:**
- Railway Dashboard → zephix-backend → Deployments → New Deployment → One-Time Command
- Command: `cd zephix-backend && npm run migration:run`

**Expected Output:**
```
query: SELECT * FROM "migrations" ORDER BY "id" DESC
query: CREATE TABLE "auth_outbox" ...
query: CREATE TABLE "org_invites" ...
query: CREATE TABLE "email_verification_tokens" ...
Migration CreateAuthTables1770000000001 has been executed successfully.
```

---

## ✅ Step 4: Restart Backend

**After migrations complete:**
- Railway Dashboard → zephix-backend → Restart
- Or: `railway restart --service zephix-backend`

---

## ✅ Step 5: Verify Tables Exist

**Check via Railway One-Time Command:**
```bash
railway run --service zephix-backend "psql \$DATABASE_URL -c '\d auth_outbox'"
railway run --service zephix-backend "psql \$DATABASE_URL -c '\d org_invites'"
railway run --service zephix-backend "psql \$DATABASE_URL -c '\d email_verification_tokens'"
```

**All should return table definitions.**

---

## ✅ Step 6: Verify Backend Logs

**Check for these lines in backend logs:**

1. **Route registration:**
   ```
   [RoutesResolver] AuthController {/api/auth}
   ```

2. **Register route:**
   ```
   Mapped {/api/auth/register, POST} route
   ```

3. **No outbox errors:**
   - Should NOT see: `relation "auth_outbox" does not exist`
   - Should see: `OutboxProcessorService` running (or disabled gracefully)

---

## ✅ Step 7: Test Register Endpoint

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

**Expected:** 200 (success) or 400 (validation error)
**NOT:** 404 (route not found)

---

## ✅ Step 8: Verify Swagger

**Open in browser:**
```
https://zephix-backend-production.up.railway.app/api/docs
```

**Verify:**
- ✅ Auth tag exists
- ✅ POST /api/auth/register exists
- ✅ Request/response schemas visible

---

## ✅ Step 9: Frontend CORS Check

**Browser DevTools:**
1. Open `https://getzephix.com`
2. DevTools → Network tab
3. Attempt signup/register
4. **Verify:**
   - ✅ Auth requests go to backend domain
   - ✅ No CORS errors
   - ✅ Requests return 200/400 (not 404)

---

## Current Status

- ✅ Railway CLI authenticated and linked
- ✅ Variable `NODE_TLS_REJECT_UNAUTHORIZED=0` **FOUND** in backend service
- ⏳ **ACTION REQUIRED:** Remove variable via Railway Dashboard
- ⏳ **NEXT:** Run migrations after variable removal

---

**Last Updated:** 2025-01-XX
**Next Action:** Remove variable via Railway Dashboard, then proceed with steps 2-9

