# Test Environment Discovery

Generated: 2026-03-06
Branch: chore/mcp-and-skills

---

## Sources Consulted

| Source | Path |
|--------|------|
| Three-environment identity proof | `docs/architecture/proofs/env/three-environment-identity-proof.md` |
| Test vars after decommission | `docs/architecture/proofs/env/test-vars-after-20260214.json` |
| Network wiring proof | `docs/architecture/proofs/env/network-wiring-proof.md` |
| Decommission plan | `docs/architecture/proofs/env/decommission-plan-20260214.md` |
| Railway inventory | `docs/architecture/proofs/env/railway-inventory-20260214.json` |
| Live probe (2026-03-06) | `/api/version`, `/api/health/ready`, `/api/system/identity` |

---

## Test Environment Identity

| Field | Value |
|-------|-------|
| Backend base URL | `https://zephix-backend-test.up.railway.app` |
| Frontend base URL | `https://zephix-frontend-test.up.railway.app` |
| ZEPHIX_ENV | `test` |
| NODE_ENV | `test` |
| DB host | `yamabiko.proxy.rlwy.net` (separate Postgres cluster from staging and production) |
| DB system_identifier | `7594731145983832100` |
| Railway service name | `zephix-backend` (shared service ID, test Railway environment) |
| Railway environment name | `test` |

---

## Live Verification (2026-03-06)

```
GET /api/version → {"zephixEnv":"test","nodeEnv":"test","railwayDeploymentId":"4b71927a-0548-4de6-bc46-2142d5d6855f","commitSha":"unknown","commitShaTrusted":false}
GET /api/health/ready → 200 {"status":"ok","checks":{"db":{"status":"ok"},"schema":{"status":"ok"}}}
GET /api/system/identity → migrationCount=147, latestMigration=ExpandAuditCheckConstraintsForAuth18000000000013
```

---

## Comparison: Test vs Staging

| Field | Staging | Test |
|-------|---------|------|
| Backend URL | `zephix-backend-staging-staging.up.railway.app` | `zephix-backend-test.up.railway.app` |
| Frontend URL | `zephix-frontend-staging.up.railway.app` | `zephix-frontend-test.up.railway.app` |
| ZEPHIX_ENV | `staging` | `test` |
| DB host | `postgres.railway.internal` | `yamabiko.proxy.rlwy.net` |
| DB system_identifier | `7539754227597242404` | `7594731145983832100` |
| Migration count | 148 | 147 |
| Latest migration | `CreateRisksTable1786000000003` | `ExpandAuditCheckConstraintsForAuth18000000000013` |
| commitSha | `afe993fdd360857c7d37a19b815fa526f4afaa8d` | `unknown` (not injected) |
| commitShaTrusted | `true` | `false` |
| railwayDeploymentId | `90e2e2a3-6b5b-4120-98cc-96ea634a95de` | `4b71927a-0548-4de6-bc46-2142d5d6855f` |
| Health | 200 OK | 200 OK |

---

## Same Backend Service Family?

YES. Both staging and test run the same NestJS backend application (`zephix-backend`). They share the same Railway service definition but run in different Railway environments with different DB clusters and Railway deployment IDs.

---

## Smoke Endpoints Available?

NO. SmokeKeyGuard (`zephix-backend/src/modules/auth/guards/smoke-key.guard.ts`) hard-gates all `/smoke/*` routes and `/auth/smoke-login` to `nodeEnv === 'staging' && zephixEnv === 'staging'`. In test environment, smoke routes return 404 (intentional — security design, not misconfiguration).

---

## Schema Parity

PARTIAL. Test has 147 migrations, staging has 148. The gap is 1 migration (`CreateRisksTable1786000000003`). This migration creates a risks table which is unrelated to RBAC logic. The RBAC-relevant migrations are present in both environments.

---

## Commit SHA Parity

UNKNOWN. Test reports `commitSha: unknown` / `gitSha: "(not set)"`. Build-time SHA injection is not configured for the test Railway service. Cannot confirm test is running the same commit as staging or the RBAC V2 branch.

This is the primary parity gap — not a blocker for environment health, but limits code-level verification.
