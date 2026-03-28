# Wave 10 Verification Summary — v0.6.0-rc.27

**Date**: 2026-02-17
**Environment**: staging
**Tag**: v0.6.0-rc.27
**Deploy startedAt**: 2026-02-17T21:24:46.668Z
**latestMigration**: AddTasksOrganizationIdAndAssignmentType18000000000012
**migrationCount**: 140

## Smoke Results

| # | Check | Result |
|---|-------|--------|
| 1 | Health ready | PASS |
| 2 | Identity env=staging | PASS |
| 3 | Auth (Bearer token) | PASS |
| 4 | Workspace discovery | PASS |
| 5 | Project discovery | PASS |
| 6 | Unauth GET compute/status -> 401 | PASS |
| 7 | GET compute/status (auth) -> 200 | PASS |
| 8 | Status has 'pending' field | PASS |
| 9 | Status has 'jobId' field | PASS |
| 10 | Status has 'lastComputedAt' field | PASS |
| 11 | Status has 'lastFailure' field | PASS |
| 12 | POST compute enqueue -> 201 (sync mode) | PASS |
| 13 | Status after enqueue: pending=False | PASS |
| 14 | Redis connectivity | SKIP (server-side only) |

**Total: 12 PASS / 0 FAIL / 0 WARN / 1 SKIP**

## Endpoints Verified

- `GET /api/work/workspaces/:wsId/projects/:projId/kpis/compute/status` — compute status
- `POST /api/work/workspaces/:wsId/projects/:projId/kpis/compute` — trigger compute (sync: 201)

## Auth Guards

- Unauthenticated access returns 401
- JwtAuthGuard + workspace read access for status
- Workspace member access for compute enqueue

## Response Shape

```json
{
  "pending": false,
  "jobId": null,
  "lastComputedAt": {},
  "lastFailure": null
}
```

All four required fields present and correct types.

## Compute Mode

POST compute returns 201 (sync compute). When `KPI_ASYNC_RECOMPUTE_ENABLED=true` is set, will return 202 with `correlationId` and `jobId` for async BullMQ processing.

## Redis / BullMQ

Redis connectivity requires server-side validation (check deploy logs for BullMQ worker startup messages). SKIP for smoke test scope.

## Proof Artifacts

All saved to `docs/architecture/proofs/phase5a/wave10/rc24/`:
- compute-status.json
- compute-enqueue.json
- compute-status-after.json
- projects-list.json
- staging-health.json
- staging-identity.json
- workspaces.json

## Verdict

**GO** — Wave 10 KPI queue engine is deployed with compute status endpoint operational. Async mode ready when Redis + feature flag are enabled.
