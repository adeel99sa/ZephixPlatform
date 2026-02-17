Verification Level: LIVE STAGING
RC Tag: v0.6.0-rc.24
Date: 2026-02-17
Staging URL: https://zephix-backend-v2-staging.up.railway.app/api

# Wave 4A — KPI Foundation

## Status: BLOCKED

## Endpoints Tested

| Method | Path | Expected | Actual HTTP | Proof File | Verdict |
|--------|------|----------|-------------|------------|---------|
| GET | /health | 200 | 200 | — | PASS |
| GET | Identity | 200 | 200 | — | PASS |
| — | CSRF | 200 | 200 | — | PASS |
| — | Login | 200 | 200 | — | PASS |
| — | Workspace | 200 | 200 | — | PASS |
| — | Project create | 201 | 201 | — | PASS |
| — | KPI definitions | 200 | 500 | kpi-definitions.json | FAIL |
| — | KPI config | 200 | — | — | FAIL (cascaded) |
| — | KPI enable | 200 | — | — | FAIL (cascaded) |
| — | KPI compute | 200 | 200 | — | PARTIAL (empty arrays) |
| — | KPI values | 200 | — | — | FAIL (cascaded) |

## Blocker Details

Wave 4A is **BLOCKED by rollup_method constraint**. KPI definitions endpoint returns INTERNAL_ERROR: null value in column `rollup_method` of relation `kpi_definitions` violates not-null constraint. All KPI config, enable, and values flows cascade from this failure. Proof: `kpi-definitions.json`.

## What Works

- Health PASS
- Identity PASS
- CSRF PASS
- Login PASS
- Workspace PASS
- Project create PASS
- KPI compute returns 200 with empty arrays (PARTIAL)

## Staging TODO

- Fix schema or insert path so `rollup_method` is non-null for KPI definitions.
- Re-verify KPI definitions, config, enable, compute, and values.
- Re-run verification and update proof file.
