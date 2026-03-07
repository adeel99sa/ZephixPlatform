# RBAC V2 Production Rollout Proof

date_utc: 2026-03-07T00:21:29Z
environment: production
url: https://getzephix.com

## Deployment Trust Anchor

- railwayDeploymentId: e6c957ad-5ba3-4a91-ab3b-43c0ff540b4f
- commitShaTrusted: true
- commitSha: c69797f40151f6597156ade8c332f260f05522f4
- zephixEnv: production
- health: 200 OK, db+schema ok

## Release Integrity

- rbac_code_pin: 3d5432c403ebd7a5b3a34b8b4003ad4a018f6fe2
- live_production_sha: c69797f40151f6597156ade8c332f260f05522f4
- variance_assessment: documentation-only commits after release candidate
- runtime_impact: none
- deployment_mechanism: production auto-deployed from origin/main push

Commits between pinned release candidate and live production SHA are documentation-only
and introduce no runtime code changes.

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
