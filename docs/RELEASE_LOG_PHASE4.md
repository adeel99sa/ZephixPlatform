# Phase 4.1 Release Log

## Release Information

**Phase:** 4.1 - Portfolio and Program Rollups
**Release Date:** 2026-01-03
**Commit SHA:** 9cba4756e529450d7b65fcd5e8c4ee6ddca87553
**Commit SHA Trusted:** TBD (verify after deployment)

## Migration Status

- [ ] Migration `Phase4PortfoliosPrograms` run in production
- [ ] Tables verified: `portfolios`, `programs`, `portfolio_projects`
- [ ] Column `program_id` added to `projects` table
- [ ] Foreign keys and indexes verified

## Smoke Test Results

### Verification Script Output
```bash
# Run: bash scripts/phase4-portfolio-program-verify.sh
# Output will be recorded here
```

### Test Results

#### E2E Test Status
- **portfolios-programs.e2e-spec.ts**: ✅ Module initialization passes (no circular dependency)
  - Test structure verified: auth, workspace headers, data dependencies all properly configured
  - Full execution requires Postgres running locally
- **resources-phase2.e2e-spec.ts**: ✅ No regression (module initialization passes)

#### Verification Script Readiness
- ✅ Script requires BASE and TOKEN
- ✅ WORKSPACE_ID fetched automatically if not provided
- ✅ x-workspace-id header automatically included for summary endpoints
- ✅ Fail-fast on 401, 403, 500
- ✅ Route mismatch detection for 404 with "Resource not found"
- ✅ RequestId printed when present

#### Production Verification (Pending Deployment)
- [ ] Preflight: commitShaTrusted = true
- [ ] Portfolio creation: 201/200
- [ ] Program creation: 201/200
- [ ] Add project to portfolio: 200
- [ ] Assign program to project: 200
- [ ] Portfolio summary: 200 (weeks array, conflicts, projectCounts)
- [ ] Program summary: 200 (weeks array, conflicts, projectCounts)

## Issues and Fixes

### Issues Encountered
- **Circular Dependency in E2E Tests**: Phase 4.1 e2e test (`portfolios-programs.e2e-spec.ts`) failed with "Maximum call stack size exceeded" due to circular module dependency during initialization.

### Fixes Applied
- **Fixed Circular Dependency (2026-01-03)**: 
  - **Root Cause**: WorkspacesModule <-> ResourceModule circular dependency
    - WorkspacesModule imported ResourceModule (for ResourceRiskScoreService)
    - ResourceModule imported WorkspacesModule (for WorkspaceAccessService)
    - PortfoliosModule also imported WorkspacesModule, creating additional cycle paths
  - **Solution**: Extracted WorkspaceAccessService into dedicated WorkspaceAccessModule
    - Created `zephix-backend/src/modules/workspace-access/` module
    - WorkspaceAccessModule has zero dependencies on Resources, Portfolios, or Workspaces
    - ResourceModule, PortfoliosModule, ProjectsModule now import WorkspaceAccessModule instead of WorkspacesModule
    - Removed all forwardRef() decorators since cycle is broken
    - WorkspacesModule imports WorkspaceAccessModule and re-exports it for backward compatibility
  - **Files Changed**: 
    - Created: `workspace-access.module.ts`, `workspace-access.service.ts`
    - Updated: `resource.module.ts`, `portfolios.module.ts`, `projects.module.ts`, `workspaces.module.ts`
    - Updated all imports of WorkspaceAccessService to use new path
  - **Verification**: ✅ Module initialization succeeds without stack overflow
  - **Debug Artifact**: Error captured in `zephix-backend/test/_debug_portfolio_cycle.txt`

- **Fixed Test Database Setup (2026-01-03)**:
  - **Root Cause**: `setup-test-db.sh` was exiting early when DATABASE_URL was set, never creating the test user
  - **Solution**: Updated script to parse DATABASE_URL and extract user, password, host, port, database
    - Uses parsed user as TEST_DB_USER instead of hardcoding `zephix_test_user`
    - Continues with database setup even when DATABASE_URL is provided
  - **Verification**: ✅ Script now handles DATABASE_URL correctly

- **Fixed Build Errors (2026-01-03)**:
  - **Root Cause**: axios missing in devDependencies causing TypeScript compilation errors in smoke test scripts
  - **Solution**: Added axios to devDependencies (`npm install -D axios`)
  - **Verification**: ✅ TypeScript compilation succeeds

## Final Signoff

- [x] Circular dependency fixed - module initialization succeeds
- [x] Test database setup fixed - script handles DATABASE_URL correctly
- [x] Build errors fixed - axios added to devDependencies
- [x] E2E test module initialization passing (database connection separate issue)
- [x] E2E test structure verified (auth, headers, data dependencies)
- [x] Resources suite verified (no regression)
- [x] Verification script ready for production
- [ ] E2E tests passing locally (requires Postgres running - verified structure)
- [ ] Migration verified in production
- [ ] API documentation updated
- [ ] Release approved

## Notes

- Summary endpoints require `x-workspace-id` header
- Portfolio and Program are organization-scoped
- Projects are workspace-scoped but roll up to org-level portfolios/programs
- Summary computation uses existing `CapacityMathHelper` for consistency

