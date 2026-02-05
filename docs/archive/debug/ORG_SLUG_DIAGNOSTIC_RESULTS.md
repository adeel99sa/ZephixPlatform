# Org Slug Handler Diagnostic Results

## Test Execution: 2026-01-01 02:05 UTC

### Current Production Status
- **Version Endpoint**: `/api/version` does NOT show `commitSha` field
- **Conclusion**: New code (commit `3469a56`) is NOT deployed yet
- **Action Required**: Redeploy on Railway

---

## Diagnostic Test Results

### Test Setup
- **Org Name**: `Diag Org 1767233105` (reused for both calls)

### First Call (Expected: 200 ✅)
```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"diag-a-1767233105@example.com","password":"Test123!@#","fullName":"Test User","orgName":"Diag Org 1767233105"}'
```

**Result**: ✅ HTTP 200
- **RequestId**: `fc13cef3-860a-47c7-a55b-bf275929750c`
- **Response**: `{"data":{"message":"If an account with this email exists, you will receive a verification email."}}`

### Second Call (Expected: 409, Got: 500 ❌)
```bash
curl -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"diag-b-1767233105@example.com","password":"Test123!@#","fullName":"Test User","orgName":"Diag Org 1767233105"}'
```

**Result**: ❌ HTTP 500 (should be 409)
- **RequestId**: `eba7a7ee-6822-4839-a32a-a991862527c1`
- **Error**:
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "duplicate key value violates unique constraint \"UQ_963693341bd612aa01ddf3a4b68\"",
    "timestamp": "2026-01-01T02:05:08.762Z",
    "requestId": "eba7a7ee-6822-4839-a32a-a991862527c1",
    "path": "/api/auth/register"
  }
}
```

**Analysis**:
- Constraint `UQ_963693341bd612aa01ddf3a4b68` is the `organizations.slug` constraint
- Handler should convert this to 409 Conflict, but it's still returning 500
- **Root Cause**: Old code is still running (commit `3469a56` not deployed)

---

## Next Steps

### 1. Deploy New Code on Railway

**Railway Dashboard Actions:**
1. Go to Railway Dashboard
2. Service: `zephix-backend`
3. Click **"Redeploy"** → Select **"Deploy latest main"**
4. Wait for deployment to complete (2-3 minutes)
5. Click **"Restart"** service after deploy completes

### 2. Set Commit SHA Environment Variable (Optional but Recommended)

**Railway Variables:**
- Variable: `APP_COMMIT_SHA`
- Value: `3469a56`
- Redeploy after setting

This enables the `/api/version` endpoint to show the running commit.

### 3. Verify Deployment

```bash
# Check version endpoint for commitSha
curl -s https://zephix-backend-production.up.railway.app/api/version | jq .commitSha

# Expected: "3469a56" or newer
```

### 4. Re-run Diagnostic Test

After deployment, run the same test again:

```bash
ORG="Diag Org $(date +%s)"
echo "Using org: $ORG"

# First call
curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"diag-a-$(date +%s)@example.com\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$ORG\"}" | head -n 30

# Second call (same org, different email)
curl -i -s -X POST https://zephix-backend-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"diag-b-$(date +%s)@example.com\",\"password\":\"Test123!@#\",\"fullName\":\"Test User\",\"orgName\":\"$ORG\"}" | head -n 30
```

**Expected After Deployment:**
- First call: HTTP 200 ✅
- Second call: HTTP 409 ✅ (not 500)

### 5. Check Railway Logs for Handler Execution

After deployment and re-running the test, search Railway logs for:

**Search Terms:**
- `[ORG_SLUG_HANDLER]`
- `Registration error caught`
- RequestId: `eba7a7ee-6822-4839-a32a-a991862527c1` (or new requestId from second call)

**Capture These Fields from Logs:**
- `error.name`
- `error.code`
- `driverError.code`
- `driverError.table`
- `driverError.constraint`
- `driverError.detail`
- `isOrgTable`
- `isWorkspaceTable`
- `mentionsSlug`
- `mentionsName`
- `tableName`
- `constraintName`

**What Success Looks Like:**
- Second call returns HTTP 409
- Logs show `mentionsSlug: true`
- Logs show either `isOrgTable: true` OR the slug detail fallback matched
- Log shows: `Registration organization duplicate: slug already exists`

---

## If Still Getting 500 After Deployment

If the second call still returns 500 after `/api/version` shows `3469a56`, paste:

1. **The single log block** for that `requestId` from Railway logs
2. Include all fields listed above
3. The exact HTTP response for the second call

This will show why the handler isn't matching the error.

---

## Code Changes Summary

**Commit**: `3469a56`
**Files Changed:**
- `zephix-backend/src/main.ts` - Added commit SHA logging at startup
- `zephix-backend/src/health/health.controller.ts` - Added `commitSha` to version endpoint
- `zephix-backend/src/modules/auth/services/auth-registration.service.ts` - Enhanced error logging and improved org slug detection

**Key Improvements:**
1. Detailed error structure logging (error.name, error.code, driverError.*)
2. Detection logic logging (`[ORG_SLUG_HANDLER]` tag)
3. Fallback detection for missing table names (checks `(slug)` in error detail)
4. Commit SHA tracking for deployment verification


