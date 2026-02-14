# Railway Service Decommission Plan

**Date**: 2026-02-14
**Author**: Cursor (Solution Architect)
**Status**: Ready for execution — ONLY after staging and test proofs pass

## Prerequisites (all must be green before any decommission)

- [ ] `staging-after.json` exists with: `zephixEnv=staging`, `dbHost=postgres-jj7b.railway.internal`, `/health/ready` 200
- [ ] `test-after.json` exists with: `VITE_API_URL` pointing to test backend, no production domains
- [ ] Production `/health/ready` returns 200 (getzephix.com unaffected)

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

**Step A1: Remove public domains first (reduces attack surface)**
1. Open Railway dashboard → Production environment
2. Select `zephix-backend-staging` → Settings → Networking → Remove domain `zephix-platform-staging-production.up.railway.app`
3. Select `zephix-frontend-staging` → Settings → Networking → Remove domain `zephix-frontend-staging-production.up.railway.app`

**Step A2: Scale to zero**
1. `zephix-backend-staging` → Settings → Scale → Set all regions to 0 instances
2. `zephix-frontend-staging` → Settings → Scale → Set all regions to 0 instances

**Step A3: Wait 24 hours**
- Monitor that production `getzephix.com` still works
- Monitor that staging `zephix-backend-v2-staging.up.railway.app` still works
- If anything breaks, domains and scale can be restored

**Step A4: Delete (only after 24h cooldown)**
1. Delete `zephix-backend-staging` from production environment
2. Delete `zephix-frontend-staging` from production environment

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
