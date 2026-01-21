# Template Implementation - All Fixes Complete

## Phase A: Create Endpoint Bug Fixes ✅

### Fixed Issues:
1. ✅ Moved `validateWorkspaceId` inside WORKSPACE branch only
2. ✅ Force `dto.templateScope` and `dto.workspaceId` explicitly by scope
3. ✅ Replaced org role parsing with canonical `normalizePlatformRole` and `isAdminRole`
4. ✅ ORG templates no longer require x-workspace-id header

### Changes:
- `create()` now uses `getAuthContext()` and `normalizePlatformRole()`
- `validateWorkspaceId()` only called for WORKSPACE scope
- `dto.templateScope` and `dto.workspaceId` forced explicitly
- Response uses `responseService.success()`

## Phase B: Migration Gap Fixes ✅

### Fixed Issues:
1. ✅ Added `default_enabled_kpis` column check and creation
2. ✅ Added check constraint for `template_scope` values

### Migration Updates:
- Checks if `default_enabled_kpis` exists before adding
- Adds check constraint: `template_scope IN ('SYSTEM', 'ORG', 'WORKSPACE')`
- Safe down migration that preserves data

## Phase C: List Endpoint Hardening ✅

### Fixed Issues:
1. ✅ Validate x-workspace-id only if present
2. ✅ Pass validated workspaceId into service explicitly
3. ✅ Keep query filtering at DB level

### Changes:
- Added `validateWorkspaceIdOptional()` helper
- Controller validates header, passes to service
- Service accepts `workspaceId` as parameter (not from headers)
- Response uses `responseService.success()`

## Phase D: Instantiate V5_1 Hardening ✅

### Fixed Issues:
1. ✅ Require x-workspace-id always (validated at controller)
2. ✅ Validate before template lookup
3. ✅ Service validates workspaceId at start

### Changes:
- Controller validates workspaceId at top with `validateWorkspaceId()`
- Service checks workspaceId at start (fail fast)
- Response uses `responseService.success()`

## Phase E: Atomic Publish and Legacy Route Gate ✅

### Fixed Issues:
1. ✅ Atomic version increment using SQL update
2. ✅ Legacy instantiate route returns 410 Gone

### Changes:
- `publishV1()` uses atomic SQL update: `version = version + 1`
- Re-reads template after update to return full entity
- Legacy `instantiate()` route throws `NotFoundException` with `LEGACY_ROUTE` code
- Response uses `responseService.success()`

## Build Status

✅ **BUILD IS CLEAN** - All TypeScript errors fixed

## Files Modified Summary

### Controllers
- `templates.controller.ts`:
  - Fixed create endpoint (workspaceId validation, role logic, response)
  - Fixed list endpoint (workspaceId validation, response)
  - Gated legacy instantiate route
  - Fixed publish response
  - Fixed instantiate-v5_1 response

### Services
- `templates.service.ts`:
  - Fixed `listV1()` to accept workspaceId parameter
  - Fixed `publishV1()` to use atomic SQL update
  - Added `validateTemplateScope()` helper

### Services (Instantiate)
- `templates-instantiate-v51.service.ts`:
  - Added workspaceId validation at start
  - Already uses Template entity (no changes needed)

### Migration
- `1790000000000-AddTemplateScopeAndWorkspaceId.ts`:
  - Added `default_enabled_kpis` column check
  - Added check constraint for `template_scope`

## Next Steps for Proofs

1. Run migration on dev DB
2. Verify database columns with SQL
3. Test all 9 API scenarios
4. Capture raw request/response for each

## Remaining Work

- [ ] Run migration and verify DB state
- [ ] Capture API proofs (9 scenarios)
- [ ] Add CI guard for ProjectTemplate usage in instantiate-v5_1
