# 06 — Staging E2E Proof (curl)

**Verdict: Signup works. Email delivery does not. Root cause: OUTBOX_PROCESSOR_ENABLED not set.**

## Test Executed: 2026-02-18T05:13Z

### Step 1: CSRF

```bash
curl -s -c /tmp/jar "https://zephix-backend-v2-staging.up.railway.app/api/auth/csrf"
```

```json
{"csrfToken":"dd4a3ebf1974b844752041d9b1d82323bf124449056cdab05a1bd1158e826e48"}
```

**Result**: HTTP 200, XSRF-TOKEN cookie set.

### Step 2: POST /auth/register

```bash
curl -s -b /tmp/jar -c /tmp/jar \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "https://zephix-backend-v2-staging.up.railway.app/api/auth/register" \
  -d '{"email":"curltest1771391589@test.zephix.dev","password":"Test123456!","fullName":"Curl Test","orgName":"Curl Test Org 1771391589"}'
```

```json
{
  "data": {
    "message": "If an account with this email exists, you will receive a verification email."
  },
  "meta": {
    "timestamp": "2026-02-18T05:13:10.607Z",
    "requestId": "5354db4a-a7b4-4ea1-9cb1-c560a748abce"
  }
}
```

**Result**: HTTP 200, neutral response.

### Step 3: Database verification

```sql
-- Users
SELECT id, email, is_email_verified FROM users WHERE email LIKE 'curltest%';
-- Result: 1 row, is_email_verified = false

-- Organizations
SELECT name, slug FROM organizations WHERE name LIKE 'Curl Test%';
-- Result: 1 row, slug = curl-test-org-1771391589

-- Verification tokens
SELECT expires_at, used_at FROM email_verification_tokens WHERE user_id = '...';
-- Result: 1 row, expires_at = +24h, used_at = null

-- Outbox
SELECT type, status, attempts, sent_at FROM auth_outbox WHERE payload LIKE '%curltest%';
-- Result: 1 row, status = pending, attempts = 0, sent_at = null
```

**All 4 tables written correctly.**

### Step 4: Outbox processing check

```sql
SELECT status, count(*) FROM auth_outbox GROUP BY status;

 status  | count
---------+-------
 pending |     4
```

**Every outbox event ever created in staging is still `pending`.** The processor has never run. Zero emails have ever been sent from this staging environment.

### Step 5: Railway staging environment variables

```
SENDGRID_API_KEY             = SG.gJPuk... (SET)
SENDGRID_FROM_EMAIL          = noreply@getzephix.com (SET)
SKIP_EMAIL_VERIFICATION      = false (SET, but NOT USED in code)
OUTBOX_PROCESSOR_ENABLED     = NOT SET ← ROOT CAUSE
```

## Root Cause Analysis

| Candidate | Status |
|-----------|--------|
| Frontend does not call API | **FALSE** — API is called, returns 200 |
| Signup API does not write to DB | **FALSE** — all 7 tables written |
| SKIP_EMAIL_VERIFICATION is true | **FALSE** — set to false, and not used in code anyway |
| SendGrid key missing | **FALSE** — key is set on staging |
| OUTBOX_PROCESSOR_ENABLED not set | **TRUE — THIS IS THE ROOT CAUSE** |
| Frontend shows "Check email" on error | **TRUE (secondary bug)** — non-400 errors also show success UI |

## Fix Plan

### Fix 1: Enable outbox processor (immediate)

```bash
railway variables --set "OUTBOX_PROCESSOR_ENABLED=true" --service zephix-backend-v2
railway redeploy --yes --service zephix-backend-v2
```

After deploy, existing pending outbox events will be processed on next cron tick (within 60s).

### Fix 2: Frontend error handling (code change)

In `SignupPage.tsx`, change the catch block to not set `submitSuccess` on non-400 errors:

```typescript
} catch (error) {
  if (error.response?.status === 400) {
    setErrors({ email: error.response.data.message });
  } else {
    setErrors({ email: 'Something went wrong. Please try again.' });
    // DO NOT setSubmitSuccess(true) here
  }
}
```

### Fix 3: Worker service (production architecture)

The code comment explicitly says:
> "The zephix-backend API service MUST have OUTBOX_PROCESSOR_ENABLED=false.
> Create a separate Railway service: zephix-worker with OUTBOX_PROCESSOR_ENABLED=true."

For production, create a dedicated worker service. For staging MVP, enabling on the main service is acceptable.

## Cleanup

All test data (users, orgs, tokens, outbox events) was deleted from staging after proof collection.
