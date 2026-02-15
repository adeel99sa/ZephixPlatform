# Three-Environment Identity Proof

**Date**: 2026-02-15  
**Commit**: `eb5208aeedc56a1a783a7a8fb0ef54fa96cd47af`  
**Method**: `system_identifier` from `pg_control_system()` + `inet_server_addr()` from live boot logs

---

## Cluster Fingerprints

| Field | Staging | Production | Test |
|-------|---------|------------|------|
| `system_identifier` | `7539754227597242404` | `7538640741811494948` | (deploy failing) |
| `inet_server_addr()` | `fd12:c270:ca54:0:a000:32:4d:7c` | `10.250.11.71` | N/A |
| `current_database()` | `railway` | `railway` | N/A |
| `db_oid` | `16384` | `16384` | N/A |
| `inet_server_port()` | `5432` | `5432` | N/A |

**Verdict**: `system_identifier` values differ — these are provably different Postgres clusters.

---

## Environment Configuration

| Field | Staging | Production | Test |
|-------|---------|------------|------|
| `ZEPHIX_ENV` | `staging` | `production` | `test` |
| `NODE_ENV` | `staging` | `production` | `test` |
| `dbHost` (config) | `postgres.railway.internal` | `ballast.proxy.rlwy.net` | `yamabiko.proxy.rlwy.net` |
| `PORT` | `3000` | `8080` | `8080` |
| Railway service | `zephix-backend-v2` | `zephix-backend` | `zephix-backend` |
| Railway env name | `staging` | `production` | `test` |
| Public domain | `zephix-backend-v2-staging.up.railway.app` | `getzephix.com` | `zephix-backend-test.up.railway.app` |

---

## Migration State

| Field | Staging | Production | Test |
|-------|---------|------------|------|
| Migration count | 120 | 145 | (deploy failing) |
| Latest migration | `AlignAuditEventsSchema18000000000010` | `AddDeletedByUserIdToWorkTasksAndPhases17980202500002` | N/A |
| Pending migrations | None | None | N/A |
| Schema matches repo? | YES (120/120 valid classes) | YES (120 + 25 historical) | Unknown |

---

## Health Status

| Environment | Health URL | HTTP Code | X-Zephix-Env |
|-------------|-----------|-----------|--------------|
| Staging | `/api/health/ready` | 200 | `staging` |
| Production | `/api/health/ready` | 200 | `production` |
| Test | `/api/health/ready` | FAILING (boot crash) | N/A |

---

## Forbidden References

| Environment | Service | Status | Details |
|-------------|---------|--------|---------|
| staging/zephix-backend-v2 | CLEAN | No production references |
| staging/zephix-frontend | CLEAN | No production references |
| test/zephix-backend | DIRTY | 4 production refs: `API_BASE_URL`, `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` |
| test/zephix-frontend | DIRTY | 1 production ref: `VITE_API_BASE` (but `VITE_API_URL` is correct) |

---

## Test Environment Boot Failure

Test backend (`zephix-backend` in test env) is consistently failing to start:
- DB Safety Guard passes: `ZEPHIX_ENV=test, dbHost=yamabiko.proxy.rlwy.net (correct proxy) — OK`
- Boot starts but hangs during `NestFactory.create()` — never reaches `BOOT_AFTER_NEST_CREATE`
- Railway kills the container after health check timeout

**Root cause investigation needed**: likely a missing required env var or a module
initialization error that doesn't produce a log before crash.

---

## Green Light Checklist for Decommission

| Condition | Status |
|-----------|--------|
| Staging `zephixEnv` = staging | ✅ YES |
| Staging `dbHost` is not `ballast.proxy.rlwy.net` | ✅ YES (uses `postgres.railway.internal`) |
| Staging `dbHost` is not `yamabiko.proxy.rlwy.net` | ✅ YES |
| Staging `system_identifier` differs from production | ✅ YES (`7539754...` vs `7538640...`) |
| Staging migration count matches repo | ✅ YES (120/120 valid classes) |
| Test frontend has zero production API refs in `VITE_API_URL` | ✅ YES (`VITE_API_URL` is correct) |
| Test frontend has zero production API refs in ALL vars | ❌ NO (`VITE_API_BASE` points to production) |
| Test backend has zero production refs | ❌ NO (4 production references) |
| Test backend is healthy | ❌ NO (boot crash) |
