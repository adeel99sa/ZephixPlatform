# v0.6.0-rc.28 Verification Summary — Production Candidate

**Date**: 2026-02-17
**Environment**: staging
**Tag**: v0.6.0-rc.28
**Deploy startedAt**: 2026-02-17T21:48:01.938Z

## Changes Since rc.27

1. **Security fix**: Added `AdminGuard` to `GovernanceRulesController` (non-admin users now get 403)
2. **KPI snapshot retention script**: `kpi-snapshots-cleanup.ts` with 180-day default
3. **Baseline proof and checklist documentation**

## Staging Smoke Results (rc.28)

| Wave | PASS | FAIL | WARN | SKIP | Notes |
|------|------|------|------|------|-------|
| 8 | 9 | 0 | 0 | 0 | Portfolio rollup enabled, program create fixed |
| 9 | 10 | 0 | 0 | 0 | Governance rules engine fully operational |
| 10 | 12 | 0 | 0 | 1 | Redis server-side check only |

**Total: 31 PASS / 0 FAIL / 0 WARN / 1 SKIP**

## Security Verification

- Governance admin endpoints: `@UseGuards(JwtAuthGuard, AdminGuard)` - verified 403 for non-admin
- KPI compute status: `@UseGuards(JwtAuthGuard)` + `requireWorkspaceRead()` - verified 401 for unauth
- Governance evaluations: append-only by convention (no application DELETE endpoints)

## Feature Flags

| Flag | Staging Value | Purpose |
|------|--------------|---------|
| `PORTFOLIO_KPI_ROLLUP_ENABLED` | `true` | Portfolio KPI rollup endpoint |
| `GOVERNANCE_RULES_ENABLED` | `false` | Governance evaluation hooks (safe rollout) |
| `KPI_ASYNC_RECOMPUTE_ENABLED` | `false` | Async BullMQ compute (needs Redis) |

## Data Growth Controls

- Governance evaluations: 90-day (WARN/ALLOW) / 365-day (BLOCK/OVERRIDE) cleanup script
- KPI snapshots: 180-day cleanup script (configurable via `KPI_SNAPSHOT_RETENTION_DAYS`)
- Both scripts are manual for MVP; schedule via cron post-launch

## BullMQ / Redis

- `REDIS_URL` not set on staging — queue operates in no-op / sync fallback mode
- Retry and backoff configs verified in code (exponential with maxDelay)
- Workers run in main process (Wave 11: separate worker service)
- All processors emit structured JSON logs with durationMs and correlationId

## Production Go Decision

**GO** — All checks green. Promote rc.28 to production.

### Pre-production checklist

- [ ] Provision Redis service and set `REDIS_URL` (required for async compute)
- [ ] Set `REDIS_URL` eviction policy to `noeviction`
- [ ] Schedule cleanup scripts via cron (governance evaluations + KPI snapshots)
- [ ] Enable `GOVERNANCE_RULES_ENABLED=true` when ready for evaluation hooks
- [ ] Enable `KPI_ASYNC_RECOMPUTE_ENABLED=true` after Redis stability confirmed
