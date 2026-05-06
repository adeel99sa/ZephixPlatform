# DISPATCH: PR #8c Pen Test Re-execution + New Proof Artifact — Execution

**Status:** Authored 2026-05-05. Pre-recon complete (Claude Desktop). Architect Gate 2 decisions accepted by PO. Ready for Phase 1 implementation.
**Author:** Solution Architect (Claude)
**Type:** Test execution + documentation + minor TS repair. Bounded scope.
**Engine 1 criterion 10:** This PR closes the criterion. Final component of closure path.
**Predecessor:** PR #8c Pre-recon Directive + PO confirmation of 3 architect decisions.

---

## CRITICAL CONTEXT — read first

**This dispatch closes Engine 1 criterion 10.** It executes pen test against current stable foundation (post-PR-248/249/250/251), captures clean proof artifact, updates V21 docs with new criterion status.

**Critical framing distinction (per Claude Desktop pre-recon insight):**

The new proof artifact will NOT be all-green. Three documented residuals will remain:
1. **Billing suite:** 3 expected-404 / actual-403 assertions still fail (Decision B: documents, does not fix)
2. **`test/security/tenant-isolation.e2e-spec.ts`:** missing-org test still expects 403 / actual 500 (Decision C: defers production fix)
3. **runtime-guardrail-bypass:** unknown until re-run; per `docs/architecture/runtime-guardrail-scope.md`, any guardrail test failure reframes as dev/test signal, NOT security gap

**Expected outcome status transition:**
- 2026-05-02 proof: "PARTIAL — EXECUTED, NOT GREEN" (compile blocks + schema drift + scope ambiguity)
- PR #8c proof: "EXECUTED with KNOWN-DOCUMENTED RESIDUALS" (no compile blocks, no schema drift, residuals explicitly accepted-or-deferred per architect decision)

This is categorically cleaner. Executor MUST NOT read documented residuals as regression. They are expected, scoped, and tracked.

**3 architect decisions baked in (PO accepted):**

1. **Decision A:** Include `work-management-tenancy.e2e-spec.ts` 3 TS fixes in PR #8c (mechanical `DeepPartial<Entity>` cast pattern PR #249 established, ~10 min)
2. **Decision B:** Defer billing 403/404 test assertion updates to separate PR. Document in proof artifact as "expected behavior, tests need updating in separate PR." 403 IS the correct security posture.
3. **Decision C:** Defer my-work 500→403 production code fix to separate PR. Document in proof artifact.

---

## Why this dispatch exists

PR #8c is the final Engine 1 criterion 10 closure component. Predecessors complete:
- ✓ PR #248 (#8a) — dev/test guardrail reconciliation
- ✓ PR #249 (#8b) — test infrastructure repair
- ✓ PR #250 — canonical Task entity drift surfacing
- ✓ PR #251 — orphan Task entity drift removal

Test infrastructure stable. Drift removed from production-used entity. Pen test re-runs against this clean foundation, captures proof artifact reflecting current state, updates V21 docs.

After PR #8c merges → Engine 1 criterion 10 closes.

---

## Scope

### What this dispatch IS

Bounded test execution + documentation + minor TS repair:

1. **Phase 0:** Verification recon (state hasn't shifted since pre-recon)
2. **Phase 1:** Apply 3 TS fixes to `work-management-tenancy.e2e-spec.ts` (Decision A)
3. **Phase 2:** Run full pen test against current staging
4. **Phase 3:** Capture new proof artifact at `docs/architecture/proofs/2026-05-NN-cross-tenant-pen-test-results.md` (date is execution date)
5. **Phase 4:** Update V21 docs (criterion 10 status, §6 numbers, §5 production readiness row)
6. **Phase 5:** Verification + Gate 4 report

### What this dispatch is NOT

- **NOT** billing API behavior change (Decision B: 403 is correct, defer test updates)
- **NOT** my-work production code fix for 500→403 mapping (Decision C: separate PR)
- **NOT** runtime guardrail implementation changes (PR #248 reframed scope; production isolation is different layer)
- **NOT** programs/portfolios cross-workspace test additions (P3 deferred per V21)
- **NOT** TypeORM hook timeout config changes (use `--testTimeout=120000` per command, not config change)
- **NOT** new test additions beyond the 3 TS fixes
- **NOT** test framework migration
- **NOT** any frontend changes
- **NOT** any backend production code changes
- **NOT** Calendar work (Cursor's separate stream)
- **NOT** Frontend Audit Gantt gaps (separate dispatch after PR #8c closes)

### Hard scope boundary — categorical

**IN SCOPE:**
- Test execution + capture
- New proof artifact (markdown documentation only)
- V21 docs updates (3 specific edits)
- 3 TS fixes in `work-management-tenancy.e2e-spec.ts` (Decision A)

**OUT OF SCOPE (always):**
- Production source code changes
- Test logic changes (other than Decision A compile fix)
- API behavior changes
- Schema migrations
- New test files
- Other tenancy test file modifications

If executor finds need to modify production source OR add new test files OR modify other test files → STOP and report.

---

## Phase 0: Pre-flight verification (state hasn't shifted)

### Reconnaissance commands

```bash
# Pre-recon worktree at /Users/malikadeel/Downloads/ZephixApp-pr8c-recon may still be intact at ebac4759
# However: symlinked node_modules in recon worktree is recon-only side effect.
# For execution, use fresh worktree OR existing main repo with proper npm install.

# Recommended: fresh worktree for execution to avoid recon-side-effect contamination
cd /Users/malikadeel/Downloads/ZephixApp
git fetch origin
git worktree add /Users/malikadeel/Downloads/ZephixApp-pr8c-execution -b fix/pr8c-pen-test-reexecution origin/staging

cd /Users/malikadeel/Downloads/ZephixApp-pr8c-execution
git rev-parse HEAD
# Should match: ebac4759 (PR #251) or later

# Real npm install (NOT symlinked)
cd zephix-backend
npm install

# Verify state matches pre-recon findings
git log --oneline -5
# Should show PR #251 → PR #250 → PR #249 → PR #248 → PR #247 (or later if more merges)

# Verify the 3 TS errors in work-management-tenancy.e2e-spec.ts still present
npx tsc --noEmit -p tsconfig.spec.json 2>&1 | grep "work-management-tenancy" | head -10
# Should show 3 errors at lines 117, 142 area (DeepPartial overload)

# Verify FIXME counts haven't shifted
grep -rn "FIXME(task-entity-drift)" src --include="*.ts" | wc -l
# Should be 10

grep -rn "FIXME(orphan-task-entity-drift)" src --include="*.ts" | wc -l  
# Should be 2

# Verify env file still as expected
cat .env.test.example | grep -E "DATABASE_URL|JWT_SECRET|JWT_REFRESH_SECRET|REFRESH_TOKEN_PEPPER|TOKEN_HASH_SECRET|INTEGRATION_ENCRYPTION_KEY"

# Verify 2026-05-02 proof file still exists for format reference
ls -la docs/architecture/proofs/2026-05-02-cross-tenant-pen-test-results.md
```

### Gate 2 stop conditions

After Phase 0 commands run, paste raw outputs to architect. **HALT and await architect "PROCEED TO IMPLEMENTATION"** before any code changes.

**HALT additionally if:**
- HEAD doesn't match expected SHA (`ebac4759` or later) → STOP, fetch + retry
- Worktree creation fails → STOP, report
- `npm install` fails → STOP, report
- 3 TS errors in `work-management-tenancy.e2e-spec.ts` no longer present (someone fixed) → STOP, report (Decision A may not be needed)
- More than 3 TS errors in that file → STOP (scope shifted, architect re-evaluates)
- FIXME counts don't match (10 + 2) → STOP (PR #250/251 changes may have been reverted)
- 2026-05-02 proof file missing → STOP (need format reference)

---

## Phase 1: 3 TS fixes (Decision A)

### Implementation pattern

Both errors at `work-management-tenancy.e2e-spec.ts` lines 117 and 142 are the same `DeepPartial<Entity>` overload class PR #249 fixed elsewhere.

**Pattern (from PR #249 reference):**

```typescript
// BEFORE (compile error):
const items = await wmRepo.save([
  { ...payload1 },
  { ...payload2 },
]);

// AFTER (DeepPartial cast):
const items = await wmRepo.save([
  { ...payload1 },
  { ...payload2 },
] as DeepPartial<WorkTask>[]);
```

### Step-by-step

```bash
cd /Users/malikadeel/Downloads/ZephixApp-pr8c-execution/zephix-backend

# View current state of work-management-tenancy.e2e-spec.ts around lines 117, 142
sed -n '110,150p' test/work-management-tenancy.e2e-spec.ts

# Identify which entities are involved at lines 117, 142
# Apply DeepPartial cast pattern matching PR #249 fixes
# Verify imports include DeepPartial from typeorm

# After fixes, verify
npx tsc --noEmit -p tsconfig.spec.json 2>&1 | grep "work-management-tenancy"
# Should be empty (zero errors in this file)
```

**HARD CONSTRAINT:** Don't touch test logic. Compile fixes only. If a test was wrong before fix, it's still wrong after fix — different scope.

---

## Phase 2: Pen test execution

### Environment setup (CRITICAL — per pre-recon findings)

**All 7 env vars MUST be exported BEFORE running `npm run test:e2e`** OR the script's guard silently skips:

```bash
cd /Users/malikadeel/Downloads/ZephixApp-pr8c-execution/zephix-backend

export NODE_ENV=test
export DATABASE_URL='postgresql://zephix_test_user:zephix_test_password@127.0.0.1:5432/zephix_test?sslmode=disable'
export JWT_SECRET="$(openssl rand -hex 64)"
export JWT_REFRESH_SECRET="$(openssl rand -hex 32)"
export REFRESH_TOKEN_PEPPER="$(openssl rand -hex 32)"
export TOKEN_HASH_SECRET="$(openssl rand -hex 32)"
export INTEGRATION_ENCRYPTION_KEY="$(openssl rand -hex 16)" # Min 32 chars

# Setup test DB
bash scripts/setup-test-db.sh

# Run migrations
npm run migration:run
```

**Verify env BEFORE proceeding:**
```bash
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
echo "INTEGRATION_ENCRYPTION_KEY length: ${#INTEGRATION_ENCRYPTION_KEY}"
# All should be set; INTEGRATION_ENCRYPTION_KEY should be ≥ 32
```

**HALT if env not properly set.**

### Execution sequence

**Step 1: Per-file execution to capture clean per-file results (matches 2026-05-02 proof format)**

```bash
cd /Users/malikadeel/Downloads/ZephixApp-pr8c-execution/zephix-backend

# Capture overall HEAD SHA + migration state for proof header
git rev-parse HEAD | tee /tmp/pr8c-head-sha.log

# Per-file runs (10 files in inventory)
mkdir -p /tmp/pr8c-results

# 1. test/security/tenant-isolation.e2e-spec.ts
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/security/tenant-isolation.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/01-security-tenant-isolation.log

# 2. test/tenancy/tenant-isolation.e2e-spec.ts
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/tenancy/tenant-isolation.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/02-tenancy-tenant-isolation.log

# 3. test/tenancy/custom-fields-tenant-isolation.e2e-spec.ts
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/tenancy/custom-fields-tenant-isolation.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/03-custom-fields.log

# 4. test/tenancy/teams-tenant-isolation.e2e-spec.ts
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/tenancy/teams-tenant-isolation.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/04-teams.log

# 5. test/tenancy/tasks-tenant-isolation.e2e-spec.ts
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/tenancy/tasks-tenant-isolation.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/05-tasks.log

# 6. test/tenancy/billing-tenant-isolation.e2e-spec.ts
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/tenancy/billing-tenant-isolation.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/06-billing.log

# 7. test/tenancy/runtime-guardrail-bypass.e2e-spec.ts (CRITICAL: needs --testTimeout=120000)
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testTimeout=120000 \
  test/tenancy/runtime-guardrail-bypass.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/07-runtime-guardrail.log

# 8. test/tenant-isolation.e2e-spec.ts (root)
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/tenant-isolation.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/08-root-tenant-isolation.log

# 9. test/tenant-repository-unsafe-ops.e2e-spec.ts
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/tenant-repository-unsafe-ops.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/09-unsafe-ops.log

# 10. test/work-management-tenancy.e2e-spec.ts (post Decision A fix)
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  test/work-management-tenancy.e2e-spec.ts 2>&1 | tee /tmp/pr8c-results/10-work-management-tenancy.log
```

**Step 2: Aggregate counts**

For each log file, extract:
- Test Suites: X passed, Y failed
- Tests: X passed, Y failed, Z total
- Specific failure messages (for documentation)

```bash
# Quick aggregate
for log in /tmp/pr8c-results/*.log; do
  echo "=== $log ==="
  grep -E "Test Suites:|Tests:" "$log" | tail -2
  echo
done
```

### Expected outcome categorization (per Claude Desktop pre-recon framing)

For each file, categorize results:

**Category A: GREEN** — All tests pass
**Category B: EXPECTED RESIDUAL** — Some tests fail but per architect-accepted decisions:
- Billing 403/404 assertions failing (Decision B: documented, deferred)
- Security tenant-isolation 500 vs 403 missing-org (Decision C: documented, deferred)
- Runtime guardrail bypass anomalies (per `runtime-guardrail-scope.md`: dev/test signal, not security gap)
**Category C: UNEXPECTED FAILURE** — failures NOT in categories A or B → STOP, report

If Category C failures surface → STOP. Architect re-evaluates whether residuals actually behave as expected, or whether new regression introduced.

---

## Phase 3: Capture new proof artifact

### File location

```
docs/architecture/proofs/2026-05-NN-cross-tenant-pen-test-results.md
```

Replace `NN` with actual execution date day-of-month.

### Format (mirror 2026-05-02 proof structure)

```markdown
# Cross-Tenant Pen Test Execution Results — 2026-05-NN

**Date:** 2026-05-NN
**HEAD SHA:** `<actual SHA>` (post-PR-251 Engine 1 criterion 10 closure foundation)
**Migration state:** `npm run migration:run` against `zephix_test` completed successfully through latest migrations.
**Executor:** Claude Desktop under architect direction
**Environment:** macOS, PostgreSQL 127.0.0.1:5432, app DB user `zephix_test_user` / DB `zephix_test`
**Status:** **EXECUTED with KNOWN-DOCUMENTED RESIDUALS**

This run supersedes 2026-05-02 partial proof. Categorical improvement: no compile blocks, no schema drift, no scope ambiguity. Documented residuals are explicitly accepted-or-deferred per PR #8c architect decisions.

---

## Execution summary

| Metric | 2026-05-02 (predecessor) | 2026-05-NN (PR #8c) |
|--------|------:|------:|
| Target files | 9 | 10 (+work-management-tenancy) |
| Files that ran tests | 6 | 10 |
| Files blocked before tests (TS compile) | 3 | 0 |
| Total test cases | 22 | <actual> |
| Passed | 4 | <actual> |
| Failed | 18 | <actual> |
| Blocked | 3 files | 0 files |

**Critical cross-tenant data leak observed:** None proved. Failures are documented residuals per architect-accepted decisions.

---

## Per-file results

[For each of 10 files, document: file path, result, test count breakdown, any specific failures with category (A/B/C)]

[Use 2026-05-02 proof's per-file table format]

---

## Documented residuals (NOT regressions)

### Residual 1: Billing 403/404 assertion mismatch

**File:** `test/tenancy/billing-tenant-isolation.e2e-spec.ts`
**Failure:** 3 tests expect 404 "Not Found", actual 403 "Forbidden"
**Category:** EXPECTED RESIDUAL (Decision B in PR #8c dispatch)
**Architectural posture:** 403 is the CORRECT security posture for cross-tenant access (forbidden, not hidden). Tests were authored expecting 404 convention; should be updated to expect 403.
**Remediation:** Separate PR to update assertions. NOT blocking for criterion 10 closure.
**Tracked:** Deferred backlog "Billing test 403/404 assertion update"

### Residual 2: Security tenant-isolation missing-org returns 500

**File:** `test/security/tenant-isolation.e2e-spec.ts`
**Failure:** Test expects 403, actual 500
**Category:** EXPECTED RESIDUAL (Decision C in PR #8c dispatch)
**Architectural posture:** Production code throws plain `new Error()` from `tenant-context.service.ts:55` → 500. Should be `ForbiddenException` → 403. This IS a real production code issue but scoped separately to keep PR #8c categorically bounded.
**Remediation:** Separate PR to fix `tenant-context.service.ts` error mapping. NOT blocking for criterion 10 closure (no cross-tenant data leak; just error code wrong).
**Tracked:** Deferred backlog "My-work tenant-context error mapping fix (500 → 403)"

### Residual 3 (if observed): Runtime guardrail bypass test failures

**File:** `test/tenancy/runtime-guardrail-bypass.e2e-spec.ts`
**Failure (if any):** [Document actual failures observed]
**Category:** EXPECTED RESIDUAL (per `docs/architecture/runtime-guardrail-scope.md`)
**Architectural posture:** Runtime guardrail is dev/test defense-in-depth, NOT production runtime enforcement. Production isolation rests on query-level org scoping, RBAC, TenantAwareRepository — different layer. Failing guardrail tests do NOT prove production tenant data leak.
**Remediation:** None required for criterion 10 closure. If genuine guardrail implementation bug found, separate dispatch authored.

---

## Critical findings

[List any UNEXPECTED failures requiring architect attention]

[If none beyond documented residuals: "No critical cross-tenant data leak observed. All failures are documented residuals per architectural decisions."]

---

## Engine 1 criterion 10 closure verification

PR series leading to this proof:
- PR #248: Dev/test guardrail reconciliation
- PR #249: Test infrastructure repair (3 BLOCKED files unblocked, schema drift addressed)
- PR #250: Canonical Task entity drift surfacing + behavior FIXMEs
- PR #251: Orphan Task entity drift removal + surgical FIXMEs
- PR #8c (this PR): Re-execution + new proof + 3 TS fixes (work-management-tenancy)

**Criterion 10 verdict:** CLOSED via documented residuals. Cross-tenant isolation verified executable (no compile blocks, no schema-drift errors). Residuals are accepted-or-deferred per architect decision, NOT regressions.

---

## V21 updates

This proof supersedes 2026-05-02 partial proof for criterion 10 evidence.

`docs/architecture/V21_CURRENT_STATE_AUDIT.md` updates:
- §6: New counts (passes/fails/blocked counts from this run)
- §6: Link to this proof artifact (replaces 2026-05-02 link)
- §5 Production Readiness row: PARTIAL — EXECUTED, NOT GREEN → CLOSED with DOCUMENTED RESIDUALS

---

## Recommended follow-ups

| Priority | Action | Notes |
|----------|--------|-------|
| P1 | Billing test assertion updates (404 → 403) | Decision B — separate PR |
| P1 | My-work tenant-context error mapping fix (500 → 403) | Decision C — separate PR |
| P2 | Programs/portfolios cross-workspace coverage | V21 Reconciliation queue item 8 |
| P3 | Runtime guardrail wrapping extension to UpdateQueryBuilder + DeleteQueryBuilder | Tracked from PR #248 |

---

## Reproducibility

**Environment (CRITICAL — must export BEFORE `npm run test:e2e`):**

```bash
export NODE_ENV=test
export DATABASE_URL='postgresql://zephix_test_user:zephix_test_password@127.0.0.1:5432/zephix_test?sslmode=disable'
export JWT_SECRET="$(openssl rand -hex 64)"
export JWT_REFRESH_SECRET="$(openssl rand -hex 32)"
export REFRESH_TOKEN_PEPPER="$(openssl rand -hex 32)"
export TOKEN_HASH_SECRET="$(openssl rand -hex 32)"
export INTEGRATION_ENCRYPTION_KEY="$(openssl rand -hex 16)"

cd zephix-backend
bash scripts/setup-test-db.sh
npm run migration:run
```

**Per-file e2e:**

```bash
npx jest --config ./test/jest-e2e.json --runInBand --forceExit <file>
```

**runtime-guardrail-bypass requires extended timeout:**

```bash
npx jest --config ./test/jest-e2e.json --runInBand --forceExit \
  --testTimeout=120000 \
  test/tenancy/runtime-guardrail-bypass.e2e-spec.ts
```

**Operator note:** `npm run test:e2e` precondition requires `DATABASE_URL` exported BEFORE the script's guard runs. Otherwise silent skip.

---

## Document end
```

---

## Phase 4: V21 doc updates

### Update 1: `docs/architecture/V21_CURRENT_STATE_AUDIT.md` §6

Replace the EXECUTED (PARTIAL) text + 2026-05-02 numbers with:

```markdown
### §6: Cross-tenant pen test status

**Status:** EXECUTED with DOCUMENTED RESIDUALS (PR #8c, 2026-05-NN)

**Latest proof:** [`2026-05-NN-cross-tenant-pen-test-results.md`](proofs/2026-05-NN-cross-tenant-pen-test-results.md)

**Counts:** <actual passes> / <actual fails> / 0 BLOCKED at compile

**Criterion 10 verdict:** CLOSED via documented residuals. No cross-tenant data leak proved. Residuals are accepted-or-deferred per architect decisions in PR #8c dispatch.

**Predecessor proof (superseded):** [`2026-05-02-cross-tenant-pen-test-results.md`](proofs/2026-05-02-cross-tenant-pen-test-results.md) — PARTIAL, NOT GREEN (3 BLOCKED files, schema drift).
```

### Update 2: `docs/architecture/V21_CURRENT_STATE_AUDIT.md` §5

Update the Production Readiness row for multi-tenant isolation:

```markdown
| Multi-tenant isolation | ~~PARTIAL — EXECUTED, NOT GREEN~~ → **CLOSED with DOCUMENTED RESIDUALS (PR #8c, 2026-05-NN)** |
```

### Update 3: `docs/architecture/V21_RECONCILIATION_2026-05-04.md` (if committed)

Per pre-recon: this file may be uncommitted in main worktree. If committed, add closing note:

```markdown
### Engine 1 criterion 10 — CLOSED 2026-05-NN

PR #8c re-execution proof artifact captured. Criterion closes via documented residuals; no cross-tenant data leak proved. Residuals tracked as separate follow-up PRs (Decisions B + C from PR #8c dispatch).
```

If file not committed → architect handles V21 reconciliation update separately.

---

## Phase 5: Verification + Gate 4 report

### Verification commands

```bash
cd /Users/malikadeel/Downloads/ZephixApp-pr8c-execution/zephix-backend

# Verify TS compile clean (Decision A fixes applied)
npx tsc --noEmit -p tsconfig.spec.json 2>&1 | grep "work-management-tenancy" | wc -l
# Should be 0

# Verify test execution outputs captured
ls -la /tmp/pr8c-results/

# Verify proof artifact exists
ls -la docs/architecture/proofs/2026-05-NN-cross-tenant-pen-test-results.md

# Verify V21 updates
grep "EXECUTED with DOCUMENTED RESIDUALS\|2026-05-NN" docs/architecture/V21_CURRENT_STATE_AUDIT.md | head -5

# Files changed verification
git diff --name-only
# Should show: 1 test file (work-management-tenancy fix) + new proof artifact + V21 updates

# Permission matrix preserved
npm run test:permission-matrix 2>&1 | tail -10
# Baseline preserved (80/84 or current)
```

### Gate 4 report format

```
## PR #8c — Gate 4 Report

### Files changed
| Path | Change type |
|------|-------------|
| zephix-backend/test/work-management-tenancy.e2e-spec.ts | Modified (3 TS fixes per Decision A) |
| docs/architecture/proofs/2026-05-NN-cross-tenant-pen-test-results.md | NEW (pen test proof artifact) |
| docs/architecture/V21_CURRENT_STATE_AUDIT.md | Modified (§5 + §6 updates) |
| docs/architecture/V21_RECONCILIATION_2026-05-04.md | Modified IF committed (closing note) |

### Test execution summary
- Total files run: 10
- Total tests: <count>
- Passed: <count>
- Failed (documented residuals): <count>
- Failed (unexpected): <count> [SHOULD BE 0]

### Per-file results
[Per-file table, mirror 2026-05-02 proof format]

### Documented residuals
- Billing 3 tests: 404 expected, 403 actual (Decision B)
- Security tenant-isolation 1 test: 403 expected, 500 actual (Decision C)
- Runtime guardrail bypass: <findings, if any> (per runtime-guardrail-scope.md)

### Compile/build
- tsc --noEmit: PASS
- npm run build: PASS
- Permission matrix baseline: <count>/84 (preserved)

### Engine 1 criterion 10 verdict
CLOSED via documented residuals.
```

---

## Hard constraints

### CONSTRAINT 1: Documented residuals are NOT regressions

Executor MUST distinguish between:
- **Documented residuals** (Decisions B + C, runtime guardrail per scope doc) — EXPECTED, framed in proof artifact
- **Unexpected failures** (anything outside documented residuals) — STOP and report

If executor's instinct says "this is failing, must fix" → check against documented residuals first. If listed → document, don't fix. If not listed → STOP.

### CONSTRAINT 2: Categorical scope (Lesson #12)

In scope: test execution + proof artifact + V21 updates + Decision A TS fixes.
Out of scope: any production code change, any test logic change beyond compile fix, any new test files.

If executor finds need to modify production code OR add new tests OR fix billing assertions OR fix my-work error mapping → STOP. Each is separate dispatch (already queued).

### CONSTRAINT 3: NO scope creep on TS fixes

Decision A is 3 specific TS errors at lines 117, 142 of `work-management-tenancy.e2e-spec.ts`. Pattern is `DeepPartial<Entity>` cast (PR #249 reference). Don't refactor surrounding code, don't reformat, don't change test logic.

### CONSTRAINT 4: Single PR

All deliverables (3 TS fixes + proof + V21 updates) ship as one PR.

### CONSTRAINT 5: Reproducibility section MUST include env requirements

Per pre-recon findings: env requirements are critical. Proof artifact MUST document them so future re-runs succeed.

### CONSTRAINT 6: 2026-05-02 proof preserved (not deleted)

Don't delete predecessor proof. Reference it as superseded in new proof + V21 updates.

### CONSTRAINT 7: Pre-flight discipline

Fresh worktree OR proper `npm install` (not symlinked node_modules). Verify env exports BEFORE running tests.

### CONSTRAINT 8: HALT for architect Gate 4 review

After Phase 5 verification, paste Gate 4 report. NO PR open until architect reviews.

### CONSTRAINT 9: Reversibility

All changes revertable cleanly via `git revert`. Documentation + 3 TS fixes only. No production code touches.

---

## Sequencing and dependencies

### Upstream dependencies

- ✓ PR #248 (#8a) merged
- ✓ PR #249 (#8b) merged
- ✓ PR #250 merged
- ✓ PR #251 merged
- ✓ Pre-recon completed (Claude Desktop)
- ✓ Architect Gate 2 + PO confirmation of 3 decisions

### Downstream dependencies

- **Engine 1 criterion 10 closes** when this PR merges
- **Frontend Audit Execution Dispatch** authoring becomes architect's next deliverable for Engine 1 criterion 7 closure
- **AD-027 Phase 1 enumeration** dispatch becomes architect's deliverable for Engine 1 criterion 6 closure
- **3 follow-up PRs** queued (NOT deferred to backlog):
  - Billing test assertion updates (Decision B)
  - My-work tenant-context error mapping fix (Decision C)
  - Eventually: programs/portfolios cross-workspace coverage (V21 P3)

### Sequencing diagram

```
PR #248 ✓ → PR #249 ✓ → PR #250 ✓ → PR #251 ✓ → THIS PR (PR #8c) → Engine 1 criterion 10 CLOSED

Parallel (Cursor): Calendar PR 1 → PR 2 → PR 3
Sequential after PR #8c (Claude Desktop): Frontend Audit Execution → Engine 1 criterion 7 CLOSED
```

---

## Estimated effort

- **Phase 0 verification recon:** ~15 min executor (state already grounded by pre-recon)
- **Phase 1 TS fixes (Decision A):** ~10-15 min executor (mechanical pattern)
- **Phase 2 pen test execution:** ~30-45 min executor (10 files, includes runtime-guardrail with 120s timeout)
- **Phase 3 proof artifact authoring:** ~1-1.5 hours executor (mirror 2026-05-02 format, capture per-file results, document residuals)
- **Phase 4 V21 doc updates:** ~30 min executor
- **Phase 5 verification + Gate 4:** ~30 min executor
- **Total executor work:** ~3-4 hours

- **Architect Gate 2 review:** ~15 min after Phase 0
- **Architect Gate 4 review:** ~30-45 min (proof artifact quality matters)
- **Architect PR review:** ~30 min

---

## Success criteria

PR closes successfully when ALL of the following are true:

- [ ] Phase 0 verification confirmed scope (state matches pre-recon)
- [ ] 3 TS fixes applied to `work-management-tenancy.e2e-spec.ts` (Decision A)
- [ ] tsc clean (zero errors in this file)
- [ ] All 10 tenancy test files executed end-to-end (no compile blocks, no env failures)
- [ ] Per-file results captured + categorized (GREEN / EXPECTED RESIDUAL / UNEXPECTED FAILURE)
- [ ] Zero UNEXPECTED FAILURES (or STOP triggered if any surface)
- [ ] New proof artifact at `docs/architecture/proofs/2026-05-NN-cross-tenant-pen-test-results.md`
- [ ] Proof artifact format mirrors 2026-05-02 structure
- [ ] Documented residuals section explicitly lists Decisions B + C + runtime guardrail framing
- [ ] V21 §5 + §6 updated
- [ ] V21 reconciliation closing note added (if file committed)
- [ ] PR description includes:
  - "EXECUTED with KNOWN-DOCUMENTED RESIDUALS" framing
  - 3 TS fix scope reference
  - Cross-references to PR #248-251
  - Documented residuals list with Decision references
  - Engine 1 criterion 10 closure verdict
  - Follow-up PRs queue (Decisions B + C separate PRs)
- [ ] Permission matrix baseline preserved
- [ ] No production source code changes

---

## Post-merge verification checklist

After merge to staging:

- [ ] CI confirms tsc clean on staging
- [ ] V21 docs render correctly with proof artifact link
- [ ] Sentry: monitor for any new errors over 24h (none expected — no production changes)
- [ ] Engine 1 criterion 10 status updated in tracking
- [ ] Follow-up PR queue confirmed (Decisions B + C captured)

---

## Engine 1 closure progress

After this dispatch closes:

- ✓ Criterion 6: AD-027 critical-path Phase 1 enumeration → still pending (separate dispatch, queued)
- ⏳ Criterion 7: Frontend Audit (Gantt gaps) → next architect deliverable for Claude Desktop after this PR
- ✓ Criterion 8: SendGrid pre-MVP (closed)
- ✅ **Criterion 10: CLOSED via this PR (PR #8c)**

Engine 1 has 2 remaining criteria after PR #8c (criterion 6 + criterion 7). Calendar runs in parallel (Cursor) without blocking these.

---

## Document end

This dispatch is binding until executor reports Phase 0 outputs. Architect reviews recon at Gate 2 (quick — state already grounded by pre-recon).

If Phase 0 reveals state significantly different from pre-recon findings, STOP and report.

If unexpected failures surface during pen test execution (failures NOT in documented residuals categories), STOP and report.

**HALT discipline mandatory throughout. Categorical scope preserved. Documented residuals are NOT regressions — frame them correctly in proof artifact.**
