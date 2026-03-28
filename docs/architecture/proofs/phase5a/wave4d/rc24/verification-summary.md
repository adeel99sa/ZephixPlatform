Verification Level: LIVE STAGING
RC Tag: v0.6.0-rc.24
Date: 2026-02-17
Staging URL: https://zephix-backend-v2-staging.up.railway.app/api

# Wave 4D — KPI Packs

## Status: PARTIAL

## Endpoints Tested

| Method | Path | Expected | Actual HTTP | Proof File | Verdict |
|--------|------|----------|-------------|------------|---------|
| GET | /health | 200 | 200 | — | PASS |
| GET | Identity | 200 | 200 | — | PASS |
| — | Workspace | 200 | 200 | — | PASS |
| — | Template create | 201 | 201 | — | PASS |
| — | KPI packs list | 200, 4 packs | 200 | kpi-packs-list.json | PASS |
| — | Pack apply (scrum_core) | 200 | 500 | pack-apply-scrum-core.json | FAIL |
| — | Idempotency | 200 | — | — | VACUOUS PASS |
| — | Unknown pack rejection | 400 | 400 | — | PASS |
| — | Project create | 201 | 201 | — | PASS |
| — | KPI auto-activation | — | — | — | VACUOUS PASS |

## Blocker Details

KPI packs list passes (4 packs: scrum_core, kanban_flow, waterfall_evm, hybrid_core). Pack apply fails with INTERNAL_ERROR (rollup_method). Idempotency and KPI auto-activation could not be fully exercised, so verdicts are vacuous pass.

## What Works

- Health PASS
- Identity PASS
- Workspace PASS
- Template create PASS
- KPI packs list PASS (4 packs)
- Unknown pack rejection PASS (400)
- Project create PASS

## Staging TODO

- Fix rollup_method so pack apply succeeds; re-verify pack apply, idempotency, and KPI auto-activation.
- Re-run verification and update proof files.
