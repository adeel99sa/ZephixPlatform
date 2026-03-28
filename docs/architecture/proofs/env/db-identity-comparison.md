# Database Identity Comparison — Staging vs Production

**Date**: 2026-02-15  
**Commit**: `f92e11a801ddfaad36b2bedd0f7c4d869ce5e6d1`  
**Method**: `inet_server_addr()` + `current_database()` from live boot logs

## Why Hostname Is Not Proof

All Railway environments use `postgres.railway.internal` as the internal hostname.
Railway's environment-scoped DNS resolves this hostname to different IPs per environment.
The only proof of which database you're connected to is `inet_server_addr()`.

## Comparison

| Field | Staging (`zephix-backend-v2`) | Production (`zephix-backend`) |
|-------|-------------------------------|-------------------------------|
| `inet_server_addr()` | `fd12:c270:ca54:0:a000:32:4d:7c` | `10.250.11.71` |
| `current_database()` | `railway` | `railway` |
| `inet_server_port()` | `5432` | `5432` |
| `dbHost` (from config) | `postgres.railway.internal` | `ballast.proxy.rlwy.net` |
| `ZEPHIX_ENV` | `staging` | `production` |
| `PORT` | `3000` | `8080` |
| Migration count | 120 | 145 |
| Latest migration | `AlignAuditEventsSchema18000000000010` | `AddDeletedByUserIdToWorkTasksAndPhases17980202500002` |

## Verdict

- **Server addresses differ** — proves different Postgres instances.
- **Migration counts differ** — 120 (staging, fresh reset) vs 145 (production, accumulated).
  This is expected: staging DB was reset and had a clean migration run from scratch.
  Production has more migrations from its longer history.
- **Latest migration names differ** — indicates different migration chains have been applied.
  This needs investigation: staging should eventually match production's migration set.
- **ZEPHIX_ENV values match expectations** — staging=staging, production=production.

## Remaining Risk

1. **Migration parity**: staging has 120 migrations, production has 145.
   Staging was reset and ran all TypeORM migrations from scratch.
   Production may have additional migrations from older SQL-based schema.
   Action: compare migration lists side-by-side and reconcile.

2. **dbName is identical** (`railway` everywhere): cannot be used as a safety distinguisher.
   Mitigation: use `inet_server_addr()` for runtime proof instead.

3. **No admin token for CI env-proof**: The full env-proof endpoint requires JWT + admin role.
   Mitigation: CI falls back to `X-Zephix-Env` header check (no auth required).
   Action: create a dedicated CI service token or a limited /admin/system/env-proof-light endpoint.
