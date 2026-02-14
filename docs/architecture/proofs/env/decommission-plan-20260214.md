# Railway Service Decommission Plan

**Date**: 2026-02-14
**Author**: Cursor (Solution Architect)
**Status**: Ready for execution after staging and test verification

## Services to Decommission

### Production Environment — Stray Staging Services

| Service | Environment | Issue | Action |
|---------|-------------|-------|--------|
| `zephix-backend-staging` | production | Staging backend running inside production env | Scale to 0, remove domain, delete after 24h |
| `zephix-frontend-staging` | production | Staging frontend running inside production env | Scale to 0, remove domain, delete after 24h |

**Current domains to remove:**
- `zephix-platform-staging-production.up.railway.app` (backend-staging in prod)
- `zephix-frontend-staging-production.up.railway.app` (frontend-staging in prod)

### Test Environment — Stray Staging Services

| Service | Environment | Issue | Action |
|---------|-------------|-------|--------|
| `zephix-backend-staging` | test | Orphaned staging backend in test env, uses staging DB | Delete |
| `zephix-frontend-staging` | test | Orphaned staging frontend in test env | Delete |

## Execution Steps (Manual — Railway Dashboard)

### Step 1: Verify staging and test are clean first
- [ ] Staging backend `/health/ready` returns 200
- [ ] Staging env-proof shows `dbHost=postgres-jj7b.railway.internal`
- [ ] Test frontend calls test backend (not production)

### Step 2: Decommission production/zephix-backend-staging
1. Open Railway dashboard → Production environment
2. Select `zephix-backend-staging`
3. Go to Settings → Networking → Remove public domain
4. Go to Settings → Scale → Set instances to 0 (all regions)
5. Wait 24 hours

### Step 3: Decommission production/zephix-frontend-staging
1. Same as Step 2 for `zephix-frontend-staging`
2. Wait 24 hours

### Step 4: Delete after 24h cooldown
1. Delete `zephix-backend-staging` from production environment
2. Delete `zephix-frontend-staging` from production environment

### Step 5: Delete stray services from test environment
1. Delete `zephix-backend-staging` from test environment
2. Delete `zephix-frontend-staging` from test environment

## Rollback

If anything breaks after decommission:
- The staging environment at `zephix-backend-v2` is the real staging backend
- No code or data is lost — only wiring changes
- To restore, recreate the service and set the original env vars (captured in `railway-inventory-20260214.json`)

## Post-Decommission Service Map

| Environment | Backend Service | Frontend Service | Database |
|-------------|----------------|-----------------|----------|
| **production** | `zephix-backend` | `zephix-frontend` | `Postgres` (ballast.proxy.rlwy.net) |
| **staging** | `zephix-backend-v2` | `zephix-frontend` | `zephixp-Postgres-staging` (postgres-jj7b.railway.internal) |
| **test** | `zephix-backend` | `zephix-frontend` | `zephix-postgres-test` (yamabiko.proxy.rlwy.net) |
