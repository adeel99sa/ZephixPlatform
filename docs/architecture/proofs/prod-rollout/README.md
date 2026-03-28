# RBAC V2 Production Rollout Proof

date_utc: 2026-03-07T00:21:29Z
environment: production
url: https://getzephix.com

## Deployment Trust Anchor (point-in-time snapshot — 2026-03-07T00:22:45Z)

- railwayDeploymentId: e6c957ad-5ba3-4a91-ab3b-43c0ff540b4f
- commitShaTrusted: true
- zephixEnv: production
- health: 200 OK, db+schema ok

Note: railwayDeploymentId and live commitSha are snapshots. Railway auto-deploys on
every push to origin/main (docs-only pushes included). These values advance after
each push. The RBAC code anchor below is the stable invariant.

## Release Integrity

- rbac_code_pin: 3d5432c403ebd7a5b3a34b8b4003ad4a018f6fe2
- proof_reference_policy: stable_pin_to_rbac_code_commit
- variance_assessment: documentation-only commits after release candidate
- runtime_impact: none
- deployment_mechanism: production auto-deployed from origin/main push

All commits after 3d5432c4 are documentation artifacts only.
RBAC application code is fixed at 3d5432c4 regardless of current live SHA.
To verify current production state: curl -sS https://getzephix.com/api/version

## Proof Files

| File | Contents |
|------|----------|
| 00-preflight.txt | Detached HEAD at 3d5432c4, Node 20.20.0, guard PASS |
| 01-prod-version-before.json | Production baseline before session |
| 02-prod-health-before.txt | Production health baseline |
| 03-railway-session.txt | Railway CLI auth and project confirmation |
| 05-prod-version-after.json | Production identity post-verification |
| 06-prod-health-after.txt | Production health post-verification |
| 07-rbac-production-checks.txt | RBAC endpoint probes — all PASS |
| 08-token-guard.txt | Token artifact guard — PASS |
| 09-deployment-trust.txt | Deployment trust guard — PASS |
| RBAC_V2_PRODUCTION_DEPLOYMENT.md | Final production rollout verdict |
