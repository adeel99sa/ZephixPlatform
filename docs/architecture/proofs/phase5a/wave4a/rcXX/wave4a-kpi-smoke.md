# Wave 4A KPI Foundation — Staging Smoke Report

**Tag**: v0.6.0-rc.XX
**Date**: YYYY-MM-DD
**Environment**: staging (zephix-backend-v2-staging.up.railway.app)

---

## Results

| # | Test | Status |
|---|---|---|
| 1 | Health check | |
| 2 | Identity check | |
| 3 | CSRF token | |
| 4 | Login | |
| 5 | Get workspace | |
| 6 | Create project (with governance flags) | |
| 7 | GET /definitions (>= 12) | |
| 8 | GET /config (auto-created defaults) | |
| 9 | PATCH /config (enable 6 KPIs) | |
| 10 | POST /compute | |
| 11 | GET /values (today) | |
| 12 | Assert sampleSize present | |

## Proof Artifacts

- `staging-health.txt`
- `staging-identity.txt`
- `login.json`
- `project-create.json`
- `kpi-definitions.json`
- `kpi-config-initial.json`
- `kpi-config-patch.json`
- `kpi-compute.json`
- `kpi-values.json`

## Infrastructure

- Backend: Railway staging
- Migration: 17980249000000-CreateKpiFoundationTables
- Module: KpisModule

## Changes Summary

- Extended `kpi_definitions` table with Wave 4A columns
- Created `project_kpi_configs` and `project_kpi_values` tables
- Added `changeManagementEnabled` governance flag to projects
- 12 MVP KPI definitions auto-seeded on first access
- 5 REST endpoints under `/api/work/workspaces/:wsId/projects/:projId/kpis`
- RBAC via WorkspaceRoleGuardService
- 59 new unit tests across 5 suites, gating green
