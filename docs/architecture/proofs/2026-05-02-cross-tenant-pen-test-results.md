# Cross-Tenant Pen Test Execution Results — 2026-05-02

**Date:** 2026-05-02 (local executor timezone: America/* per host)  
**HEAD SHA:** `9a825cb4b18344db0fea8292ad47e1e305f79e30` (`Merge pull request #236 … password reset + session hardening` on `staging`)  
**Migration state:** `npm run migration:run` against `zephix_test` completed successfully through latest migrations present at this SHA (including `AddGoogleIdToUsers18000000000078`).  
**Executor:** Cursor under architect direction  
**Environment:** macOS, PostgreSQL listening on `127.0.0.1:5432`; superuser connection used `POSTGRES_USER=malikadeel` for `scripts/setup-test-db.sh` (peer/trust); app DB user `zephix_test_user` / DB `zephix_test`.  
**Status:** **PARTIAL** — execution attempted with full honesty; suite is **not green**.

---

## Execution summary

| Metric | Value |
|--------|------:|
| Target files / commands | 9 |
| Files that ran tests (Jest executed ≥1 test) | 6 |
| Files blocked before tests (TypeScript compile errors) | 3 |
| Total test cases (ran files only) | 22 |
| Passed | 4 |
| Failed | 18 |
| Blocked (no tests executed) | 3 files |
| Skipped | 0 |

**Critical cross-tenant data leak observed in this run:** **None proved.** Failures are primarily **fixture/schema drift**, **compile-time breakage**, **HTTP status mismatch vs expectations**, and **runtime guardrail assertions not matching observed behavior** — each needs triage; some imply **defense-in-depth gaps** (see below).

---

## Per-file results

### 1. `test/security/tenant-isolation.e2e-spec.ts` — **FAIL** (1/2 passed)

| Result | Test | Notes |
|--------|------|--------|
| FAIL | `GET /api/my-work should return 403 with token missing organizationId` | Expected **403**, received **500**. Server throws `Tenant context missing: organizationId is required` from `TenantContextService.assertOrganizationId` → unhandled path for this route (client-visible error discipline gap). |
| PASS | `Cross tenant read should be blocked` | OK |

### 2. `test/tenancy/tenant-isolation.e2e-spec.ts` — **BLOCKED (compile)**

TypeScript errors (examples): `ProjectStatus` — `'active'` not assignable; missing symbols `workspaceA` / `workspaceB`. **0 tests executed.**

### 3. `test/tenancy/custom-fields-tenant-isolation.e2e-spec.ts` — **FAIL** (0/4 passed)

| Failure mode | Detail |
|--------------|--------|
| DB | `QueryFailedError: relation "custom_fields" does not exist` on insert — schema/entity/table naming mismatch vs migrated DB. |
| Cleanup | `afterAll` references undefined `customFieldA.id` when setup failed. |

### 4. `test/tenancy/teams-tenant-isolation.e2e-spec.ts` — **FAIL** (0/2 passed)

| Failure mode | Detail |
|--------------|--------|
| DB enum | `invalid input value for enum team_visibility_enum: "org"` — seed/fixture out of sync with DB enum values. |
| Cleanup | `teamA.id` undefined after failed setup. |

### 5. `test/tenancy/tasks-tenant-isolation.e2e-spec.ts` — **FAIL** (0/4 passed)

| Failure mode | Detail |
|--------------|--------|
| DB column | `column "due_date" of relation "tasks" does not exist` — entity/fixture vs schema drift. |
| Cleanup | Similar undefined IDs in `afterAll`. |

### 6. `test/tenancy/billing-tenant-isolation.e2e-spec.ts` — **FAIL** (2/5 passed)

| Result | Test | Notes |
|--------|------|--------|
| PASS | Org A sees only own subscription | OK |
| FAIL | Org A cannot access Org B subscription | Expected **404**, got **403** — isolation likely OK; assertion/API contract mismatch. |
| FAIL | Org B cannot update Org A subscription | Expected **404**, got **403** |
| FAIL | Org B cannot delete Org A subscription | Expected **404**, got **403** |
| PASS | Both orgs can access plans endpoint | OK |

### 7. `test/tenant-isolation.e2e-spec.ts` — **BLOCKED (compile)**

`import * as request from 'supertest'` — TS2349 not callable under current `esModuleInterop` settings. **0 tests executed.**

### 8. `test/tenant-repository-unsafe-ops.e2e-spec.ts` — **BLOCKED (compile)**

Type errors: `WorkItemStatus` (`'todo'` invalid), `create()` / `savedItem.id` typing. **0 tests executed.**

### 9. `test/tenancy/runtime-guardrail-bypass.spec.ts` — **FAIL** (1/5 passed)

**Command:** documented under [Reproducibility](#reproducibility). Default Jest **5000 ms** hook timeout failed on first attempt; **120000 ms** allowed bootstrap.

| Result | Scenario | Notes |
|--------|-----------|--------|
| FAIL | `getMany()`, `getOne()`, `execute()`, `getRawMany()` on `repository.createQueryBuilder('project')` | Each expected rejection with `Tenant scoping bypass detected…`; observed **resolution / no throw** on bypass paths — guardrail **did not fire** as tests describe (see `runtime-guardrail-bypass.spec.ts` lines 33–95). |
| PASS | `should NOT throw when using TenantAwareRepository.qb()` | **Vacuous:** body only closes `runWithTenant` callback — **no assertion** on `TenantAwareRepository`; pass carries **no proof** of safe QB usage. |

**Severity:** Treat as **CRITICAL for defense-in-depth verification** until triaged: either tests are stale, or bypass detection is incomplete for some query paths. **Not** the same as “HTTP cross-tenant leak,” but relevant to Engine 1 / tenancy guarantees.

---

## Critical findings

1. **Runtime guardrail suite (`runtime-guardrail-bypass.spec.ts`):** Multiple cases expect throws on `DataSource.createQueryBuilder` usage; **`execute()` / `getRawMany()` resolved successfully** with data. Requires engineering review — **do not assume bypass protection holds for all raw QB paths** until resolved.
2. **My-work missing-org path returns 500** instead of controlled **403** — error-handling / guard ordering issue (user-visible and observability concern).

## Important findings

- **Three files do not compile** under `ts-jest` + `tsconfig.spec.json` — suite cannot run in CI until fixed.
- **Custom fields / teams / tasks** suites fail on **missing relation/column/enum** — tests have **not been kept aligned** with migrations.
- **Billing** cross-tenant scenarios return **403 vs expected 404** — likely **acceptable security posture**; tests should be updated or API standardized in a **follow-up PR** (out of scope for execution-only PR).

## Coverage gaps identified

- **Programs / portfolios cross-workspace scenarios** (PR #235 class) — **not** covered by this inventory; acknowledge per architect instruction.
- **`runtime-guardrail-bypass.spec.ts`** suffix **`.spec.ts`** — excluded from default `jest-e2e.json` (`testRegex: .e2e-spec.ts$`). **Tech debt:** rename to `.e2e-spec.ts` or adjust config so standard `npm run test:e2e` includes it.
- **`npm run test:e2e` precondition** requires `DATABASE_URL` **before** `setup-test-db.sh` runs — local footgun; operators may see **silent skip** when unset.

---

## V21 Section 6 update

Applied in-repo: `docs/architecture/V21_CURRENT_STATE_AUDIT.md` §6 now records **EXECUTED (PARTIAL)** counts, proof link, and clarifies that external pen test is still **NOT DONE**. §5 Production Readiness row for multi-tenant isolation updated to **PARTIAL — EXECUTED, NOT GREEN**.

---

## Recommended follow-ups

| Priority | Action |
|----------|--------|
| P0 | Triage **runtime guardrail** failures vs implementation (fix implementation or tests) — **separate PR**. |
| P1 | Repair **TypeScript** in `tenant-isolation` (tenancy), root `tenant-isolation`, `tenant-repository-unsafe-ops`. |
| P1 | Align **custom-fields / teams / tasks** fixtures with live schema (migrations or test data). |
| P2 | Normalize **billing** tests to accept **403** or change API to **404** consistently — **separate PR**. |
| P2 | **My-work** missing `organizationId`: map to **403** + structured error (product/security UX). |
| P3 | Engine 1 **PR #6 candidate:** expand coverage to **programs/portfolios** cross-workspace cases. |
| P3 | Rename **`runtime-guardrail-bypass.spec.ts`** → `.e2e-spec.ts` (or equivalent) so default e2e picks it up. |

---

## Reproducibility

**Environment**

```bash
export NODE_ENV=test
export POSTGRES_USER=malikadeel   # or your local superuser that can create DB/users
export POSTGRES_PASSWORD=       # empty if trust auth
cd zephix-backend && bash scripts/setup-test-db.sh
export DATABASE_URL='postgresql://zephix_test_user:zephix_test_password@127.0.0.1:5432/zephix_test?sslmode=disable'
npm run migration:run
```

**Standard per-file e2e**

```bash
cd zephix-backend
npx jest --config ./test/jest-e2e.json --runInBand --forceExit test/security/tenant-isolation.e2e-spec.ts
# Repeat with each path under test/…
```

**`runtime-guardrail-bypass.spec.ts` (architect-approved explicit command)**

```bash
cd zephix-backend
export NODE_ENV=test
export DATABASE_URL='postgresql://zephix_test_user:zephix_test_password@127.0.0.1:5432/zephix_test?sslmode=disable'
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testRegex='runtime-guardrail-bypass\.spec\.ts$' \
  --testTimeout=120000
```

**Full suite (not required for this dispatch):** `npm run test:e2e` — requires `DATABASE_URL` already set **before** the script’s guard runs (see `package.json`).

---

## Operator note (Path A → Path B)

This run succeeded **Path A** (local DB reachable after `setup-test-db.sh`). If another environment lacks Postgres or credentials, document **BLOCKED** with the failing command and error text — **do not infer pass/fail.**
