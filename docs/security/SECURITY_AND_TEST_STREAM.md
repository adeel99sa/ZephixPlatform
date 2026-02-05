# Security and Test Stabilization Stream

**Date:** 2025-01-27
**Owner:** Engineering
**Purpose:** Track backend security hardening, guard fixes, tenant scoping, and test harness stabilization
**Scope:** Platform safety and testability improvements, separate from MVP feature parity

---

## Stream Goals

1. **No cross-workspace data leakage** - All workspace-scoped endpoints enforce access boundaries
2. **Record-based authorization** - Mutations authorize off stored records, not headers
3. **Consistent guard patterns** - PlatformRole normalization, no legacy role strings
4. **Stable test harness** - Tests fail for real behavior, not tooling noise
5. **Tenant context correctness** - TenantAwareRepository works reliably in all contexts

---

## Completed Work

### 1. Admin Guards and Debug Route Removal

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Debug endpoints exposed in production
**Fix:**
- Removed debug controller endpoints
- Added `AdminOnlyGuard` to admin-only operations
- Normalized to `PlatformRole.ADMIN` enum usage

**Evidence:**
- `zephix-backend/src/modules/admin/guards/admin-only.guard.ts`
- CI guard script prevents debug route regression

**Test Proof:**
- CI fails if debug routes exist
- Admin-only endpoints return 403 for non-admin users

---

### 2. Dashboards Mutations Authorization

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Header-trusting allows cross-workspace mutations
**Fix:**
- All dashboard mutation endpoints now use `getDashboardForMutation()`
- Service loads dashboard by ID + organizationId, then uses stored `workspaceId` for authorization
- Header `x-workspace-id` ignored for authorization decisions
- Cross-workspace attempts return 404

**Endpoints Fixed:**
- `PATCH /api/dashboards/:id` (update)
- `POST /api/dashboards/:id/share-enable`
- `POST /api/dashboards/:id/share-disable`
- `POST /api/dashboards/:id/widgets` (add widget)
- `PATCH /api/dashboards/:id/widgets/:widgetId` (update widget)
- `DELETE /api/dashboards/:id/widgets/:widgetId` (delete widget)

**Evidence:**
- `zephix-backend/src/modules/dashboards/services/dashboards.service.ts:getDashboardForMutation()`
- `zephix-backend/src/modules/dashboards/controllers/dashboards.controller.ts` (all mutation endpoints)
- `zephix-backend/src/modules/dashboards/dashboards-mutations.integration.spec.ts` (18 tests)

**Test Proof:**
- Member without workspace access gets 404
- Admin with access succeeds
- Header `x-workspace-id` does not change authorization outcome

---

### 3. Dashboards Share Read Path

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Share read returns internal fields, widget config not sanitized
**Fix:**
- Controller uses `getSharedDashboard()` service method
- Returns sanitized `SharedDashboardDto` only
- Widget config filtered by allowlist
- Invalid/expired tokens return 404 (not 400)

**Evidence:**
- `zephix-backend/src/modules/dashboards/services/dashboards.service.ts:getSharedDashboard()`
- `zephix-backend/src/modules/dashboards/dto/shared-dashboard.dto.ts`
- `zephix-backend/src/modules/dashboards/dashboards-share.integration.spec.ts` (6 tests passing)

**Test Proof:**
- Only allowed top-level fields returned (id, name, description, visibility, widgets)
- Internal fields absent (organizationId, ownerUserId, deletedAt, shareToken, etc.)
- Widget config sanitized (empty allowlist = empty config)

---

### 4. Dashboards Controller Family Scoping

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Inconsistent workspace scoping across dashboard-related controllers
**Fix:**
- Metrics controller: Validates workspace access before querying, authorizes off stored record for mutations
- Templates controller: Uses DTO workspaceId only, ignores header, validates access in service
- Analytics-widgets controller: Already uses `WorkspaceScopeHelper` (confirmed)
- AI-dashboard controller: Already uses `WorkspaceScopeHelper` (confirmed)

**Evidence:**
- `zephix-backend/src/modules/dashboards/controllers/metrics.controller.ts` (all endpoints)
- `zephix-backend/src/modules/dashboards/controllers/dashboard-templates.controller.ts`
- `zephix-backend/src/modules/dashboards/services/templates.service.ts:activateTemplate()`

**Test Proof:**
- All endpoints return 404 for workspace access denied
- Header `x-workspace-id` does not change authorization outcome

---

### 5. Tenant Context Guard Ordering

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** TenantAwareRepository fails when called before interceptors set context
**Fix:**
- `RequireProjectWorkspaceRoleGuard` now sets tenant context before calling `workspaceAccessService`
- Uses `tenantContextService.runWithTenant()` to ensure context available

**Evidence:**
- `zephix-backend/src/modules/projects/guards/require-project-workspace-role.guard.ts`
- Wraps `getUserWorkspaceRole` call in `runWithTenant()`

**Test Proof:**
- Project-related tests no longer fail with "Tenant context missing" errors

---

### 6. Test Environment Auth Secrets

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** E2E login returns 500 due to missing auth secrets
**Fix:**
- Added `REFRESH_TOKEN_PEPPER` to `.env.test`
- Added `TOKEN_HASH_SECRET` to `.env.test`
- Added `JWT_REFRESH_SECRET` to `.env.test`

**Evidence:**
- `zephix-backend/.env.test` (all required auth secrets present)

**Test Proof:**
- E2E login tests return 200/201, not 500

---

### 7. Jest E2E Config Standardization

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Supertest import style drift causes test failures
**Fix:**
- Standardized to `import request from 'supertest'` (ES6 default import)
- Updated `jest-e2e.json` to use `tsconfig.spec.json` for ts-jest config
- Added CI guard script to prevent regression

**Evidence:**
- `zephix-backend/test/jest-e2e.json`
- `zephix-backend/scripts/guard-test-imports.sh`
- All e2e test files use consistent import style

**Test Proof:**
- CI fails if old import style (`import request = require('supertest')`) is used

---

### 8. Response Shape Assertion Alignment

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Test assertions fail due to response wrapper mismatch
**Fix:**
- Updated test assertions to use `response.body.data.*` structure
- Aligned with application's `{ data: T }` response wrapper format

**Evidence:**
- `zephix-backend/test/workspace-rbac.e2e-spec.ts` (all assertions updated)

**Test Proof:**
- Tests correctly access data within response wrapper

---

### 9. DTO Validation Alignment

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Test payloads don't match DTO validation, causing 400 errors
**Fix:**
- Updated workspace creation tests to send `ownerUserIds: [uuid]` (array) instead of `ownerId: uuid` (single)
- Aligned with `CreateWorkspaceDto` requirements

**Evidence:**
- `zephix-backend/test/workspace-rbac.e2e-spec.ts` (workspace creation tests)

**Test Proof:**
- Workspace creation tests return 201, not 400

---

### 10. Role Enum Standardization

**Status:** ✅ Complete
**Commit:** (To be added)
**Risk:** Tests use non-canonical role values
**Fix:**
- Standardized all test role values to canonical workspace roles:
  - `workspace_owner`
  - `workspace_member`
  - `workspace_viewer`

**Evidence:**
- All e2e test files use canonical role values

**Test Proof:**
- Tests use consistent role enum values

---

## Open Work

### 1. TenantAwareRepository Migration in Dashboards

**Status:** ⏳ Pending
**Risk:** `InjectRepository` usage may bypass org scoping
**Work:**
- Replace `InjectRepository` with `TenantAwareRepository` in `DashboardsService`
- Ensure all queries org-bounded by tenant-aware layer
- Pattern: Same as used in resources module

**Dependency:** Resources module migration pattern
**Owner:** Backend

---

### 2. Fresh DB Migration Proof

**Status:** ⏳ Pending
**Risk:** Migrations may not run cleanly on empty database
**Work:**
- Create empty DB
- Run migrations from zero
- Run one smoke query
- Run bulk integration suite
- Store outputs in proof doc

**Dependency:** Clean DB target (Railway test DB)
**Owner:** Backend + QA

---

### 3. Remaining E2E Runtime Failures

**Status:** ⏳ Pending
**Risk:** Test suite has behavior-level mismatches
**Work:**
- Triage each failing suite
- Document: failing endpoint, request payload, expected vs actual
- Decision: update test or fix product

**Dependency:** Test harness stability
**Owner:** Backend + QA

---

## Test Coverage

### Integration Tests Added

1. **Dashboards Mutations Authorization** (`dashboards-mutations.integration.spec.ts`)
   - 18 tests covering share enable/disable, widgets CRUD, dashboard update/delete
   - Proves 404 for cross-workspace access, header spoofing protection

2. **Dashboards Share Read** (`dashboards-share.integration.spec.ts`)
   - 6 tests covering sanitized payload, invalid tokens, expired shares
   - Proves DTO sanitization and widget config filtering

### E2E Tests Fixed

1. **Workspace RBAC** (`workspace-rbac.e2e-spec.ts`)
   - Fixed DTO validation alignment
   - Fixed response shape assertions
   - Fixed role enum values

---

## CI Guards Added

1. **Test Import Style Guard** (`scripts/guard-test-imports.sh`)
   - Prevents regression to old Supertest import style
   - Fails CI if `import request = require('supertest')` found

2. **Debug Route Guard** (`scripts/guard-deploy.sh`)
   - Prevents debug routes in production
   - Fails CI if debug controller returns or debug route exists

---

## Security Improvements Summary

### Authorization Patterns
- ✅ Record-based authorization (dashboards mutations)
- ✅ Workspace access validation before queries
- ✅ PlatformRole normalization
- ✅ Header `x-workspace-id` ignored for authorization

### Data Sanitization
- ✅ Share read returns sanitized DTO only
- ✅ Widget config filtered by allowlist
- ✅ Internal fields excluded from public responses

### Guard Consistency
- ✅ AdminOnlyGuard applied consistently
- ✅ Workspace access guards use `WorkspaceAccessService`
- ✅ Tenant context set before repository calls

---

## Test Harness Improvements Summary

### Configuration
- ✅ Jest e2e config standardized
- ✅ Supertest import style consistent
- ✅ Test env secrets complete

### Assertions
- ✅ Response shape assertions aligned
- ✅ DTO validation aligned
- ✅ Role enum values standardized

### Stability
- ✅ Tenant context guard ordering fixed
- ✅ Login 500 errors resolved
- ✅ TypeScript compile errors fixed

---

## Notes

1. **No Product Language**: This document tracks engineering execution only. No MVP features, no product decisions.

2. **Commit Links**: Commits to be added as work is merged to main.

3. **Test Proof Required**: All fixes must include test proof (integration or e2e).

4. **No Overlap with MVP**: This stream does not define MVP scope or blockers. See `docs/MVP_PARITY_MATRIX.md` for product decisions.

---

**Last Updated:** 2025-01-27
**Next Review:** After remaining open work items completed
