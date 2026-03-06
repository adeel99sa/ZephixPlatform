# Live RBAC V2 Staging Verification Summary

date_utc: 2026-03-06T20:25:00Z
branch: main
commit_sha: 3d5432c403ebd7a5b3a34b8b4003ad4a018f6fe2
railway_deploy_id: b58379d4-3cb9-4a4c-bf0e-3c9d861fb82d
staging_backend: https://zephix-backend-staging-staging.up.railway.app

---

## Deploy Facts

| Field | Value |
|-------|-------|
| pre_deploy_sha | afe993fdd360857c7d37a19b815fa526f4afaa8d |
| pre_deploy_deploymentId | 7b9f2a9d-5fc9-45b3-bdd0-e60518432db5 |
| post_deploy_sha | 3d5432c403ebd7a5b3a34b8b4003ad4a018f6fe2 |
| post_deploy_deploymentId | b58379d4-3cb9-4a4c-bf0e-3c9d861fb82d |
| commitShaTrusted | true |
| zephixEnv | staging |
| health | 200 OK, db+schema ok |
| migrations_pending_before_deploy | 0 (all 148 already applied) |

---

## Smoke Lane Results

| Lane | Steps | Result | Canonical Proof File |
|------|-------|--------|----------------------|
| guard | 6/6 guards | PASS | 00-preflight.txt (guard section) |
| contract-all | 6/6 contracts | PASS | 00-preflight.txt (contract-all section) |
| org-invites | 14/14 contract steps | PASS | 07-org-invites-rerun.txt |
| customer-journey | 22/22 runner steps | PASS | 08-customer-journey-rerun.txt |
| ui-acceptance | 15/15 tests | PASS | 09-ui-acceptance-rerun.txt |

---

## RBAC-Critical Assertions Verified

| Assertion | Evidence |
|-----------|----------|
| VIEWER cannot create invites (403) | customer-journey step 21 negative RBAC; ui-acceptance test 21 |
| MEMBER cannot access /admin (redirect/403) | ui-acceptance test 22 |
| ADMIN has full org management access | customer-journey steps 07–15 all 200/201 |
| OrgInvitesService uses getAuthContext (platformRole) | code inspection confirmed; RequireOrgRole guard confirmed in contract |
| normalizePlatformRole defined only in canonical module | no-import-drift guard PASS |
| No direct user.role === 'admin' in business-auth | no-role-drift guard PASS |
| portfolio_rollup returns 200 (not 500 fallback) | customer-journey step 14: 200 |
| Invite token not leaked in proof artifacts | token-artifact guard PASS for both org-invites and customer-journey |
| Deployment trust anchor present in proofs | smoke-proof-deployment-trust guard PASS for both lanes |

---

## Deployment Trust Chain

Pre-deploy SHA (afe993fd) → RBAC V2 cleanup merged to main (3d5432c4) →
Deployed to staging → Railway reported commitShaTrusted=true with new deploymentId (b58379d4).

All three smoke lanes ran against deploymentId b58379d4 and passed.
