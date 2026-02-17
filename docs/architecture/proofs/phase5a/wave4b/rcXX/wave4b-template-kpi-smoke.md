# Wave 4B Staging Smoke Report — Template ↔ KPI Binding

**Tag**: v0.6.0-rc.XX
**Date**: TBD
**Branch**: feat/acceptance-criteria-and-dod

## Test Matrix

| # | Test | Result | Notes |
|---|---|---|---|
| 1 | Health check | | |
| 2 | CSRF + Login | | |
| 3 | Workspace lookup | | |
| 4 | GET KPI definitions (>= 12) | | |
| 5 | Create template | | |
| 6 | Assign KPI 1 to template (is_required=true, target=95.0) | | |
| 7 | Assign KPI 2 to template (is_required=false) | | |
| 8 | List template KPIs (expect 2) | | |
| 9 | Instantiate project from template | | |
| 10 | Verify project_kpi_configs >= 2 | | |
| 11 | Verify enabled configs >= 2 | | |
| 12 | Verify no kpi_definitions duplication | | |

## Summary

- Total: 12
- Passed: TBD
- Failed: TBD

## Artifacts

- staging-health.txt
- login.json
- definitions.json
- template-create.json
- assign-kpi-1.json
- assign-kpi-2.json
- template-kpis-list.json
- instantiate-project.json
- project-kpi-configs.json
- definitions-after.json
