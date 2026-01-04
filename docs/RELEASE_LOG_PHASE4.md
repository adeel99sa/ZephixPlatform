# Phase 4.1 Release Log

## Release Information

**Phase:** 4.1 - Portfolio and Program Rollups
**Release Date:** TBD
**Commit SHA:** TBD
**Commit SHA Trusted:** TBD

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
  - **Root Cause**: PortfoliosModule was importing WorkspacesModule (with forwardRef), which imports SharedModule. The circular resolution path was causing stack overflow during module initialization.
  - **Solution**: Removed dependency on SharedModule from PortfoliosModule by providing ResponseService directly in PortfoliosModule providers array. This breaks the circular dependency chain while maintaining functionality.
  - **Files Changed**: 
    - `zephix-backend/src/modules/portfolios/portfolios.module.ts` - Added ResponseService to providers, removed SharedModule dependency comment
  - **Verification**: E2E test now passes module initialization without stack overflow. Test failures are now limited to database setup issues (separate concern).
  - **Debug Artifact**: Error captured in `zephix-backend/test/_debug_portfolio_cycle.txt`

## Final Signoff

- [ ] All smoke tests passing
- [ ] E2E tests passing locally
- [ ] Migration verified in production
- [ ] API documentation updated
- [ ] Release approved

## Notes

- Summary endpoints require `x-workspace-id` header
- Portfolio and Program are organization-scoped
- Projects are workspace-scoped but roll up to org-level portfolios/programs
- Summary computation uses existing `CapacityMathHelper` for consistency

