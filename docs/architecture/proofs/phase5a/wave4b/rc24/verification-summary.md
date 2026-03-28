Verification Level: LIVE STAGING
RC Tag: v0.6.0-rc.24
Date: 2026-02-17
Staging URL: https://zephix-backend-v2-staging.up.railway.app/api

# Wave 4B — Template-KPI Binding

## Status: BLOCKED

## Endpoints Tested

| Method | Path | Expected | Actual HTTP | Proof File | Verdict |
|--------|------|----------|-------------|------------|---------|
| GET | /health | 200 | 200 | — | PASS |
| — | CSRF | 200 | 200 | — | PASS |
| — | Login | 200 | 200 | — | PASS |
| — | Workspace | 200 | 200 | — | PASS |
| — | KPI definitions | 200 | 500 | — | FAIL (INTERNAL_ERROR, rollup_method) |
| — | Downstream steps | 200 | — | — | FAIL (cascaded) |

## Blocker Details

Wave 4B is **BLOCKED by rollup_method constraint**. KPI definitions returns INTERNAL_ERROR (same rollup_method null constraint). All downstream template-KPI binding steps cascaded fail.

## What Works

- Health PASS
- CSRF PASS
- Login PASS
- Workspace PASS

## Staging TODO

- Resolve rollup_method not-null constraint for KPI definitions.
- Re-verify template-KPI binding and all dependent endpoints.
- Re-run verification and update proof file.
