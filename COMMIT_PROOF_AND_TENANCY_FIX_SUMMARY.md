# Commit Proof and Tenancy Fix Summary

## Overview

Fixed commit SHA reporting, hardened tenant workspace extraction, and made Phase 2 verification deterministic. All changes are minimal and backward-compatible.

## Changes Made

### Step 1: Commit Proof - Make /api/version Trustworthy ✅

**Files Changed:**
- `zephix-backend/src/common/utils/commit-sha.resolver.ts` (new)
- `zephix-backend/src/common/utils/commit-sha.resolver.spec.ts` (new)
- `zephix-backend/src/health/health.controller.ts`
- `zephix-backend/src/main.ts`

**Changes:**
1. Created `resolveCommitSha()` utility with priority order:
   - First: `RAILWAY_GIT_COMMIT_SHA` (Railway auto-injected)
   - Second: `GIT_COMMIT_SHA` (CI/CD or manual)
   - Third: `APP_COMMIT_SHA` (only when `NODE_ENV !== 'production'`)
2. Added `commitShaTrusted` boolean field to `/api/version` response:
   - `true` when SHA comes from Railway or CI/CD
   - `false` when SHA is 'unknown' in production (Railway not setting `RAILWAY_GIT_COMMIT_SHA`)
3. Updated `/api/version` response structure to include `data` wrapper for backward compatibility
4. Added startup logging with source information
5. Added comprehensive unit tests (9 tests, all passing)

**Result:** `/api/version` never shows an old SHA from `APP_COMMIT_SHA` in production. Production deployments must use `RAILWAY_GIT_COMMIT_SHA`.

### Step 2: TenantContextInterceptor - Workspace ID Extraction ✅

**Files Changed:**
- `zephix-backend/src/common/utils/uuid-validator.util.ts` (new)
- `zephix-backend/src/modules/tenancy/tenant-context.interceptor.ts`

**Changes:**
1. Created reusable `extractValidUuid()` utility
2. Removed any logic that pulls `workspaceId` from path segments
3. Extract `workspaceId` in strict order:
   - Header: `x-workspace-id`
   - Route param: `workspaceId` (only if valid UUID)
   - Query param: `workspaceId` (only if valid UUID)
4. Invalid UUIDs are silently ignored (not treated as workspaceId)
5. Fixed logging to show actual `workspaceId` value, not route segments
6. Public endpoints (`/api/health`, `/api/version`) bypass tenancy checks

**Result:** `GET /api/resources/conflicts` works with `x-workspace-id` header. No more invalid UUID errors from path segments.

### Step 3: Conflicts Endpoint - Align with Tenancy Model ✅

**Files Changed:**
- `zephix-backend/src/modules/resources/resources.controller.ts`
- `zephix-backend/test/resources-conflicts.e2e-spec.ts` (new)

**Changes:**
1. Updated conflicts controller to prefer `workspaceId` from tenant context (set by interceptor from header)
2. Falls back to query param if not in context
3. Added comprehensive E2E tests:
   - Works with `x-workspace-id` header
   - Works without workspaceId (org-scoped)
   - Ignores invalid workspaceId header values
   - Filters by resourceId
   - Returns 403 when workspaceId doesn't belong to org

**Result:** Conflicts endpoint correctly uses tenant context and query params, with proper access control.

### Step 4: Verification Scripts - Consistent with New Rules ✅

**Files Changed:**
- `scripts/phase2-deploy-verify.sh`
- `scripts/run-phase2-verification.sh`

**Changes:**
1. Added preflight check for `commitShaTrusted` in production
2. Scripts fail fast if `commitShaTrusted` is `false` and `commitSha` is 'unknown' in production
3. All workspace-scoped endpoints consistently use `x-workspace-id` header
4. Clear error messages when `workspaceId` is missing

**Result:** Verification scripts are deterministic and catch SHA trust issues early.

### Step 5: Clean Documentation ✅

**Files Changed:**
- `docs/PHASE2_RAILWAY_VARIABLES.md`
- `docs/PHASE2_DEPLOYMENT_GUIDE.md`

**Changes:**
1. Removed all instructions to set `APP_COMMIT_SHA` in production
2. Documented that commit proof comes from `RAILWAY_GIT_COMMIT_SHA` (Railway auto-injected)
3. Updated Phase 2 deployment guide to include:
   - `commitShaTrusted` field checks
   - Preflight checks
   - `x-workspace-id` header requirement for workspace-scoped endpoints

**Result:** Documentation accurately reflects the new commit SHA resolution and tenancy model.

## Test Results

### Unit Tests
```bash
cd zephix-backend && npm test -- commit-sha.resolver.spec.ts
```
✅ All 9 tests passing

### E2E Tests
E2E test file created: `zephix-backend/test/resources-conflicts.e2e-spec.ts`
- Tests workspace-scoped conflicts endpoint
- Tests org-scoped conflicts endpoint
- Tests invalid UUID handling
- Tests access control

## Verification Checklist

Run these commands locally to verify:

### 1. Unit Tests
```bash
cd zephix-backend
npm test -- commit-sha.resolver.spec.ts
```

### 2. E2E Tests
```bash
cd zephix-backend
npm run test:e2e -- resources-conflicts.e2e-spec.ts
```

### 3. Run Verification Scripts Against Staging/Local
```bash
# Set environment variables
export TOKEN="your-token"
export BASE="https://zephix-backend-production.up.railway.app"

# Run verification
bash scripts/run-phase2-verification.sh
```

## What This Fixes

### SHA Mismatch Loops
**Root Cause:** `APP_COMMIT_SHA` was overriding `RAILWAY_GIT_COMMIT_SHA` in production, causing false SHA reporting.

**Fix:**
- Production now ignores `APP_COMMIT_SHA`
- Priority order ensures Railway's auto-injected SHA is used
- `commitShaTrusted` flag indicates when SHA is reliable

### Conflicts 403 Issue
**Root Cause:** `TenantContextInterceptor` was extracting `workspaceId` from the last path segment (e.g., "conflicts" from `/api/resources/conflicts`), treating it as a UUID and causing validation failures.

**Fix:**
- Removed path segment fallback
- Only extract from header, route param, or query param
- Validate UUID before using
- Invalid UUIDs are ignored, not treated as workspaceId

## Backward Compatibility

- `/api/version` response structure includes `data` wrapper (existing fields preserved)
- `commitShaTrusted` is an additive field (doesn't break existing consumers)
- Workspace extraction still supports query params (backward compatible)
- Public endpoints (`/api/health`, `/api/version`) unchanged

## Commit Messages

### Group 1: Proof Fix
```
fix(health): make commit SHA resolution trustworthy in production

- Prioritize RAILWAY_GIT_COMMIT_SHA over APP_COMMIT_SHA in production
- Add commitShaTrusted flag to /api/version response
- Log commit SHA source at startup
- Add unit tests for commit SHA resolver
```

### Group 2: Tenancy Fix
```
fix(tenancy): harden workspace ID extraction in TenantContextInterceptor

- Remove path segment fallback for workspaceId
- Only extract from header, route param, or query param
- Validate UUID before using
- Add reusable UUID validator utility
- Fix logging to show actual workspaceId value
```

### Group 3: Endpoint/Tests
```
fix(resources): align conflicts endpoint with tenancy model

- Prefer workspaceId from tenant context (header) over query param
- Add comprehensive E2E tests for conflicts endpoint
- Test invalid UUID handling and access control
```

### Group 4: Scripts/Docs
```
docs: update deployment guide and remove APP_COMMIT_SHA instructions

- Remove APP_COMMIT_SHA setup instructions
- Document RAILWAY_GIT_COMMIT_SHA as source of truth
- Add commitShaTrusted preflight checks to verification scripts
- Document x-workspace-id header requirement
```

## Next Steps

1. **Deploy to Railway:**
   - Push changes to main
   - Railway will auto-deploy and set `RAILWAY_GIT_COMMIT_SHA`
   - Verify `/api/version` shows `commitShaTrusted: true`

2. **Run Verification:**
   ```bash
   export TOKEN="your-token"
   bash scripts/run-phase2-verification.sh
   ```

3. **Monitor:**
   - Check that conflicts endpoint works with `x-workspace-id` header
   - Verify no more invalid UUID errors in logs
   - Confirm SHA reporting is accurate

