# Network Wiring Proof — Post-Decommission

**Captured**: 2026-02-15T05:28:00Z
**Git SHA**: 03e64db4b79df407d2659075a73212bb5fabfa79

## Frontend-to-Backend Wiring

| Environment | Frontend VITE_API_URL | Expected Backend | Match |
|---|---|---|---|
| **production** | `https://zephix-backend-production.up.railway.app/api` | production backend | YES |
| **staging** | `https://zephix-backend-v2-staging.up.railway.app` | staging backend | YES |
| **test** | `https://zephix-backend-test.up.railway.app/api` | test backend | YES |

## Backend Identity (from /api/system/identity)

| Environment | zephixEnv | dbHost | serverAddr | systemIdentifier | Migrations |
|---|---|---|---|---|---|
| **production** | production | ballast.proxy.rlwy.net | 10.250.11.71 | 7538640741811494948 | 145 |
| **staging** | staging | postgres.railway.internal | fd12:c270:ca54:0:a000:32:4d:7c | 7539754227597242404 | 120 |
| **test** | test | yamabiko.proxy.rlwy.net | 10.250.22.150 | 7594731145983832100 | 126 |

All three `systemIdentifier` values are different -- confirms three separate Postgres clusters.

## Health Check Results (post-deletion)

| Environment | URL | Status | X-Zephix-Env |
|---|---|---|---|
| **production** | /api/health/ready | 200 | production |
| **staging** | /api/health/ready | 200 | staging |
| **test** | /api/health/ready | 200 | test |

## Cross-Environment Isolation

- Production frontend calls only production backend
- Staging frontend calls only staging backend
- Test frontend calls only test backend
- No staging or test service connects to production Postgres (proven by systemIdentifier)
- No stray "staging" application services remain in the project

## Remaining Services (clean)

| Service | Purpose |
|---|---|
| zephix-backend | Backend (production + test envs share service ID) |
| zephix-backend-v2 | Backend (staging env only) |
| zephix-frontend | Frontend (all envs share service ID) |
| Postgres | Production database |
| zephixp-Postgres-staging | Staging database |
| zephix-postgres-test | Test database |
| zephix-redis | Production Redis |
