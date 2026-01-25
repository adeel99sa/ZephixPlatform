# CI Failures Root Cause Research & Diagnostic Plan

**Date**: 2025-01-XX  
**Commit**: `a5da0fce` - "fix(lint): resolve all 11 frontend linting errors"  
**Status**: ⚠️ **RESEARCH ONLY - NO IMPLEMENTATION**

---

## Executive Summary

After fixing 11 frontend linting errors, **4 CI jobs are still failing**:
1. ✅ **Frontend linting**: Fixed (0 errors, 32 warnings)
2. ❌ **Contract Tests Gate**: Failing
3. ❌ **verify**: Failing  
4. ❌ **Billing Contract & Smoke Tests**: Failing
5. ❌ **Templates Contract & Smoke Tests**: Failing

**Key Finding**: The linting fixes resolved frontend code quality issues, but **backend tests and smoke tests are failing independently**. This suggests the failures are **not related to the frontend linting changes**.

---

## Job Analysis

### 1. Contract Tests Gate (`contract-gate`)

**Location**: `.github/workflows/ci.yml:4-329`

**What it does**:
- Runs on every PR (critical gate)
- Sets up PostgreSQL 16 test database
- Runs multiple backend validation steps:
  1. `npm run guard:deploy` - Build + smoke test
  2. Tenancy guard checks (modules + full backend)
  3. TenantAwareRepository validation scripts
  4. WorkspaceAccessService import checks
  5. Environment variable truthy checks
  6. Route order validation (extensive checks)
  7. Response format guardrails
  8. Smoke tests (`npm test -- --testPathPattern="smoke"`)
  9. Lint changed files (`npm run lint:changed`)
  10. Circular dependency checks
  11. **Contract tests** for 8 modules:
      - `admin.controller.spec.ts`
      - `billing.controller.spec.ts`
      - `templates.controller.spec.ts`
      - `workspaces.controller.spec.ts`
      - `projects.controller.spec.ts`
      - `workspace-modules.controller.spec.ts`
      - `integrations.controller.spec.ts`
      - `external-user-mappings.controller.spec.ts`

**Failure Points** (any step can fail):
- Backend build failure
- Smoke test failure
- Lint failure (changed files only)
- Contract test failure (any of 8 modules)
- Script validation failure (tenancy, route order, etc.)

**Duration**: ~1m 22s (failed)

---

### 2. verify Job

**Location**: `.github/workflows/ci.yml:330-340`

**What it does**:
1. `cd zephix-frontend && npm ci` - Install dependencies
2. `cd zephix-frontend && npm run build` - Build frontend
3. `cd zephix-frontend && npm run test:guardrails` - Run guardrail tests
4. `uses: microsoft/playwright-github-action@v1` - Setup Playwright
5. `cd zephix-frontend && npm run test:smoke` - Run smoke tests

**Failure Points**:
- Build failure (TypeScript errors, missing dependencies)
- Guardrail test failure (`vitest run src/test/guardrails`)
- Smoke test failure (`playwright test -g "login -> hub"`)

**Duration**: ~55s (failed)

**Note**: This job **does NOT run linting** - it only builds, runs guardrails, and smoke tests.

---

### 3. Billing Contract & Smoke Tests

**Location**: `.github/workflows/ci.yml:376-416`

**What it does**:
- Runs on push or if billing files changed
- Sets up PostgreSQL 15 test database
- Runs: `npm test -- billing.controller.spec.ts`
- Smoke test step is `continue-on-error: true` (informational only)

**Failure Points**:
- Contract test failure (`billing.controller.spec.ts`)
- Database connection issues
- Test setup/teardown failures

**Duration**: ~59s (failed)

---

### 4. Templates Contract & Smoke Tests

**Location**: `.github/workflows/ci.yml:460-500`

**What it does**:
- Runs on push or if templates files changed
- Sets up PostgreSQL 15 test database
- Runs: `npm test -- templates.controller.spec.ts`
- Smoke test step is `continue-on-error: true` (informational only)

**Failure Points**:
- Contract test failure (`templates.controller.spec.ts`)
- Database connection issues
- Test setup/teardown failures

**Duration**: ~1m 3s (failed)

---

## Root Cause Hypotheses

### Hypothesis 1: Backend Contract Tests Failing (Most Likely)

**Evidence**:
- All 4 failing jobs involve backend contract tests
- `Contract Tests Gate` runs 8 contract test files
- `Billing Contract & Smoke Tests` runs `billing.controller.spec.ts`
- `Templates Contract & Smoke Tests` runs `templates.controller.spec.ts`
- `verify` job runs frontend guardrails/smoke (could be failing due to API contract mismatch)

**Possible Causes**:
1. **API contract changes** in Phase 0A Slice 4 (org invites) broke existing contract tests
2. **Database schema changes** (org_invites migration) causing test setup failures
3. **Authentication changes** (auto-login on invite accept) breaking test auth flows
4. **Response format changes** breaking contract test expectations

**Investigation Steps**:
1. Check if contract tests import/use org invites endpoints
2. Check if contract tests expect specific response formats that changed
3. Check if contract tests use authentication that might be affected by new auth flow
4. Review recent changes to `org-invites.controller.ts` and related DTOs

---

### Hypothesis 2: Frontend Guardrails/Smoke Tests Failing

**Evidence**:
- `verify` job runs `test:guardrails` and `test:smoke`
- Frontend linting was fixed, but tests might be failing for other reasons

**Possible Causes**:
1. **Guardrail tests** failing due to new code patterns in org invites flow
2. **Smoke tests** failing due to Playwright not finding elements (UI changes)
3. **Build failures** (TypeScript errors not caught by lint)
4. **Test setup issues** (missing mocks, API client changes)

**Investigation Steps**:
1. Check `src/test/guardrails/` directory for test files
2. Check Playwright smoke test files for login flow
3. Verify frontend build succeeds locally
4. Check if new `AcceptInvitePage` component breaks existing tests

---

### Hypothesis 3: Backend Build/Deployment Guard Failing

**Evidence**:
- `Contract Tests Gate` runs `npm run guard:deploy` first
- If this fails, all subsequent steps are skipped

**Possible Causes**:
1. **Build failure** (TypeScript compilation errors)
2. **Smoke test failure** in deployment guard
3. **Missing dependencies** or lockfile mismatch
4. **Environment variable issues** in CI

**Investigation Steps**:
1. Check what `guard:deploy` script does in `zephix-backend/package.json`
2. Verify backend builds successfully locally
3. Check if new migrations cause build issues
4. Verify all environment variables are set in CI

---

### Hypothesis 4: Database Migration Issues

**Evidence**:
- Recent commit `c3b29bf7` modified org_invites migration to use conditional DDL
- All failing jobs use PostgreSQL test databases
- Migration might fail in CI but pass locally

**Possible Causes**:
1. **Migration order issues** - org_invites migration runs before/after other migrations
2. **Conditional DDL logic** failing in CI environment
3. **Database state** in CI differs from local (clean vs. existing data)
4. **PostgreSQL version mismatch** (CI uses postgres:16, some jobs use postgres:15)

**Investigation Steps**:
1. Review `1800000000000-CreateOrgInvitesTable.ts` migration file
2. Check migration order/timestamps
3. Verify conditional DDL logic handles all edge cases
4. Test migration on clean database (like CI)

---

### Hypothesis 5: Test Data/Setup Issues

**Evidence**:
- Contract tests require specific test data setup
- New org invites feature might need new test fixtures
- Authentication changes might break test user creation

**Possible Causes**:
1. **Missing test fixtures** for org invites
2. **Test user creation** broken by auth changes
3. **Database seeding** failing in CI
4. **Test isolation** issues (tests interfering with each other)

**Investigation Steps**:
1. Check contract test files for test data setup
2. Verify test fixtures include org invites if needed
3. Check if test user creation still works
4. Review test database setup/teardown

---

## Diagnostic Plan

### Phase 1: Gather Evidence (No Code Changes)

**Step 1.1: Check GitHub Actions Logs**
- [ ] Open PR #18 "Checks" tab
- [ ] Click on each failing job to view detailed logs
- [ ] Identify exact error messages and stack traces
- [ ] Note which step failed (build, test, lint, etc.)
- [ ] Capture full error output for each job

**Step 1.2: Identify Common Failure Pattern**
- [ ] Compare error messages across all 4 failing jobs
- [ ] Check if failures are:
  - Same error in all jobs (systemic issue)
  - Different errors (multiple independent issues)
  - Related to specific files/modules (org invites, auth, etc.)

**Step 1.3: Check Recent Changes Impact**
- [ ] Review commits since last successful CI run
- [ ] Identify which changes could affect:
  - Backend contract tests
  - Frontend guardrails/smoke tests
  - Database migrations
  - Authentication flows

**Step 1.4: Local Verification**
- [ ] Run backend contract tests locally: `npm test -- billing.controller.spec.ts`
- [ ] Run templates contract tests locally: `npm test -- templates.controller.spec.ts`
- [ ] Run frontend guardrails: `npm run test:guardrails`
- [ ] Run frontend smoke tests: `npm run test:smoke`
- [ ] Compare local results with CI failures

---

### Phase 2: Root Cause Analysis (No Code Changes)

**Step 2.1: Analyze Error Messages**
- [ ] Categorize errors:
  - TypeScript compilation errors
  - Test assertion failures
  - Database connection errors
  - Authentication errors
  - Missing dependencies
  - Timeout errors

**Step 2.2: Trace Error to Source Code**
- [ ] For each error, identify:
  - Which file/module is failing
  - Which function/method is failing
  - What changed recently in that area
  - What dependencies it has

**Step 2.3: Check Test Coverage**
- [ ] Verify contract tests cover org invites endpoints (if applicable)
- [ ] Check if new code paths are tested
- [ ] Identify missing test coverage that might cause failures

**Step 2.4: Environment Comparison**
- [ ] Compare CI environment with local:
  - Node version (CI: 20, verify local matches)
  - PostgreSQL version (CI: 15/16, verify local)
  - Environment variables (check CI secrets)
  - npm cache state (CI uses cache, local might not)

---

### Phase 3: Solution Planning (No Implementation)

**Step 3.1: Categorize Fixes Needed**
- [ ] **Critical fixes** (blocking all tests):
  - Fix contract test failures
  - Fix build errors
  - Fix database migration issues
  
- [ ] **Moderate fixes** (blocking specific jobs):
  - Fix guardrail test failures
  - Fix smoke test failures
  - Fix specific contract test files

- [ ] **Low priority** (warnings, non-blocking):
  - Test warnings
  - Deprecation notices
  - Performance optimizations

**Step 3.2: Create Fix Strategy**
- [ ] For each identified issue:
  - Document root cause
  - Propose fix approach
  - Estimate complexity (simple/medium/complex)
  - Identify risks (breaking changes, side effects)
  - Suggest testing approach

**Step 3.3: Prioritize Fixes**
- [ ] Order fixes by:
  1. Impact (how many jobs does it fix?)
  2. Complexity (how hard is it to fix?)
  3. Risk (what could break?)
  4. Dependencies (what must be fixed first?)

---

## Files to Investigate

### Backend Contract Tests
- `zephix-backend/src/**/*.controller.spec.ts` (8 files)
- `zephix-backend/src/modules/org-invites/**/*.spec.ts` (if exists)
- `zephix-backend/test/**/*.e2e-spec.ts` (E2E tests)

### Frontend Tests
- `zephix-frontend/src/test/guardrails/**/*.test.*`
- `zephix-frontend/tests/**/*.spec.ts` (Playwright tests)
- `zephix-frontend/playwright.config.ts`

### Backend Scripts
- `zephix-backend/package.json` (scripts: `guard:deploy`, test commands)
- `zephix-backend/scripts/check-*.sh` (validation scripts)

### Migrations
- `zephix-backend/src/migrations/1800000000000-CreateOrgInvitesTable.ts`
- Other recent migrations that might conflict

### Configuration
- `.github/workflows/ci.yml` (CI configuration)
- `.github/workflows/enterprise-ci.yml` (Enterprise CI)
- `zephix-backend/.env.test` (test environment variables)

---

## Next Steps (After Architect Review)

1. **If Hypothesis 1 (Contract Tests) is confirmed**:
   - Review contract test files for org invites impact
   - Update contract tests to match new API contracts
   - Add test fixtures for org invites if needed

2. **If Hypothesis 2 (Frontend Tests) is confirmed**:
   - Fix guardrail test failures
   - Update Playwright smoke tests for new UI flows
   - Verify test mocks match new API client changes

3. **If Hypothesis 3 (Build Guard) is confirmed**:
   - Fix backend build errors
   - Update deployment guard script
   - Verify environment variables

4. **If Hypothesis 4 (Migrations) is confirmed**:
   - Review migration conditional DDL logic
   - Test migration on clean database
   - Fix migration order/timing issues

5. **If Hypothesis 5 (Test Setup) is confirmed**:
   - Add missing test fixtures
   - Fix test data setup
   - Update test isolation/teardown

---

## Questions for Architect

1. **Should we prioritize fixing contract tests first?** (They block the most jobs)
2. **Are the org invites changes expected to break existing contract tests?** (If yes, tests need updates)
3. **Should we run CI locally first before pushing fixes?** (To avoid multiple CI runs)
4. **Are there any known flaky tests we should ignore?** (To focus on real failures)
5. **Should we create a separate branch for CI fixes?** (To keep PR #18 focused on Phase 0A)

---

## Risk Assessment

**Low Risk**:
- Fixing test assertions to match new API contracts
- Updating test fixtures for new features
- Fixing test setup/teardown

**Medium Risk**:
- Modifying contract tests (could hide real regressions)
- Changing test database setup (could break other tests)
- Updating migration logic (could cause data loss)

**High Risk**:
- Changing core test infrastructure
- Modifying CI workflow (could break all jobs)
- Changing authentication test setup (affects all tests)

---

**Status**: ✅ Research Complete - Awaiting Architect Review  
**Next Action**: Architect reviews this document and approves investigation approach
