# Production Fix - Final Verification Checklist

## ✅ Fixes Applied

1. **Duplicate Key Error Handling**
   - Updated `auth-registration.service.ts` to catch Postgres unique constraint violations (error code 23505)
   - Returns 200 with neutral message instead of 500
   - Prevents account enumeration

2. **Incident Recorded**
   - Added to `docs/OPERATIONS_RUNBOOK.md` under Incident History
   - Includes root cause, detection, fix, and prevention steps

---

## 🔍 Verification Steps

### 1. Restart in Railway Dashboard

**Action:**
1. Go to Railway Dashboard → `zephix-backend` service
2. Click **Restart** button
3. Watch logs for 2 minutes

**What to Look For:**
- ✅ `Nest application successfully started`
- ✅ `[RoutesResolver] AuthController {/api/auth}`
- ✅ `Mapped {/api/auth/register, POST} route`
- ✅ No `relation "auth_outbox" does not exist` errors
- ✅ `OutboxProcessorService` running (or table missing safety log is gone)

**If you see errors:**
- Check that migrations were run successfully
- Verify `auth_outbox` table exists (see step 2)

---

### 2. Confirm Outbox Writes on Register

**Action:**
1. Register a new user with a unique email:
```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-verification-'$(date +%s)'@example.com",
    "password": "Test123!@#",
    "fullName": "Test User",
    "orgName": "Test Org"
  }'
```

2. Verify outbox row was created:
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, type, status, created_at FROM auth_outbox ORDER BY created_at DESC LIMIT 5;"'
```

**Expected Output:**
- At least one row with `type = 'auth.email_verification.requested'`
- `status = 'pending'`
- Recent `created_at` timestamp

**If no rows:**
- Check backend logs for errors during registration
- Verify transaction completed successfully

---

### 3. Confirm Outbox Processing Moves Rows

**Action:**
1. Wait 1-5 minutes (OutboxProcessorService runs every minute)
2. Run the same SELECT query again:
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, type, status, attempts, processed_at, sent_at FROM auth_outbox ORDER BY created_at DESC LIMIT 5;"'
```

**Expected Output:**
- `status` changed to `'completed'` or `'processing'` or `'failed'`
- OR `processed_at` is set
- OR `sent_at` is set
- OR `attempts` incremented (if email provider fails)

**If status still 'pending':**
- Check OutboxProcessorService logs for errors
- Verify email service configuration
- Check for processing errors in backend logs

---

### 4. Test Duplicate Registration (200 Response)

**Action:**
1. Register the same email again (use the email from step 2):
```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-verification-<same-email>@example.com",
    "password": "Test123!@#",
    "fullName": "Test User",
    "orgName": "Test Org"
  }'
```

**Expected Response:**
- ✅ Status: `200 OK`
- ✅ Body: `{"message": "If an account with this email exists, you will receive a verification email."}`
- ❌ NOT: `500 Internal Server Error`
- ❌ NOT: Database error details exposed

**If you get 500:**
- The fix may not be deployed yet
- Check that the code change is in the deployed version
- Verify the error is a unique constraint violation (code 23505)

---

### 5. Verify Table Structure (Optional)

**Action:**
```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "\d+ auth_outbox"'
```

**Expected Columns:**
- `id` (uuid, primary key)
- `type` (varchar)
- `payload_json` (jsonb)
- `status` (varchar, default 'pending')
- `attempts` (integer, default 0)
- `next_attempt_at` (timestamp, nullable)
- `created_at` (timestamp)
- `processed_at` (timestamp, nullable)
- `claimed_at` (timestamp, nullable)
- `processing_started_at` (timestamp, nullable)
- `sent_at` (timestamp, nullable)
- `error_message` (text, nullable)
- `last_error` (text, nullable)

---

## 📋 Summary Checklist

- [ ] Backend restarted successfully
- [ ] No `auth_outbox` relation errors in logs
- [ ] Register endpoint creates outbox rows
- [ ] OutboxProcessorService processes events (status changes)
- [ ] Duplicate registration returns 200 (not 500)
- [ ] Incident recorded in runbook

---

## 🚨 If Issues Persist

1. **Check Migration Status:**
   ```bash
   railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"'
   ```
   - Should show `CreateAuthTables1770000000001` executed

2. **Check Backend Logs:**
   - Railway Dashboard → zephix-backend → Logs
   - Search for: `auth_outbox`, `OutboxProcessorService`, `register`

3. **Verify Code Deployment:**
   - Check that latest code with duplicate key fix is deployed
   - Verify `auth-registration.service.ts` has the try-catch block

4. **Database Connection:**
   - Verify `DATABASE_URL` is set correctly
   - Test connection: `railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT 1;"'`

---

## ✅ Success Criteria

All checks pass when:
- ✅ Backend starts without errors
- ✅ Register creates outbox events
- ✅ Outbox processor moves events to completed
- ✅ Duplicate registrations return 200 with neutral message
- ✅ No database errors exposed to clients

