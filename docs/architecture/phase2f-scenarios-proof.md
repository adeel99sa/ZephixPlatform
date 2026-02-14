# Phase 2F — What-If Scenario Planning: Proof Document

## Date
2026-02-13

## Migration

**File**: `18000000000004-WhatIfScenarios.ts`

| Table | Type | Description |
|-------|------|-------------|
| `scenario_plans` | CREATE | Scenario container — name, scope (project/portfolio), status (draft/active), audit fields |
| `scenario_actions` | CREATE | Individual what-if actions — shift_project, shift_task, change_capacity, change_budget. JSONB payload |
| `scenario_results` | CREATE | Computed output — one row per scenario (unique constraint for upsert). JSONB summary + warnings |

All DDL idempotent:
- `CREATE TABLE IF NOT EXISTS`
- `ADD CONSTRAINT` guarded with `DO $$ EXCEPTION WHEN duplicate_object $$`
- `CREATE INDEX IF NOT EXISTS`

Down migration drops all three tables.

## Architecture

### Compute Engine (Pure & Deterministic)

The `ScenarioComputeService` follows a strict isolation protocol:

1. **Load** current state from DB (projects, tasks, dependencies, EV snapshots)
2. **Clone** all data in memory — never mutates originals
3. **Apply** scenario actions to cloned data
4. **Recompute** capacity/demand, overallocations, CPI/SPI, critical path, baseline drift
5. **Persist** results ONLY to `scenario_results` table — zero writes to `projects`, `work_tasks`, or any production data

### Action Types

| Action | Payload | Effect |
|--------|---------|--------|
| `shift_project` | `{ projectId, shiftDays }` | Shifts all task dates + project dates by N days |
| `shift_task` | `{ taskId, shiftDays }` | Shifts single task dates by N days |
| `change_capacity` | `{ userId, date, capacityHours }` | Overrides capacity for user on specific date |
| `change_budget` | `{ projectId, newBudget }` | Changes project budget in after-state for EV recalc |

### Before vs After Comparison

The compute engine produces:
- **Before state**: Current reality (from DB)
- **After state**: Hypothetical state (with actions applied)
- **Deltas**: Overallocation days delta, user delta, CPI/SPI delta, CP slip delta, baseline drift delta
- **Impacted projects**: List with action counts

## Endpoints

| Method | Route | Access |
|--------|-------|--------|
| `POST` | `/work/workspaces/:wsId/scenarios` | Admin/Owner |
| `GET` | `/work/workspaces/:wsId/scenarios` | Member, Admin/Owner |
| `GET` | `/work/scenarios/:id` | Member, Admin/Owner |
| `PATCH` | `/work/scenarios/:id` | Admin/Owner |
| `DELETE` | `/work/scenarios/:id` | Admin/Owner |
| `POST` | `/work/scenarios/:id/actions` | Admin/Owner |
| `DELETE` | `/work/scenarios/:id/actions/:actionId` | Admin/Owner |
| `POST` | `/work/scenarios/:id/compute` | Admin/Owner |

All endpoints:
- Require `JwtAuthGuard`
- Scoped by `organizationId` (from auth context)
- VIEWER blocked from all scenario endpoints
- MEMBER read-only (list + get)
- Admin/Owner full access (CRUD + compute)

## Test Results

### Backend (46 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| `scenarios.service.spec.ts` | 12 | PASS |
| `scenario-compute.service.spec.ts` | 14 | PASS |
| `scenarios.controller.spec.ts` | 20 | PASS |
| **Total** | **46** | **ALL PASS** |

### Frontend (8 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| `scenario-gating.test.tsx` | 8 | PASS |

### Regression

| Scope | Suites | Tests | Status |
|-------|--------|-------|--------|
| Capacity + Scenarios combined | 7 | 83 | ALL PASS |

### Compilation

```
Backend tsc --noEmit:  exit 0 (clean)
Frontend tsc --noEmit: exit 0 (clean)
```

## Security

- All queries scoped by `organizationId`
- Soft delete via `deletedAt` — no hard deletes of plans
- Actions cascade-deleted when plan is hard-deleted (FK constraint)
- VIEWER blocked at controller level before any service call
- MEMBER blocked from write/compute at controller level
- Cross-org isolation: `getById` always includes `organizationId` in WHERE clause

## Files Created (8)

| File | Purpose |
|------|---------|
| `src/migrations/18000000000004-WhatIfScenarios.ts` | Migration |
| `src/modules/scenarios/entities/scenario-plan.entity.ts` | Plan entity |
| `src/modules/scenarios/entities/scenario-action.entity.ts` | Action entity |
| `src/modules/scenarios/entities/scenario-result.entity.ts` | Result entity |
| `src/modules/scenarios/services/scenarios.service.ts` | CRUD service |
| `src/modules/scenarios/services/scenario-compute.service.ts` | Pure compute engine |
| `src/modules/scenarios/controllers/scenarios.controller.ts` | REST controller |
| `src/modules/scenarios/scenarios.module.ts` | NestJS module |

## Files Modified (2)

| File | Change |
|------|--------|
| `src/app.module.ts` | Registered `ScenariosModule` |
| Frontend `App.tsx` | Added `/scenarios` route |

## Frontend Files Created (3)

| File | Purpose |
|------|---------|
| `src/features/scenarios/scenarios.api.ts` | API client |
| `src/features/scenarios/ScenarioPage.tsx` | Scenario planning UI |
| `src/features/scenarios/__tests__/scenario-gating.test.tsx` | UI gating tests |

## Roadmap Items (Phase 3)

- Skills-based allocation
- Auto-leveling writeback
- Scenario-to-baseline promotion
- Scenario comparison (diff multiple scenarios side-by-side)
- Scenario sharing/collaboration across workspace members
