# Wave 8 Verification Summary — v0.6.0-rc.27

**Date**: 2026-02-17
**Environment**: staging
**Tag**: v0.6.0-rc.27
**Deploy startedAt**: 2026-02-17T21:24:46.668Z

## Smoke Results

| # | Check | Result |
|---|-------|--------|
| 1 | Health ready | PASS |
| 2 | Identity env=staging | PASS |
| 3 | Auth (Bearer token) | PASS |
| 4 | Workspace discovery | PASS |
| 5 | GET /portfolios (read mode) -> 200 | PASS |
| 6 | POST /portfolios (create) | PASS |
| 7 | GET /portfolios/:id -> 200 | PASS |
| 8 | GET /programs (read mode) -> 200 | PASS |
| 9 | POST /portfolios/:id/programs (create) | PASS |
| 10 | GET /portfolios/:id/kpis/rollup | SKIP (flag disabled) |

**Total: 8 PASS / 0 FAIL / 0 WARN / 1 SKIP**

## Previous Warnings — Resolved

1. **Programs create 404**: Root cause was route mismatch. Programs are created at `POST /workspaces/:wsId/portfolios/:portfolioId/programs` (nested under portfolio). Fixed smoke script to use correct path and include `portfolioId` in body.

2. **Portfolio rollup 404**: Expected behavior. `PORTFOLIO_KPI_ROLLUP_ENABLED=false` by default. Per decision: enable after rc.27 when Wave 10 queue is stable.

## Proof Artifacts

All saved to `docs/architecture/proofs/phase5a/wave8/rc24/`:
- portfolios-list.json, portfolio-create.json, portfolio-detail.json
- programs-list.json, program-create.json
- portfolio-kpi-rollup.json, portfolio-rollup-flag-disabled.txt
- staging-health.json, staging-identity.json, workspaces.json

## Verdict

**GO** — Portfolio and program CRUD fully operational. Rollup gated behind flag as designed.
