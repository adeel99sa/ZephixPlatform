# BullMQ / Redis Production Readiness — rc.27

**Date**: 2026-02-17

## Redis Status

- `REDIS_URL` is **NOT set** on staging
- KPI queue factory falls back to no-op mode (graceful degradation)
- Compute endpoint returns HTTP 201 (sync mode) instead of 202 (async)
- No Redis-related logs in deploy output — confirms no-op path taken
- **Action required for production**: Add Redis service and set `REDIS_URL` before enabling `KPI_ASYNC_RECOMPUTE_ENABLED=true`

## Queue Configuration (code review)

| Queue | Attempts | Backoff | MaxDelay | Concurrency |
|-------|----------|---------|----------|-------------|
| kpi-recompute | 8 | exponential 30s | 30min | 10 |
| kpi-rollup | 10 | exponential 60s | 60min | 5 |
| kpi-scheduler | 3 | fixed 5min | N/A | 1 |

All retry and maxDelay values are configured in `queue.constants.ts`.

## Worker Model

- Workers run in the same NestJS process (no separate entrypoint)
- `KpiWorkerFactoryService.onModuleInit()` starts 3 workers on boot
- **Follow-up (Wave 11)**: Separate worker Railway service for scale

## Observability

- All 4 processors emit structured JSON logs: `durationMs`, `computedCount`, `skippedCount`, `correlationId`
- Worker events: completions (debug), failures (error with stack trace)
- **Follow-up (Wave 11)**: Prometheus counters for job metrics

## Eviction Policy

- Cannot verify without active Redis instance
- **Recommendation**: Use `noeviction` policy to prevent data loss in queues
- Document and verify when Redis service is provisioned
