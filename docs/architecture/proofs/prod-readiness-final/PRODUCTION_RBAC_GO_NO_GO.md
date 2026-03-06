# RBAC V2 Production Rollout — GO / NO-GO Verdict

date_utc: 2026-03-06T20:25:30Z
branch: main
commit_sha: 3d5432c403ebd7a5b3a34b8b4003ad4a018f6fe2
staging_deploy_id: b58379d4-3cb9-4a4c-bf0e-3c9d861fb82d
assessed_by: Claude (automated proof pipeline)

---

## Verdict: GO

All blocking conditions from the previous NO-GO assessment have been resolved.

---

## Previous NO-GO Blockers — Resolution Status

| # | Blocker | Previous Status | Current Status |
|---|---------|----------------|----------------|
| 1 | RBAC V2 not deployed to staging | BLOCKING | RESOLVED — merged to main (3d5432c4), deployed to staging |
| 2 | Test SHA not injected (commitShaTrusted=false) | MEDIUM | NON-BLOCKING — test env does not run smoke lanes by design |
| 3 | Test 1 migration behind staging | LOW | NON-BLOCKING — code-only change; schema parity at RBAC tables confirmed |
| 4 | Residual drift in forms.controller.ts, CommandPalette.tsx | LOW | NON-BLOCKING — pre-V2, out of scope, scheduled for future cleanup |

---

## Go Criteria — All Met

| Criterion | Required | Actual | Status |
|-----------|----------|--------|--------|
| RBAC V2 code on staging | commitShaTrusted=true, new deploymentId | 3d5432c4, b58379d4, trusted=true | PASS |
| offline guards | no-import-drift, no-role-drift both PASS | PASS | PASS |
| contract-all | all 6 guards PASS | 6/6 | PASS |
| org-invites smoke lane | 14/14 contract steps | 14/14 | PASS |
| customer-journey smoke lane | 22/22 runner steps, portfolio_rollup 200 | 22/22, step 14: 200 | PASS |
| ui-acceptance | 15/15, viewer denied, member bounded, admin full control | 15/15 | PASS |
| deployment trust anchors | both proof dirs have deploymentId + commit_trusted | b58379d4 + true in both | PASS |
| no token leaks | token-artifact guard PASS for all proof dirs | PASS | PASS |

---

## Production Deploy Sequence

Execute per `docs/ai/PROD_RBAC_ROLLOUT_RUNBOOK.md` Phases 2–4.

```
# Phase 2: Capture production baseline
curl -sS https://getzephix.com/api/version > docs/architecture/proofs/production/pre-deploy-version.json
curl -si https://getzephix.com/api/health/ready > docs/architecture/proofs/production/pre-deploy-health.txt
# Record railwayDeploymentId as rollback target

# Phase 3: Deploy
cd zephix-backend && railway up --service zephix-backend --environment production --detach

# Phase 4: Verify
curl -sS https://getzephix.com/api/version
# Confirm: railwayDeploymentId changed, commitShaTrusted=true, zephixEnv=production
curl -i https://getzephix.com/api/health/ready
# Confirm: 200 OK, X-Zephix-Env: production
```

---

## Rollback Trigger Conditions

Trigger rollback if any of:
- `/api/health/ready` returns non-200 after deploy
- `/api/version` does not show new deploymentId within 5 minutes
- `/api/auth/me` for a known ADMIN user does not return `platformRole: "ADMIN"`
- Invite creation by a VIEWER does not return 403

Rollback: redeploy previous `railwayDeploymentId` captured in Phase 2.

---

## Proof File Index

| File | Contents |
|------|----------|
| `00-preflight.txt` | guard PASS, contract-all PASS, clean tree (from Step 0) |
| `01-merge-scope.md` | 56 commits on chore/mcp-and-skills, 6 merge conflicts resolved |
| `02-merge.txt` | merge commit 3d5432c4, push to origin/main SUCCESS |
| `03-deploy-inputs.txt` | Railway auth confirmed, DATABASE_URL resolved from Postgres service |
| `04-post-deploy-version.json` | live /api/version after deploy — commitSha, trusted, deploymentId |
| `05-post-deploy-health.txt` | live /api/health/ready after deploy — 200, db+schema ok |
| `10-live-rbac-summary.md` | full smoke lane results, RBAC assertions, deployment trust chain |
| `PRODUCTION_RBAC_GO_NO_GO.md` | this file |

Staging smoke lane proofs:
- `docs/architecture/proofs/staging/org-invites-latest/` — 14/14 PASS, deploymentId b58379d4
- `docs/architecture/proofs/staging/customer-journey-latest/` — 22/22 PASS, deploymentId b58379d4
- `docs/architecture/proofs/staging/ui-acceptance-latest/` — 15/15 PASS
