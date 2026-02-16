# Wave 4A: KPI Foundation — Codebase Scan

**Date**: 2026-02-10
**Branch**: feat/acceptance-criteria-and-dod

---

## 1. Existing KPI System — Template Center

**Location**: `zephix-backend/src/modules/template-center/kpis/`

### Tables (owned by Template Center)

| Table | Entity | Purpose |
|---|---|---|
| `kpi_definitions` | `KpiDefinition` | Registry of KPI types (kpi_key, name, category, unit, direction, rollup_method, time_window, formula, thresholds) |
| `project_kpis` | `ProjectKpi` | Links a project to a KPI definition (project_id, kpi_definition_id, is_required, source) |
| `kpi_values` | `KpiValue` | Append-only value snapshots (project_kpi_id, recorded_at, value, value_text, metadata) |

### Seed Definitions (12)

spi, cpi, ev, ac, pv, eac, variance_at_completion, risk_count_high, utilization, velocity, burndown_remaining, cycle_time_days

### Decision

Wave 4A extends the existing `kpi_definitions` table with new columns rather than creating a separate table. New entity in `modules/kpis/` maps all columns (old + new). Template Center entity continues working as-is.

---

## 2. Legacy KPI Module

**Location**: `zephix-backend/src/modules/kpi/`

Simple aggregation service using Task, Project, Resource entities. Exposes:
- `GET /kpi/project/:id`
- `GET /kpi/portfolio`

No tables of its own. Imported in `app.module.ts` as `KPIModule`.

---

## 3. Earned Value Service

**Location**: `zephix-backend/src/modules/work-management/services/earned-value.service.ts`

Computes EV, AC, PV, CPI, SPI, EAC, VAC, TCPI from `earned_value_snapshots` table.

**Entity**: `EarnedValueSnapshot` — columns: `id`, `organization_id`, `workspace_id`, `project_id`, `baseline_id`, `as_of_date`, `pv`, `ev`, `ac`, `cpi`, `spi`, `eac`, `etc`, `vac`, `bac`, `created_at`.

Wave 4A `schedule_variance` and `spi` calculators reuse this table.

---

## 4. Governance Flags on Project Entity

**Location**: `zephix-backend/src/modules/projects/entities/project.entity.ts`

| Flag | DB Column | Default | Exists |
|---|---|---|---|
| `costTrackingEnabled` | `cost_tracking_enabled` | `false` | Yes |
| `earnedValueEnabled` | `earned_value_enabled` | `false` | Yes |
| `waterfallEnabled` | `waterfall_enabled` | `true` | Yes |
| `baselinesEnabled` | `baselines_enabled` | `true` | Yes |
| `capacityEnabled` | `capacity_enabled` | `false` | Yes |
| `iterationsEnabled` | `iterations_enabled` | `false` | Yes |
| `changeManagementEnabled` | `change_management_enabled` | `false` | **NO — must add** |

Wave 4A adds `changeManagementEnabled` to Project entity, CreateProjectDto, and projects table.

---

## 5. Entity Field Names for Calculators (Critical Remappings)

### Work Tasks (`work_tasks`)

| Architect Spec Name | Actual Entity Property | Actual DB Column |
|---|---|---|
| `started_at` | `actualStartAt` | `actual_start_at` |
| `done_at` | `completedAt` | `completed_at` |
| `story_points` | `estimatePoints` | `estimate_points` |
| sprint FK | `iterationId` | `iteration_id` |

**Task Statuses**: BACKLOG, TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE, CANCELED

### Iterations / Sprints (`iterations`)

| Property | DB Column |
|---|---|
| `completedPoints` | `completed_points` |
| `committedPoints` | `committed_points` |
| `status` | `status` (PLANNING, ACTIVE, COMPLETED, CANCELLED) |

### Risks (`work_risks`)

| Property | DB Column |
|---|---|
| `status` | `status` (OPEN, MITIGATED, ACCEPTED, CLOSED) |

### Project Budgets (`project_budgets`)

| Property | DB Column |
|---|---|
| `baselineBudget` | `baseline_budget` |
| `revisedBudget` | `revised_budget` |
| `forecastAtCompletion` | `forecast_at_completion` |

**`actualCost` is on `projects.actual_cost`, NOT on `project_budgets`.**

### Change Requests (`change_requests`)

| Property | DB Column |
|---|---|
| `approvedAt` | `approved_at` |
| `createdAt` | `created_at` |
| `status` | `status` (DRAFT, SUBMITTED, APPROVED, REJECTED, IMPLEMENTED) |

---

## 6. Auth Pattern — WorkspaceRoleGuardService

**Location**: `zephix-backend/src/modules/workspace-access/workspace-role-guard.service.ts`

- `requireWorkspaceRead(workspaceId, userId)` — all roles
- `requireWorkspaceWrite(workspaceId, userId)` — delivery_owner, workspace_owner only
- `getWorkspaceRole(workspaceId, userId)` — returns role or null

Wave 4A uses `WorkspaceRoleGuardService` for RBAC (not platformRole mapping).

---

## 7. Module Placement

New module: `zephix-backend/src/modules/kpis/`

Parallel to existing Wave 3A modules: `budgets/`, `change-requests/`, `documents/`.

Register as `KpisModule` in `app.module.ts`.

---

## 8. Architect Review — Wave 4A Fixes Applied

**Review Date**: 2026-02-16

### Fix 1: Dual Entity Ownership (CRITICAL)

**Issue**: Two entity classes mapped to `kpi_definitions` table:
- `KpiDefinition` in `template-center/kpis/entities/` (12 columns)
- `KpiDefinitionEntity` in `kpis/entities/` (22 columns)

**Fix**: Deleted Template Center entity. All consumers now import `KpiDefinitionEntity` from `modules/kpis/entities/` via alias `KpiDefinitionEntity as KpiDefinition`. Single source of truth enforced. Backward-compatible `kpiKey` getter added.

### Fix 2: Governance Flag Enforcement at Compute Time (CRITICAL)

**Issue**: `computeForProject()` only checked enabled configs but did NOT validate governance flags at runtime. If flags are disabled after enablement, KPIs would still compute.

**Fix**: Compute service now loads project governance flags and filters enabled configs before computation. KPIs whose `requiredGovernanceFlag` is disabled on the project are skipped with a warning log. Tests added for all flag scenarios.

### Fix 3: Audit Traceability — engineVersion (IMPROVEMENT)

**Issue**: No `engineVersion` metadata in computed values. PMBOK requires auditable performance measurement.

**Fix**: Every calculator now includes `engineVersion: "1.0.0"` in `valueJson` via `withMeta()` helper. When calculators evolve, bump this version. Enables full traceability of which engine version produced which value.

### Fix 4: Lego System Extensibility (IMPROVEMENT)

**Issue**: `kpi_definitions` had no mechanism for org-custom vs system KPIs.

**Fix**: Added `is_system` (default `true`) and `organization_id` (nullable) columns to `kpi_definitions` table and entity. System KPIs are global; org KPIs are scoped. Templates reference definitions by `kpi_definition_id` without duplication.

### Fix 5: Edge Case Tests (IMPROVEMENT)

**Issue**: No tests for negative values, division by zero audit, or governance enforcement at compute time.

**Fix**: Added tests for negative `actualCost`, negative EV/PV, all division-by-zero guards, and governance flag filtering. Total KPI test count: 71 (up from 59).

---

## 9. PMBOK Performance Domain Coverage Gap Analysis

### Current Coverage (12 KPIs, 6 domains)

| Domain | KPIs | Count | PMBOK Alignment |
|---|---|---|---|
| DELIVERY | velocity, cycle_time, throughput, wip | 4 | Good |
| SCHEDULE | schedule_variance, spi | 2 | Good |
| FINANCIAL | budget_burn, forecast_at_completion | 2 | Missing CPI |
| QUALITY | escaped_defects (placeholder) | 1 | Placeholder only |
| RISK | open_risk_count | 1 | Good |
| CHANGE | cr_cycle_time, cr_approval_rate | 2 | Good |
| **PEOPLE** | **none** | **0** | **GAP** |
| **RESOURCE** | **none** | **0** | **GAP** |

### Missing KPIs — Target for Wave 5+ Extensions

| Domain | KPI | Governance Flag | Notes |
|---|---|---|---|
| FINANCIAL | CPI (Cost Performance Index) | earnedValueEnabled | EV / AC — data already in earned_value_snapshots |
| PEOPLE | Team Retrospective Action Completion | iterationsEnabled | Requires retrospective/action module |
| RESOURCE | Capacity Utilization | capacityEnabled | Requires resource-allocation data |
| QUALITY | Defect Density / DRE | none | Requires defect tracking module |
| STAKEHOLDER | CSAT Score | none | Requires stakeholder survey module |

**CPI** should be added as priority in the next wave since the data already exists.

---

## 10. Tech Debt Register (Wave 4A)

| ID | Item | Severity | Target Wave |
|---|---|---|---|
| TD-4A-01 | Template Center `project_kpis` and `kpi_values` tables overlap with `project_kpi_configs` and `project_kpi_values` | Medium | 4B |
| TD-4A-02 | `mapPlatformRole` helpers in Wave 3A controllers still use platformRole shortcut (flagged in Wave 3A review) | Low | 4B |
| TD-4A-03 | CPI not in MVP KPI set despite EV data existing | Medium | 4B |
| TD-4A-04 | No `lead_time` KPI (would need first-transition event history) | Low | 5+ |
| TD-4A-05 | `escaped_defects` is placeholder only | Low | 5+ (defect module) |
