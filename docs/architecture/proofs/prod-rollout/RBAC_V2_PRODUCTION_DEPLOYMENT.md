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
| proof_reference_policy | stable_pin_to_rbac_code_commit |
| variance_assessment | documentation-only commits after release candidate |
| runtime_impact | none |
| deployment_mechanism | production auto-deployed from origin/main push |

All commits after 3d5432c4 are documentation artifacts only. RBAC application code
is fixed at 3d5432c4. This document does not track live production SHA to avoid
self-referential drift — each push to main triggers a Railway auto-deploy, making any
recorded live SHA immediately stale.

To verify current production state: curl -sS https://getzephix.com/api/version
The RBAC code anchor (3d5432c4) is invariant regardless of the current live SHA.

---

## Deployment Identity (at time of proof capture — 2026-03-07T00:22:45Z)

Note: Railway auto-deploys on every push to origin/main. The commitSha and
railwayDeploymentId below are point-in-time snapshots, not current-live values.
commitShaTrusted and zephixEnv are invariant properties of the production service.

| Field | Value at Capture | Note |
|-------|-----------------|------|
| commitSha | c69797f40151f6597156ade8c332f260f05522f4 | snapshot — advances with each push |
| commitShaTrusted | true | invariant — always true when COMMIT_SHA matches build SHA |
| zephixEnv | production | invariant — production service |
| nodeEnv | production | invariant — production service |
| railwayDeploymentId | e6c957ad-5ba3-4a91-ab3b-43c0ff540b4f | snapshot — changes on each deploy |

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

- RBAC V2 code is live on production (pinned at 3d5432c4; subsequent docs-only commits cause auto-deploy advances)
- commitShaTrusted=true (invariant property of production service)
- railwayDeploymentId at proof capture: e6c957ad (snapshot — advances with each push to main)
- Health: 200 OK, db+schema ok
- RBAC critical endpoints behave correctly (auth guards, invite guard, CSRF guard all active)
- Token artifact guard: PASS
- Deployment trust guard: PASS
- Note: live production SHA and deploymentId will advance beyond proof snapshot values as
  docs-only commits are pushed to main; RBAC code anchor 3d5432c4 is the stable invariant
