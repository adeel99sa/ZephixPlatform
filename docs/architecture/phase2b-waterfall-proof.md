# Phase 2B — Waterfall Core Proof Document

## Summary

Phase 2B delivers the Waterfall Core engine for Zephix: Critical Path calculation, Schedule Baselines, Gantt drag-scheduling with dependency enforcement, and Earned Value Management (EVM).

## Migrations Added

| File | Tables/Changes |
|------|---------------|
| `src/migrations/18000000000002-WaterfallCoreScheduleBaselinesEV.ts` | Adds 9 columns to `work_tasks`, `lag_minutes` to `work_task_dependencies`, creates `schedule_baselines`, `schedule_baseline_items`, `earned_value_snapshots` tables, adds 3 governance columns to `projects` |

### Idempotency Guards
- All `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
- All `CREATE TABLE IF NOT EXISTS`
- All `CREATE INDEX IF NOT EXISTS`
- All constraints wrapped in `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$;`

## Entities Updated/Created

| Entity | File | Changes |
|--------|------|---------|
| WorkTask | `entities/work-task.entity.ts` | Added: `plannedStartAt`, `plannedEndAt`, `actualStartAt`, `actualEndAt`, `percentComplete`, `isMilestone`, `constraintType`, `constraintDate`, `wbsCode` |
| WorkTaskDependency | `entities/task-dependency.entity.ts` | Added: `lagMinutes` |
| Project | `projects/entities/project.entity.ts` | Added: `waterfallEnabled`, `baselinesEnabled`, `earnedValueEnabled` |
| ScheduleBaseline | `entities/schedule-baseline.entity.ts` | **NEW** |
| ScheduleBaselineItem | `entities/schedule-baseline-item.entity.ts` | **NEW** |
| EarnedValueSnapshot | `entities/earned-value-snapshot.entity.ts` | **NEW** |

## Services Created

| Service | File | Purpose |
|---------|------|---------|
| CriticalPathEngineService | `services/critical-path-engine.service.ts` | DAG-based CPM: forward/backward pass, float, cycle detection, dependency types (FS/SS/FF/SF), lag support |
| ScheduleRescheduleService | `services/schedule-reschedule.service.ts` | Gantt drag handler: move/resize tasks, forward cascade to successors, constraint enforcement |
| BaselineService | `services/baseline.service.ts` | Create/list/activate/compare baselines with variance calculations |
| EarnedValueService | `services/earned-value.service.ts` | PV/EV/AC/CPI/SPI/EAC/ETC/VAC computation with time-phased linear PV |

## Controllers Created

| Controller | File | Routes |
|-----------|------|--------|
| ProjectScheduleController | `controllers/project-schedule.controller.ts` | `GET /work/projects/:id/schedule`, `GET /work/projects/:id/critical-path`, `PATCH /work/projects/:id/tasks/:tid/schedule` |
| ScheduleBaselinesController | `controllers/schedule-baselines.controller.ts` | `POST/GET /work/projects/:id/baselines`, `GET /work/baselines/:id`, `POST /work/baselines/:id/activate`, `GET /work/baselines/:id/compare` |
| EarnedValueController | `controllers/earned-value.controller.ts` | `GET /work/projects/:id/earned-value`, `POST /work/projects/:id/earned-value/snapshot`, `GET /work/projects/:id/earned-value/history` |

## Role Gating Summary

| Endpoint | ADMIN | Owner | Member | Guest |
|----------|-------|-------|--------|-------|
| GET schedule | ✅ | ✅ | ✅ | ✅ (read-only) |
| GET critical-path | ✅ | ✅ | ✅ | ✅ (read-only) |
| PATCH task schedule | ✅ | ✅ | ✅ | ❌ |
| POST baseline create | ✅ | ✅ | ❌ | ❌ |
| POST baseline activate | ✅ | ✅ | ❌ | ❌ |
| GET baseline list/compare | ✅ | ✅ | ✅ | ✅ |
| GET earned value | ✅ | ✅ | ❌ | ❌ |
| POST EV snapshot | ✅ | ✅ | ❌ | ❌ |
| GET EV history | ✅ | ✅ | ❌ | ❌ |

## Frontend Changes

| File | Changes |
|------|---------|
| `features/work-management/schedule.api.ts` | **NEW** — Full API layer for schedule, baselines, earned value |
| `features/projects/tabs/ProjectGanttTab.tsx` | Upgraded: uses schedule API, drag-move/resize, critical path toggle, guest read-only enforcement |
| `features/projects/components/BaselinePanel.tsx` | **NEW** — Baseline list, create modal, compare view, role-gated |
| `features/projects/components/EarnedValuePanel.tsx` | **NEW** — PV/EV/AC/CPI/SPI display, snapshot button, role-gated |
| `features/projects/tabs/ProjectOverviewTab.tsx` | Added BaselinePanel and EarnedValuePanel below BudgetSummaryPanel |
| `features/dashboards/types.ts` | Added `critical_path_risk`, `earned_value_summary` widget types |
| `features/dashboards/schemas.ts` | Added new widget types to validation allowlist |
| `features/dashboards/widget-registry.ts` | Added new widget registry entries |

## Dashboard Widget Changes

| Widget Type | Category | Description |
|------------|----------|-------------|
| `critical_path_risk` | Schedule | Critical tasks at risk, path slip summary |
| `earned_value_summary` | Finance | CPI, SPI, and latest earned value snapshot |

Backend widget allowlist and config schemas updated to match.

## Tests

### Backend Tests: 36 passing

| Suite | Tests | Status |
|-------|-------|--------|
| `critical-path-engine.service.spec.ts` | 8 | ✅ |
| `baseline.service.spec.ts` | 5 | ✅ |
| `earned-value.service.spec.ts` | 8 | ✅ |
| `waterfall-controllers.spec.ts` | 15 | ✅ |

### Critical Path Tests
- Simple FS chain — all tasks critical
- Parallel paths — longest path wins
- SS and FF dependency types
- Positive lag shifts successor
- Negative lag (lead) allows overlap
- Milestone zero duration
- Cycle detection returns error
- Float calculation correctness
- Stable critical path ordering

### Baseline Tests
- Item count matches tasks
- Empty project rejected
- Active baseline uniqueness enforced
- Compare variance calculations correct

### Earned Value Tests
- Requires cost tracking and earned value enabled
- Requires active baseline
- PV increases over time
- EV reflects weighted percent complete
- CPI and SPI calculations
- Snapshot upsert for same date
- Project not found → 404
- Zero budget → 400

### Controller Guard Tests
- Member blocked from baseline create
- Guest blocked from baseline create
- Owner allowed to create baseline
- Admin allowed to create baseline
- Member blocked from EV activate
- Guest blocked from earned value
- Member blocked from earned value
- Owner allowed earned value
- Admin allowed earned value
- Guest blocked from EV snapshot
- Guest blocked from EV history
- delivery_owner allowed

## TypeScript Verification

```
Backend:  npx tsc --noEmit → Exit code 0 (clean)
Frontend: npx tsc --noEmit → Exit code 0 (clean)
```

## Test Run Output

```
PASS src/modules/work-management/services/__tests__/earned-value.service.spec.ts
PASS src/modules/work-management/services/__tests__/critical-path-engine.service.spec.ts
PASS src/modules/work-management/services/__tests__/baseline.service.spec.ts
PASS src/modules/work-management/controllers/__tests__/waterfall-controllers.spec.ts

Test Suites: 4 passed, 4 total
Tests:       36 passed, 36 total
```

## Staging Rollout Sequence

1. Deploy backend with migration `18000000000002`
2. `waterfallEnabled` defaults to `true` — all projects get schedule features
3. `earnedValueEnabled` defaults to `false` — opt-in per project
4. `baselinesEnabled` defaults to `true` — all projects can use baselines
5. Test on staging:
   - Set planned dates on 10+ tasks with dependencies
   - Verify critical path computation
   - Create and activate a baseline
   - Drag a critical task in Gantt → confirm compare shows slip
   - Enable `costTrackingEnabled` and set budget
   - Enable `earnedValueEnabled`
   - Compute earned value and create snapshot
   - Verify guest cannot see EV panel or endpoints

## Known Limitations

1. **Dashboard widgets**: `critical_path_risk` and `earned_value_summary` are registered but render as "type not supported" in the WidgetRenderer. Full data-fetching widget components would be Phase 2C.
2. **Forward cascade**: Currently cascades only immediate successors, not recursively through the full chain. Deep cascade is Phase 2C.
3. **Constraint types**: `asap` is enforced. Other constraint types (`alap`, `mso`, `mfo`, `snet`, `snlt`, `fnet`, `fnlt`) are stored but not yet enforced during rescheduling.
4. **Multi-project baselines**: Baselines are per-project only. Cross-project baseline comparison is Phase 3.
