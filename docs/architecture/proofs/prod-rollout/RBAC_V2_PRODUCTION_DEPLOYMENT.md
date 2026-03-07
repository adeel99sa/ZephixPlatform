# RBAC V2 Production Deployment — Final Proof

date_utc: 2026-03-07T00:22:45Z
environment: production
url: https://getzephix.com
assessed_by: Claude (automated proof pipeline)

---

## Release Integrity

| Field | Value |
|-------|-------|
| pinned_rbac_release_candidate | 3d5432c403ebd7a5b3a34b8b4003ad4a018f6fe2 |
| live_production_sha | c69797f40151f6597156ade8c332f260f05522f4 |
| main_head_at_time_of_rollout | c69797f40151f6597156ade8c332f260f05522f4 |
| variance_assessment | documentation-only commits after release candidate |
| runtime_impact | none |
| deployment_mechanism | production auto-deployed from origin/main push |

Commits between pinned release candidate and live production SHA are documentation-only
and introduce no runtime code changes. The 6 commits between 3d5432c4 and c69797f4 are
exclusively proof artifacts in docs/architecture/proofs/ and have no effect on the
deployed application code, database schema, or RBAC behaviour.

---

## Deployment Identity

| Field | Baseline | Post-Verification |
|-------|----------|-------------------|
| commitSha | c69797f40151f6597156ade8c332f260f05522f4 | c69797f40151f6597156ade8c332f260f05522f4 |
| commitShaTrusted | true | true |
| zephixEnv | production | production |
| nodeEnv | production | production |
| railwayDeploymentId | e6c957ad-5ba3-4a91-ab3b-43c0ff540b4f | e6c957ad-5ba3-4a91-ab3b-43c0ff540b4f |

---

## Health Check

| Check | Result |
|-------|--------|
| HTTP status | 200 |
| x-zephix-env header | production |
| db | ok |
| schema | ok |

---

## RBAC Verification

| Check | Method | Result |
|-------|--------|--------|
| Auth guard on /api/workspaces | GET unauthenticated | 401 — PASS |
| Auth guard on /api/projects | GET unauthenticated | 401 — PASS |
| CSRF token endpoint | GET /api/auth/csrf | 200, token present — PASS |
| Invite create — unauthenticated | POST /api/orgs/:id/invites (no auth) | 403 — PASS |
| /api/auth/me shape | GET unauthenticated | 200, user:null — PASS |
| No 500 errors | All probed endpoints | PASS |

Staged RBAC assertion (carried forward by code equivalence):
  VIEWER receives 403 on POST /api/orgs/:orgId/invites — verified in staging proof
  (07-org-invites-rerun.txt, 08-customer-journey-rerun.txt step 21). Production code
  is runtime-identical to staging-verified build.

---

## Guard Results

| Guard | Result | Proof File |
|-------|--------|------------|
| token-artifact | PASS | 08-token-guard.txt |
| deployment-trust | PASS — deploymentId + commitShaTrusted=true | 09-deployment-trust.txt |

---

## Proof File Index

| Step | File | Contents |
|------|------|----------|
| 0 | 00-preflight.txt | Detached HEAD 3d5432c4, Node 20.20.0, guard PASS |
| 1 | 01-prod-version-before.json | Production baseline — commitSha, deploymentId, trusted |
| 1 | 02-prod-health-before.txt | Production health baseline — 200, db+schema ok |
| 2 | 03-railway-session.txt | Railway CLI auth confirmed |
| 3 | (no deploy step) | Production auto-deployed; no redeploy needed |
| 4 | 05-prod-version-after.json | Post-verification identity — stable, same deploymentId |
| 4 | 06-prod-health-after.txt | Post-verification health — 200, db+schema ok |
| 5 | 07-rbac-production-checks.txt | RBAC endpoint probes — all PASS |
| 6 | 08-token-guard.txt | Token artifact guard — PASS |
| 7 | 09-deployment-trust.txt | Deployment trust guard — PASS |

---

## Production Rollout Verdict

**PASS**

All success criteria met:

- RBAC V2 code is live on production (runtime-equivalent to pinned 3d5432c4)
- commitShaTrusted=true
- railwayDeploymentId confirmed: e6c957ad-5ba3-4a91-ab3b-43c0ff540b4f
- Health: 200 OK, db+schema ok
- RBAC critical endpoints behave correctly (auth guards, invite guard, CSRF guard all active)
- Token artifact guard: PASS
- Deployment trust guard: PASS
