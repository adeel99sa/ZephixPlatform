# Forbidden References Scan — All Environments

**Date**: 2026-02-15  
**Commit**: `eb5208aeedc56a1a783a7a8fb0ef54fa96cd47af`  
**Method**: Railway GraphQL API `variables()` query for each service+environment combination  
**Forbidden strings**: `getzephix.com`, `zephix-backend-production`, `ballast.proxy.rlwy.net`

---

## Staging Environment — CLEAN

### staging/zephix-backend-v2 (24 vars) — CLEAN
- `DATABASE_URL` host: `postgres.railway.internal` (env-scoped internal DNS)
- `ZEPHIX_ENV`: `staging`
- `NODE_ENV`: `staging`
- `CORS_ALLOWED_ORIGINS`: `http://localhost:5173,https://zephix-frontend-staging.up.railway.app`
- `VITE_API_URL`: N/A (backend doesn't have this)
- **Zero forbidden references**

### staging/zephix-frontend (15 vars) — CLEAN
- `VITE_API_URL`: `https://zephix-backend-v2-staging.up.railway.app`
- `NODE_ENV`: `production` (normal for frontend builds)
- **Zero forbidden references**

---

## Test Environment — HAS FORBIDDEN REFERENCES

### test/zephix-backend (45 vars) — 4 FORBIDDEN REFERENCES
| Variable | Value | Forbidden Match |
|----------|-------|-----------------|
| `API_BASE_URL` | `https://zephix-backend-production.up.railway.app` | `zephix-backend-production` |
| `APP_BASE_URL` | `https://getzephix.com` | `getzephix.com` |
| `CORS_ALLOWED_ORIGINS` | `https://getzephix.com,...` | `getzephix.com` |
| `FRONTEND_URL` | `https://getzephix.com` | `getzephix.com` |
| `SENDGRID_FROM_EMAIL` | `noreply@getzephix.com` | `getzephix.com` (email domain, low risk) |

**Impact**: These vars were copied from production config and never updated for test.
`API_BASE_URL` and `APP_BASE_URL` are the most dangerous — they could cause test to
call production APIs or generate production-pointing links.

**Fix**: Update these to test-specific values:
- `API_BASE_URL` → `https://zephix-backend-test.up.railway.app`
- `APP_BASE_URL` → `https://zephix-frontend-test.up.railway.app`
- `CORS_ALLOWED_ORIGINS` → `https://zephix-frontend-test.up.railway.app,http://localhost:5173`
- `FRONTEND_URL` → `https://zephix-frontend-test.up.railway.app`

### test/zephix-frontend (21 vars) — 1 FORBIDDEN REFERENCE
| Variable | Value | Forbidden Match |
|----------|-------|-----------------|
| `VITE_API_BASE` | `https://zephix-backend-production.up.railway.app/api` | `zephix-backend-production` |

**Note**: `VITE_API_URL` (the primary API URL) correctly points to test:
`https://zephix-backend-test.up.railway.app/api`.
`VITE_API_BASE` is a secondary/legacy variable that ALSO exists and points to production.

**Impact**: If any frontend code reads `VITE_API_BASE` instead of `VITE_API_URL`,
it will silently call production.

**Fix**: Remove `VITE_API_BASE` or set it to match `VITE_API_URL`.

---

## Production Stray Services — WILL BE DECOMMISSIONED

### production/zephix-backend-staging (31 vars) — STRAY SERVICE
- `DATABASE_URL` host: `postgres-jj7b.railway.internal` (NOT the main Postgres service)
- `NODE_ENV`: `staging` but `RAILWAY_ENVIRONMENT`: `production` (MISMATCH)
- This is a separate Postgres service (`zephixp-Postgres-staging`) living inside the production environment
- No current deployments serving traffic

### production/zephix-frontend-staging (22 vars) — STRAY SERVICE
- `VITE_API_BASE`: `https://zephix-backend-production.up.railway.app/api` (FORBIDDEN)
- `VITE_API_URL`: `https://zephix-platform-staging-production.up.railway.app/api`
- Points to the stray staging backend, not the proper staging env

---

## Production Proper — CORRECTLY CONFIGURED

### production/zephix-backend (44 vars)
- `DATABASE_URL` host: `ballast.proxy.rlwy.net` (production proxy, correct)
- `ZEPHIX_ENV`: `production`
- `FRONTEND_URL`: `https://getzephix.com` (correct for production)
- All production references are expected here

---

## Summary

| Environment | Service | Status |
|-------------|---------|--------|
| staging/zephix-backend-v2 | CLEAN | No forbidden references |
| staging/zephix-frontend | CLEAN | No forbidden references |
| test/zephix-backend | DIRTY | 4 production references to fix |
| test/zephix-frontend | DIRTY | 1 production reference (`VITE_API_BASE`) to fix |
| production/zephix-backend | CORRECT | Production refs expected |
| production/zephix-backend-staging | STRAY | To be decommissioned |
| production/zephix-frontend-staging | STRAY | To be decommissioned |
