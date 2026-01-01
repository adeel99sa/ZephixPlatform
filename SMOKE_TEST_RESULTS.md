# Smoke Test Results

## Test Results Summary

### ✅ Test A: New org and new email
**Status:** ✅ PASSED
**HTTP Status:** 200
**Email:** `verify-1767230989-30413@example.com`
**Org:** `Verify Org 1767230989 4163`

**Response Headers:**
```
HTTP/2 200
content-type: application/json; charset=utf-8
x-request-id: 5a1a09b4-808e-416b-8f1d-6ebe32ae3dd5
```

**Response Body:**
```json
{
  "data": {
    "message": "If an account with this email exists, you will receive a verification email."
  },
  "meta": {
    "timestamp": "2026-01-01T01:29:50.238Z",
    "requestId": "5a1a09b4-808e-416b-8f1d-6ebe32ae3dd5"
  }
}
```

---

### ❌ Test B: Same orgName with different email (expect 409)
**Status:** ❌ FAILED - Got 500 instead of 409
**HTTP Status:** 500
**Email:** `verify-1767230995-23272@example.com`
**Org:** `Verify Org 1767230989 4163` (same as Test A)

**Response Headers:**
```
HTTP/2 500
content-type: application/json; charset=utf-8
x-request-id: 025f1286-9bd2-4142-ae72-11ee3091e9e3
```

**Response Body:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "duplicate key value violates unique constraint \"UQ_963693341bd612aa01ddf3a4b68\"",
    "timestamp": "2026-01-01T01:29:56.025Z",
    "requestId": "025f1286-9bd2-4142-ae72-11ee3091e9e3",
    "path": "/api/auth/register"
  }
}
```

**Analysis:**
- The handler is **not deployed** or **not catching** the org constraint
- Still returning 500 instead of 409 Conflict
- Constraint: `UQ_963693341bd612aa01ddf3a4b68` on `organizations.slug`

**Expected:**
- HTTP 409 Conflict
- Message: "An organization with this slug already exists. Please choose a different slug."

---

### ✅ Test C: Duplicate email with different org (expect 200 neutral)
**Status:** ✅ PASSED
**HTTP Status:** 200
**Email:** `verify-1767230989-30413@example.com` (same as Test A)
**Org:** `Verify Org 1767230996 29591` (different from Test A)

**Response Headers:**
```
HTTP/2 200
content-type: application/json; charset=utf-8
x-request-id: 3ef9c672-2408-429f-aae9-0fde7bc7f0e7
```

**Response Body:**
```json
{
  "data": {
    "message": "If an account with this email exists, you will receive a verification email."
  },
  "meta": {
    "timestamp": "2026-01-01T01:29:56.637Z",
    "requestId": "3ef9c672-2408-429f-aae9-0fde7bc7f0e7"
  }
}
```

**Analysis:**
- ✅ Correctly returns 200 with neutral message
- ✅ Anti-enumeration working as expected

---

## Outbox Verification

**After Test A:**
```sql
SELECT id, type, status, created_at
FROM auth_outbox
ORDER BY created_at DESC
LIMIT 10;
```

**Result:**
```
id: ca76b5ab-3d3f-4ac8-8ce6-e13c7cf855b5
type: auth.email_verification.requested
status: pending
created_at: 2026-01-01 01:29:49.898612
```

✅ **Outbox row created successfully**

---

## Deployment Status

**Latest Commit:** `e96ead8`
**Files Changed:**
- `zephix-backend/src/modules/auth/services/auth-registration.service.ts`
- `verify-production-fix.sh`

**Railway Deployment:** ⚠️ **NOT VERIFIED**
- Need to check Railway Dashboard → zephix-backend → Deployments
- Active deployment commit SHA must be `e96ead8` or newer

---

## Issues Found

1. **Test B Failed:** Handler not deployed or not catching org constraint
   - Still returns 500 instead of 409
   - Need to verify deployment includes commit `e96ead8`
   - Need to restart service after deployment

---

## Next Steps

1. **Verify Railway Deployment:**
   - Railway Dashboard → zephix-backend → Deployments
   - Confirm active deployment includes commit `e96ead8`
   - If not, trigger Redeploy

2. **Restart Service:**
   - Railway Dashboard → zephix-backend → Restart
   - Verify logs show successful startup

3. **Re-run Test B:**
   - Should return HTTP 409 Conflict
   - Message should indicate org slug conflict

---

## Test Expectations Summary

| Test | Scenario | Expected HTTP | Status |
|------|----------|---------------|--------|
| A | New org + new email | 200 | ✅ PASSED |
| B | Same org + different email | 409 | ❌ FAILED (got 500) |
| C | Same email + different org | 200 (neutral) | ✅ PASSED |

