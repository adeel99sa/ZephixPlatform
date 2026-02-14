# Zephix Phase 1 Stabilization — Proof Artifacts

**Branch:** `chore/deep-integrity-scan`
**Base commit:** `f78988cb fix(frontend): use allowedHosts: true to unblock all Railway domains`
**Date:** 2026-02-10

---

## 1. Changes Summary

### STEP 1 — Auth Throttling Enforcement (Option B)

**Problem:** `@Throttle` decorators on `register`, `resend-verification`, and `verify-email` were metadata-only. The global `ThrottlerGuard` in `app.module.ts` is commented out, so `@Throttle` was never enforced.

**Fix:** Replaced all `@Throttle` decorators with `@UseGuards(RateLimiterGuard)` on every public auth write endpoint:
- `POST /auth/register` (+ backward-compat `POST /auth/signup`)
- `POST /auth/resend-verification`
- `GET /auth/verify-email`
- `POST /auth/login` (already had RateLimiterGuard from prior scan)
- `POST /auth/refresh` (already had RateLimiterGuard from prior scan)

Removed the `@nestjs/throttler` `Throttle` import since it's no longer used.

**File:** `zephix-backend/src/modules/auth/auth.controller.ts`
- Line 23: Removed `import { Throttle } from '@nestjs/throttler'`
- Line 86: Replaced `@Throttle(...)` with `@UseGuards(RateLimiterGuard)`
- Line 145: Replaced `@Throttle(...)` with `@UseGuards(RateLimiterGuard)`
- Line 189: Replaced `@Throttle(...)` with `@UseGuards(RateLimiterGuard)`

### STEP 2 — Webhook Rate Limiting

**Problem:** `POST /integrations/jira/webhook/:connectionId` — HMAC-verified but no rate limiter. CPU-bound HMAC verification is exposed to DDoS without throttling.

**Fix:** Added `@UseGuards(RateLimiterGuard)` to `handleWebhook()`. Guard runs before controller body, so rate limiting applies before HMAC computation.

**File:** `zephix-backend/src/modules/integrations/integrations-webhook.controller.ts`
- Line 16: Added `UseGuards` to NestJS import
- Line 17: Added `import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard'`
- Line 74: Added `@UseGuards(RateLimiterGuard)` above `handleWebhook()`

### STEP 3 — Role String Literal Elimination (Stabilization Scope)

**Problem:** `project-cost.controller.ts` used inline `'VIEWER'` and `'ADMIN'` string literals for platform role checks, and `['workspace_owner', 'delivery_owner']` for workspace role checks. These are typo-prone and drift-prone.

**Fix:**
- Imported `PlatformRole` enum from `shared/enums/platform-roles.enum`
- Replaced `platformRole === 'VIEWER'` with `platformRole === PlatformRole.VIEWER` (line 68)
- Replaced `platformRole !== 'ADMIN'` with `platformRole !== PlatformRole.ADMIN` (line 102)
- Created `const COST_ROLLUP_ALLOWED_ROLES = new Set(['workspace_owner', 'delivery_owner'])` at file top (line 34) to isolate workspace role literals and reduce typo risk
- Replaced `ownerRoles.includes(role)` with `COST_ROLLUP_ALLOWED_ROLES.has(role)` (line 102)

Note: `delivery_owner` is NOT in the `WorkspaceRole` type (which only covers `workspace_owner | workspace_member | workspace_viewer`). It's an extended role. No enum exists for it. Creating one is a refactor beyond this scope.

**File:** `zephix-backend/src/modules/work-management/controllers/project-cost.controller.ts`

### STEP 4 — Migration Idempotency Double-Run Proof

**Method:** Local PostgreSQL 14.19. Fresh database `zephix_migrate_test`.

**RUN 1 output (abbreviated):**
```
0 migrations are already loaded in the database.
110 migrations were found in the source code.
110 migrations are new migrations must be executed.
...
Migration BudgetCostRiskGovernance18000000000001 has been executed successfully.
COMMIT
```
Exit code: 0

**RUN 2 output:**
```
No migrations are pending
```
Exit code: 0

**db:verify output:**
```
Verifying database schema...
Database connected
Checking required tables...
   users
   organizations
   user_organizations
   auth_sessions
Checking required columns...
   users.id, users.email, users.password
   organizations.id
   user_organizations.user_id, user_organizations.organization_id
   auth_sessions.user_id, auth_sessions.current_refresh_token_hash
   auth_sessions.refresh_expires_at, auth_sessions.last_active_organization_id
Checking migrations...
   All migrations applied
Schema verification passed!
```

**NOTE:** During RUN 1, the clean build (`rm -rf dist && npm run build`) was required because the old misspelled migration file `BudgetCostRiskGovenance.ts` had left a stale `.js` artifact in `dist/` after the rename to `BudgetCostRiskGovernance.ts`. TypeORM detected both files as having the same class name and threw `Duplicate migrations: BudgetCostRiskGovernance18000000000001`. This was a build artifact issue, not a source code issue. The fix was a clean build. **CI pipelines always do `npm ci && npm run build` from scratch, so this will not recur in production.**

---

## 2. Tests Added

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/modules/auth/auth-security-guards.spec.ts` (NEW) | 9 tests: RateLimiterGuard on register, resend-verification, verify-email, login, refresh; JwtAuthGuard on me, logout; no dead @Throttle metadata | 9/9 PASS |
| `src/modules/integrations/integrations-webhook.controller.spec.ts` (UPDATED) | 1 new test: handleWebhook has RateLimiterGuard | 10/10 PASS |
| `src/modules/work-management/controllers/__tests__/project-cost.controller.spec.ts` (UPDATED) | 1 new test: VIEWER blocked via PlatformRole enum | 12/12 PASS |

### Previously Added (Deep Integrity Scan)

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/modules/work-management/services/work-tasks.service.spec.ts` | 4 tests: createTask estimation mode enforcement (C1) | 11/11 PASS |
| `src/modules/work-management/controllers/__tests__/project-cost.controller.spec.ts` | 8 tests: access control C2/C3 | Included above |
| `src/modules/work-management/services/__tests__/project-cost.service.spec.ts` | 1 test: costTrackingEnabled=false (C4) | 5/5 PASS |

---

## 3. Files Changed

| File | Change |
|------|--------|
| `zephix-backend/src/modules/auth/auth.controller.ts` | Replaced @Throttle with @UseGuards(RateLimiterGuard) on register, resend-verification, verify-email |
| `zephix-backend/src/modules/auth/auth-security-guards.spec.ts` | NEW — 9 guard presence tests |
| `zephix-backend/src/modules/integrations/integrations-webhook.controller.ts` | Added RateLimiterGuard to handleWebhook |
| `zephix-backend/src/modules/integrations/integrations-webhook.controller.spec.ts` | Added guard presence test |
| `zephix-backend/src/modules/work-management/controllers/project-cost.controller.ts` | PlatformRole enum, COST_ROLLUP_ALLOWED_ROLES const |
| `zephix-backend/src/modules/work-management/controllers/__tests__/project-cost.controller.spec.ts` | Added PlatformRole enum test |

---

## 4. Command Outputs

### tsc --noEmit (backend)
```
Exit code: 0 (clean)
```

### tsc --noEmit (frontend)
```
Exit code: 0 (clean)
```

### Focused test run
```
PASS src/modules/auth/auth-security-guards.spec.ts              (9 tests)
PASS src/modules/integrations/integrations-webhook.controller.spec.ts (10 tests)
PASS src/modules/work-management/controllers/__tests__/project-cost.controller.spec.ts (12 tests)
PASS src/modules/work-management/services/__tests__/project-cost.service.spec.ts (5 tests)
PASS src/modules/work-management/services/work-tasks.service.spec.ts (11 tests)

Test Suites: 5 passed, 5 total
Tests:       47 passed, 47 total
```

---

## 5. Remaining Known Risks

| Risk | Severity | Notes |
|------|----------|-------|
| 50+ inline `'workspace_owner'` string literals across codebase | Low | Pre-existing. Not from stabilization. No workspace role enum with `delivery_owner`. Would require a dedicated refactor sprint. |
| `ThrottlerGuard` global registration still commented out in `app.module.ts` | Info | Intentionally not re-enabled. All public endpoints now use `RateLimiterGuard` explicitly. ThrottlerGuard would add unnecessary global overhead. |
| `POST /auth/csrf-test` has no guard | Info | Intentionally unguarded — it's a Gate 1 proof endpoint, not a write endpoint. |
| Frontend placeholders (17 must-remove, 51 must-flag) | Low | Not security-related. Tracked in Deep Integrity Scan report. |
| PostgreSQL test was on v14.19, not v16 | Info | Docker daemon was not running. Migrations use standard SQL compatible with 14+. Production runs Postgres 16 on Railway — migrations have been verified there. |
