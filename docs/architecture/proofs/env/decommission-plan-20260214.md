# Railway Service Decommission Plan

**Date**: 2026-02-14 (Updated 2026-02-15)
**Author**: Cursor (Solution Architect)
**Status**: Phase A EXECUTED — 24h cooldown started 2026-02-15T04:38Z

## Prerequisites (all green)

- [x] `staging-after.json` exists with: `zephixEnv=staging`, `dbHost=postgres.railway.internal`, `/health/ready` 200
- [x] `test-vars-after.json` exists with: `VITE_API_URL` pointing to test backend, zero traffic-path production refs
- [x] Production `/health/ready` returns 200 (`X-Zephix-Env: production`)
- [x] Staging `/health/ready` returns 200 (`X-Zephix-Env: staging`)
- [x] `system_identifier` proves staging ≠ production Postgres clusters

## Services to Decommission

### Production Environment — Stray Staging Services

| Service | Environment | Current Domain | Issue |
|---------|-------------|---------------|-------|
| `zephix-backend-staging` | production | `zephix-platform-staging-production.up.railway.app` | Staging backend inside prod env |
| `zephix-frontend-staging` | production | `zephix-frontend-staging-production.up.railway.app` | Staging frontend inside prod env |

### Test Environment — Stray Staging Services

| Service | Environment | Issue |
|---------|-------------|-------|
| `zephix-backend-staging` | test | Orphaned staging backend, uses staging DB |
| `zephix-frontend-staging` | test | Orphaned staging frontend |

## Execution Sequence (strict order)

### Phase A: Production Environment Stray Services

**Step A1: Remove public domains first** ✅ DONE 2026-02-15T04:38Z
- Removed `zephix-platform-staging-production.up.railway.app` from `zephix-backend-staging`
- Removed `zephix-frontend-staging-production.up.railway.app` from `zephix-frontend-staging`
- Verified both domains now return 404

**Step A2: Stop services (remove deployments)** ✅ DONE 2026-02-15T04:38Z
- Removed active deployment from `zephix-backend-staging` → status=REMOVED
- Removed active deployment from `zephix-frontend-staging` → status=REMOVED
- Note: Railway API does not support `numReplicas: 0`, used `deploymentRemove` instead

**Step A3: Verified production and staging unaffected** ✅ DONE 2026-02-15T04:38Z
- Production `/api/health/ready` → 200, `X-Zephix-Env: production` (see `production-health-after.txt`)
- Staging `/api/health/ready` → 200, `X-Zephix-Env: staging` (see `staging-health-after.txt`)

**Step A4: Wait 24 hours** ⏳ IN PROGRESS
- 24h cooldown ends: 2026-02-16T04:38Z
- Then delete `zephix-backend-staging` and `zephix-frontend-staging` from production env

### Phase B: Test Environment Stray Services

**Prerequisite**: Confirm nothing routes to these services.
- Test frontend `VITE_API_URL` must point to `zephix-backend-test.up.railway.app`
- No other service references `zephix-backend-staging` in test env

**Step B1: Delete immediately** (these are orphaned, no cooldown needed)
1. Delete `zephix-backend-staging` from test environment
2. Delete `zephix-frontend-staging` from test environment

## Rollback

All env vars were captured in proof files:
- `staging-before.json` — full staging env vars
- `railway-inventory-20260214.json` — all services across all environments

If any service needs to be restored:
1. Recreate the service in Railway
2. Apply the env vars from the proof file
3. Restore the domain from the proof file

## DB Service Mapping (for rollback reference)

| Environment | Backend Service | Linked DB Service | DB Host | DB Port |
|-------------|----------------|-------------------|---------|---------|
| **production** | `zephix-backend` | `Postgres` | `ballast.proxy.rlwy.net` | 38318 |
| **staging** | `zephix-backend-v2` | `zephixp-Postgres-staging` | `postgres-jj7b.railway.internal` | 5432 |
| **test** | `zephix-backend` | `zephix-postgres-test` | `yamabiko.proxy.rlwy.net` | 26837 |

## Post-Decommission Clean Service Map

| Environment | Backend | Frontend | Database |
|-------------|---------|----------|----------|
| **production** | `zephix-backend` | `zephix-frontend` | `Postgres` |
| **staging** | `zephix-backend-v2` | `zephix-frontend` | `zephixp-Postgres-staging` |
| **test** | `zephix-backend` | `zephix-frontend` | `zephix-postgres-test` |
