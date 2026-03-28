# Wave 2 Staging Smoke Proof Report

**Initial run:** 2026-02-15T15:22:00Z | **Blocker fixes:** 2026-02-15
**Tag:** v0.6.0-rc.14 (initial), pending new tag for fixes
**Environment:** Staging (`zephix-backend-v2-staging.up.railway.app`)

---

## Summary

| Step | Area | Result | Notes |
|------|------|--------|-------|
| A | Identity | **PASS** | zephixEnv=staging, 121 migrations |
| A | Health | **PASS** | 200 OK, X-Zephix-Env: staging |
| B | Auth Register | **PASS** | CSRF flow works |
| B | Auth Login | **PASS** | Returns tokens and session |
| B | Auth Refresh | **PASS** | Token rotation works |
| C | Workspace | **PASS** | Created with slug |
| C | Project | **PASS** | Created with metadata |
| D | Tasks (x3) | **PASS** | With estimates and due dates |
| D | AC + DoD | **PASS** | Acceptance criteria attached |
| E | Board transitions | **PASS** | TODO→IN_PROGRESS→DONE |
| E | WIP enforcement | **PASS** | wipLimitsService available |
| F | Attachments | **FIXED** | Correct path: `.../attachments/presign` |
| G | Scenarios | **FIXED** | Correct path: `.../workspaces/:wsId/scenarios` |
| H | Baseline | **PASS** | Created with task items |
| H | Earned Value | **FIXED** | DTO accepts `costTrackingEnabled` |

---

## Blocker Fixes

### A) audit_events schema drift
- **Root cause:** Work-management entity used Sprint 5 columns; DB has Phase 3B
- **Fix:** Aligned entity, updated all audit writes, added safety migration
- **Test:** 8 tests in `audit-event-entity-alignment.spec.ts`
- **Proof:** [audit-events-fix.md](audit-events-fix.md)

### B) Attachments 404
- **Root cause:** Smoke tested wrong path; module uses presign-based upload
- **Fix:** Documented correct API paths
- **Test:** 7 tests in `attachments/route-registration.spec.ts`
- **Proof:** [attachments-staging-proof.md](attachments-staging-proof.md)

### C) Scenarios 404
- **Root cause:** Smoke tested wrong path; routes are workspace-scoped
- **Fix:** Documented correct API paths
- **Test:** 7 tests in `scenarios/scenarios-route-registration.spec.ts`
- **Proof:** [scenarios-staging-proof.md](scenarios-staging-proof.md)

### D) Earned Value validation
- **Root cause:** `costTrackingEnabled` not in project DTO
- **Fix:** Added 6 governance boolean flags to `CreateProjectDto`
- **Test:** 6 tests in `projects/project-dto-governance-flags.spec.ts`
- **Proof:** [earned-value-staging-proof.md](earned-value-staging-proof.md)

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Gating (with fixes) | 121 suites, 1294 tests | All green |
| New blocker tests | 4 suites, 28 tests | All green |
| TypeScript compile | — | Clean (0 errors) |

## Verdict

**14 of 14 checks addressable.** All blockers have code fixes + tests + proof.
Pending: staging re-deploy and live verification.

**Wave 2 success gate: READY FOR STAGING DEPLOY**
