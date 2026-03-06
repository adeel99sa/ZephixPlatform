# RBAC Test Parity and Production Readiness

date_utc: 2026-03-06T18:00:00Z
branch: chore/mcp-and-skills
local_head: 364493285b979529f728708eea625c3c20cd8b66

---

## Environment Summary

| Field | Staging | Test |
|-------|---------|------|
| Backend URL | `zephix-backend-staging-staging.up.railway.app` | `zephix-backend-test.up.railway.app` |
| deployment_id | `90e2e2a3-6b5b-4120-98cc-96ea634a95de` | `4b71927a-0548-4de6-bc46-2142d5d6855f` |
| commit_sha | `afe993fdd360857c7d37a19b815fa526f4afaa8d` | `unknown` |
| commit_sha_trusted | `true` | `false` |
| zephix_env | `staging` | `test` |
| health | 200 OK | 200 OK |
| migration_count | 148 | 147 |

---

## Lanes Run

| Lane | Environment | Result |
|------|-------------|--------|
| guard suite | local | PASS |
| contract-all (6 guards) | local | PASS |
| staging-onboarding | staging | PASS (7/7 contract steps) |
| org-invites | staging | PASS (14/14 contract steps) |
| customer-journey | staging | PASS (21/21 contract steps, 22 runner steps) |
| ui-acceptance | staging | PASS (15/15 tests) |
| org-invites | test | BLOCKED — smoke endpoints staging-only by design |
| customer-journey | test | BLOCKED — smoke endpoints staging-only by design |

---

## Pass / Fail Counts

| Scope | Pass | Fail | Blocked |
|-------|------|------|---------|
| Local offline guards | 6/6 | 0 | 0 |
| Staging smoke lanes | 4/4 | 0 | 0 |
| Test smoke lanes | 0/2 | 0 | 2 (design blocker) |

---

## Parity Verdict

**PARTIAL**

- Health parity: IDENTICAL (both 200, db+schema OK)
- RBAC code parity: IDENTICAL (code inspection; SHA unconfirmed in test)
- Schema parity (RBAC tables): IDENTICAL (1 non-RBAC migration gap)
- Feature flag parity: IDENTICAL (ZEPHIX_WS_MEMBERSHIP_V1 off in both)
- Full smoke behavioral parity: CANNOT CONFIRM (SmokeKeyGuard restricts to staging-only)
- Commit SHA parity: CANNOT CONFIRM (test SHA not injected)

Test environment is healthy and correctly configured, but the design of the smoke infrastructure means full behavioral RBAC parity via smoke lanes is only achievable in staging. Staging is the authoritative RBAC V2 verification environment.

---

## Production Rollout Readiness Verdict

**NO-GO**

Blocking conditions:
1. RBAC V2 cleanup code (`chore/mcp-and-skills`, SHA `364493285b97...`) has NOT been deployed to any live environment
2. Staging currently runs pre-V2 baseline SHA (`afe993fdd360857c7d37a19b815fa526f4afaa8d`)
3. Staging smoke lanes must be re-run after V2 code is deployed and commitShaTrusted=true is confirmed
4. Test parity cannot be fully confirmed (smoke endpoints staging-only, SHA unknown)

---

## Blockers (in priority order)

| # | Blocker | Severity | Resolution |
|---|---------|----------|-----------|
| 1 | RBAC V2 not deployed to staging | BLOCKING | Merge branch, deploy to staging, re-run smoke |
| 2 | Test SHA not injected (commitShaTrusted=false) | MEDIUM | Configure `COMMIT_SHA` build var in test Railway service |
| 3 | Test 1 migration behind staging | LOW | Deploy same code to test (non-RBAC migration) |
| 4 | Residual drift in forms.controller.ts, CommandPalette.tsx | LOW | Non-blocking; schedule for future cleanup |

---

## Next Recommended Action

```
1. Review PR for chore/mcp-and-skills
2. Merge to main
3. Deploy main to staging:
     cd zephix-backend && railway up --service zephix-backend-v2 --environment staging --detach
4. Wait for commitShaTrusted=true in /api/version
5. Re-run full smoke:
     bash scripts/smoke/run.sh guard
     bash scripts/smoke/run.sh contract-all
     bash scripts/smoke/run.sh org-invites
     bash scripts/smoke/run.sh customer-journey
6. Verify all proof artifacts: bash scripts/guard/prod-rbac-rollout-readiness.sh
7. Re-assess verdict — likely GO at that point
8. Execute production deploy per docs/ai/PROD_RBAC_ROLLOUT_RUNBOOK.md
```

---

## Proof Files

| File | Contents |
|------|----------|
| `00-preflight.txt` | git status, node version, guard, contract-all outputs |
| `01-test-environment-discovery.md` | Test backend URL, identity, source evidence |
| `02-test-version.json` | Live /api/version from test |
| `03-test-health.txt` | Live /api/health/ready from test |
| `04-staging-version.json` | Live /api/version from staging |
| `05-staging-health.txt` | Live /api/health/ready from staging |
| `06-test-rbac-prerequisites.md` | Feature flags, smoke endpoints, migrations in test |
| `07-test-smoke-route-probes.txt` | Smoke route availability probes in test |
| `08-test-org-invites.txt` | org-invites lane result (BLOCKED with reason) |
| `09-test-customer-journey.txt` | customer-journey lane result (BLOCKED with reason) |
| `11-test-vs-staging-rbac-matrix.md` | Full parity matrix |
| `12-production-rbac-rollout-readiness.md` | Production readiness checklist and rollback plan |
| `13-drift-recheck.txt` | Role drift recheck confirming no new drift |
| `RBAC_TEST_PARITY_AND_PROD_READINESS.md` | This file |
