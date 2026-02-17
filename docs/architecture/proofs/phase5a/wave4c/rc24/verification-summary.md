Verification Level: LIVE STAGING
RC Tag: v0.6.0-rc.24
Date: 2026-02-17
Staging URL: https://zephix-backend-v2-staging.up.railway.app/api

# Wave 4C — KPI UI Endpoints

## Status: BLOCKED

## Endpoints Tested

| Method | Path | Expected | Actual HTTP | Proof File | Verdict |
|--------|------|----------|-------------|------------|---------|
| GET | /health | 200 | 200 | — | PASS |
| GET | Identity | 200 | 200 | — | PASS |
| — | Workspace | 200 | 200 | — | PASS |
| — | Global KPI definitions | 200 | 500 | kpi-definitions-global.json | FAIL |
| — | Template create | 201 | 201 | — | PASS |
| — | UI checks | — | — | — | DEFERRED TO MANUAL |

## Blocker Details

Wave 4C is **BLOCKED by rollup_method constraint**. Global KPI definitions returns INTERNAL_ERROR (rollup_method). Proof: `kpi-definitions-global.json`. UI checks are deferred to manual verification.

## What Works

- Health PASS
- Identity PASS
- Workspace PASS
- Template create PASS

## Staging TODO

- Fix rollup_method for KPI definitions; re-verify global KPI definitions endpoint.
- Perform manual UI checks for KPI UI endpoints.
- Re-run verification and update proof file.
