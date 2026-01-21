# Production Fix Verification - Step by Step

## Status: Code Fix Committed and Pushed

**Commit:** `a39229a` (and improved version)
**Files Changed:**
- `zephix-backend/src/modules/auth/services/auth-registration.service.ts` - Added 23505 handler
- `docs/OPERATIONS_RUNBOOK.md` - Incident recorded
- `PRODUCTION_FIX_FINAL_VERIFICATION.md` - Full checklist

---

## Step 1: Deploy Verification (MANUAL)

**Action Required:**
1. Go to Railway Dashboard → `zephix-backend` service
2. Click **Deployments** tab
3. Verify the **running deployment** includes commit `a39229a` or later
4. If not, click **Redeploy** or trigger a new deployment

**Pass Criteria:**
- ✅ Running deployment shows commit `a39229a` or newer
- ✅ Deployment status is "Active" or "Success"

**If deployment is not updated:**
- Railway may auto-deploy from main branch
- Wait 2-3 minutes for auto-deploy
- Or manually trigger redeploy

---

## Step 2: Restart and Log Scan (MANUAL)

**Action Required:**
1. Railway Dashboard → `zephix-backend` → Click **Restart**
2. Go to **Logs** tab
3. Search for each of these terms (one at a time):
   - `AuthController`
   - `Mapped {/api/auth/register, POST}`
   - `OutboxProcessorService`
   - `auth_outbox`

**Pass Criteria:**
- ✅ `AuthController` appears in logs
- ✅ `Mapped {/api/auth/register, POST}` appears
- ✅ `OutboxProcessorService` appears (or table missing safety log is gone)
- ✅ No `relation "auth_outbox" does not exist` errors
- ✅ No repeated crash loops

**If you see errors:**
- Check that migrations were run (see RAILWAY_MIGRATION_INSTRUCTIONS.md)
- Verify `auth_outbox` table exists

---

## Step 3: Verify Outbox Write (AUTOMATED)

Run this command:

```bash
curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-verification-'$(date +%s)'@example.com","password":"Test123!@#","fullName":"Test User","orgName":"Test Org"}' | head -n 30
```

**Pass Criteria:**
- ✅ HTTP 200 status code
- ✅ Response body contains neutral message

**Save the email** from the command output for step 6.

---

## Step 4: Verify Outbox Row Exists (AUTOMATED)

First, inspect the table structure:

```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "\d+ auth_outbox"'
```

Then query with correct columns:

```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, type, status, created_at FROM auth_outbox ORDER BY created_at DESC LIMIT 10;"'
```

**Pass Criteria:**
- ✅ Query succeeds
- ✅ New row appears with recent `created_at` timestamp
- ✅ `type = 'auth.email_verification.requested'`
- ✅ `status = 'pending'`

---

## Step 5: Verify Processing Moves State (AUTOMATED)

Wait 2 minutes, then run:

```bash
railway run --service zephix-backend -- sh -lc 'psql "$DATABASE_URL" -c "SELECT id, status, attempts, processed_at, sent_at, next_attempt_at, error_message FROM auth_outbox ORDER BY created_at DESC LIMIT 10;"'
```

**Pass Criteria:**
- ✅ Newest row is no longer `status = 'pending'`
- OR
- ✅ `processed_at` is set
- ✅ `sent_at` is set
- ✅ `attempts` incremented with `next_attempt_at` set (if email provider fails)

---

## Step 6: Verify Duplicate Email Returns 200 (AUTOMATED)

Re-run register with the **same email** from step 3:

```bash
# Replace TEST_EMAIL with the email from step 3
curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"TEST_EMAIL","password":"Test123!@#","fullName":"Test User","orgName":"Test Org"}' | head -n 30
```

**Pass Criteria:**
- ✅ HTTP 200 status code
- ✅ Response contains: `"If an account with this email exists, you will receive a verification email."`
- ❌ NOT HTTP 500
- ❌ NOT database error details exposed

---

## Step 7: Code Sanity Check (AUTOMATED)

Verify the handler code:

```bash
# Check 23505 handler exists
grep -A 20 "23505" zephix-backend/src/modules/auth/services/auth-registration.service.ts

# Check neutral message
grep "If an account with this email exists" zephix-backend/src/modules/auth/services/auth-registration.service.ts

# Check re-throw
grep "throw error" zephix-backend/src/modules/auth/services/auth-registration.service.ts
```

**Pass Criteria:**
- ✅ 23505 error code handler exists
- ✅ Returns same neutral message as normal success
- ✅ Only handles users.email constraint (checks table/constraint name)
- ✅ Re-throws other errors

---

## Quick Verification Script

Run the automated script:

```bash
./verify-production-fix.sh
```

This will run steps 3-7 automatically, but you still need to do steps 1-2 manually in Railway Dashboard.

---

## If Any Step Fails

1. **Stop immediately**
2. **Check the error message**
3. **Review the relevant section above**
4. **Fix the issue before proceeding**

---

## Success Criteria Summary

All steps pass when:
- ✅ Deployment includes commit a39229a
- ✅ Backend starts without auth_outbox errors
- ✅ Register creates outbox events
- ✅ Outbox processor moves events to completed
- ✅ Duplicate registrations return 200 with neutral message
- ✅ No database errors exposed to clients


