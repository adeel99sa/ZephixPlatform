# Sprint 8 — Program Schedule Aggregation & Timeline Rollup — Delivery Summary

## Goal
One place where a program manager sees dates, milestones, blockers, and forecast signals across all projects. Policy-driven. No hardcoded thresholds. Works for waterfall, agile, hybrid.

---

## Files Changed

### Backend — New Files
| File | Purpose |
|------|---------|
| `src/modules/programs/services/program-schedule-rollup.service.ts` | Core schedule rollup service — batched queries, policy-driven classification |
| `src/modules/programs/services/program-schedule-rollup.service.spec.ts` | 20 tests covering policy parsing, classification, tenancy, performance, fail-open |
| `src/migrations/17980270000000-SeedProgramSchedulePolicies.ts` | Seeds 4 new schedule policy definitions |

### Backend — Modified Files
| File | Change |
|------|--------|
| `src/modules/programs/dto/program-rollup.dto.ts` | Added `ProgramScheduleRollupDto`, `ProjectScheduleItemDto`, `MilestoneDto`, `ScheduleWarningDto`. Added optional `schedule` field to `ProgramRollupResponseDto` |
| `src/modules/programs/services/programs-rollup.service.ts` | Injected `ProgramScheduleRollupService`, calls `computeScheduleRollup` with fail-open behavior |
| `src/modules/programs/programs.module.ts` | Added `WorkTask`, `WorkPhase` entities; `PoliciesModule` import; `ProgramScheduleRollupService` provider |
| `src/modules/policies/entities/policy-definition.entity.ts` | 4 new policy definitions under `PolicyCategory.SCHEDULE` |

### Frontend — New Files
| File | Purpose |
|------|---------|
| `src/features/programs/types.ts` | Shared TypeScript types for program rollup + schedule |
| `src/features/programs/api.ts` | React Query hook `useProgramRollup` |
| `src/pages/programs/ProgramTimelinePage.tsx` | Program timeline page — Gantt bars, milestones, zoom, filters, deep links |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `src/pages/programs/ProgramDetailPage.tsx` | Imports from shared types. Added schedule summary card (dates, at-risk/critical counts, upcoming milestones). Added "View Timeline" link |
| `src/App.tsx` | Added route `/workspaces/:workspaceId/programs/:programId/timeline` |

### Docs
| File | Purpose |
|------|---------|
| `docs/architecture/sprint8-schedule-contracts.md` | Contract capture from Phase 1 discovery |
| `docs/architecture/sprint8-delivery-summary.md` | This file |

---

## New Policy Keys

| Key | Type | Default | Category |
|-----|------|---------|----------|
| `program_schedule_horizon_days` | NUMBER | 120 | SCHEDULE |
| `program_milestone_types` | JSON | `["MILESTONE"]` | SCHEDULE |
| `program_schedule_at_risk_days` | NUMBER | 14 | SCHEDULE |
| `program_schedule_critical_days` | NUMBER | 30 | SCHEDULE |

All resolve via `PoliciesService` with standard precedence: Project > Workspace > Organization > System.

---

## Endpoints Affected

| Endpoint | Change |
|----------|--------|
| `GET /workspaces/:wsId/programs/:programId/rollup` | Response now includes optional `schedule` field with `ProgramScheduleRollupDto`. Existing fields unchanged. |

No new endpoints were created. Schedule rollup is embedded in the existing rollup endpoint (as preferred by the architect prompt).

---

## Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| `program-schedule-rollup.service.spec.ts` | 20 | All passing |

### Test Coverage

| # | Test Description | Type |
|---|------------------|------|
| 1 | Default policy values for empty input | Unit |
| 2 | Valid policy override parsing | Unit |
| 3 | Critical > atRisk enforcement | Unit |
| 4 | Invalid horizon rejection | Unit |
| 5 | Non-array milestone types rejection | Unit |
| 6 | ON_TRACK below atRisk threshold | Unit |
| 7 | AT_RISK at threshold boundary | Unit |
| 8 | AT_RISK between thresholds | Unit |
| 9 | DELAYED at critical threshold | Unit |
| 10 | DELAYED above critical threshold | Unit |
| 11 | Custom policy-driven thresholds | Unit |
| 12 | Horizon uses policy override at workspace scope | Integration |
| 13 | Earliest/latest dates across multiple projects | Integration |
| 14 | Milestone extraction respects policy types | Integration |
| 15 | Schedule classification uses policy at_risk/critical days | Integration |
| 16 | Tenancy: queries filter by orgId AND workspaceId | Integration |
| 17 | Performance: exactly 2 repo queries + 1 engine call (no N+1) | Performance |
| 18 | Empty projects returns valid empty result | Integration |
| 19 | Conflict engine failure doesn't break schedule rollup | Fail-open |
| 20 | Active phase and next gate date correctly identified | Integration |

---

## Architecture Decisions

### No N+1 Queries
- Tasks and phases are loaded in **2 batch queries** using IN clauses with all project IDs.
- Conflict engine is called once for the full workspace horizon, then reduced by project.
- Performance test (test #17) asserts exactly 2 repo calls + 1 engine call regardless of project count.

### Fail-Open Pattern
- If `ProgramScheduleRollupService.computeScheduleRollup()` throws, the existing rollup returns unchanged with `schedule: null`.
- If the conflict engine is unavailable, schedule rollup succeeds with conflict severities defaulting to `NONE`.
- Logged with `Logger.warn` at each failure point.

### No New Methodology Assumptions
- Schedule classification is based on **max overdue days across open tasks** — methodology-agnostic.
- Milestone extraction uses `program_milestone_types` policy — configurable per workspace/org.
- Phase context is read directly from entity status, not from methodology-specific workflow.

### No Breaking Response Shapes
- `ProgramRollupResponseDto.schedule` is `optional` and `nullable`.
- All `ProjectScheduleItemDto` fields are optional.
- Older clients that don't read `schedule` are unaffected.

### No Hardcoded Thresholds
- Schedule classification: policy-driven (`program_schedule_at_risk_days`, `program_schedule_critical_days`)
- Horizon: policy-driven (`program_schedule_horizon_days`)
- Milestone types: policy-driven (`program_milestone_types`)
- Critical > atRisk invariant enforced in parser (auto-adjusts if invalid)

### Tenancy & Scope
- All task/phase queries filter by `organizationId` AND `workspaceId`.
- Conflict engine call passes org + workspace IDs.
- Rollup endpoint guarded by `RequireWorkspaceAccessGuard` with `read` mode.

---

## Manual Test Script

### Prerequisites
- Running backend with database
- Auth token in `$TOKEN`

### Steps

1. **Create program with 3 projects**
```bash
# Create program
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "http://localhost:3000/api/workspaces/$WS_ID/portfolios/$PORTFOLIO_ID/programs" \
  -d '{"name":"Sprint 8 Test Program"}' | jq '.data.id'
# Note the program ID, then add 3 projects to it via project creation or update
```

2. **Add tasks with dates spanning 90 days**
```bash
# For each project, create tasks with startDate and dueDate
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "http://localhost:3000/api/work/tasks" \
  -d '{"projectId":"$PROJECT_ID","title":"Task 1","startDate":"2026-02-01","dueDate":"2026-05-01","workspaceId":"$WS_ID"}'
```

3. **Add milestone tasks per policy**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "http://localhost:3000/api/work/tasks" \
  -d '{"projectId":"$PROJECT_ID","title":"Q1 Milestone","type":"MILESTONE","dueDate":"2026-03-31","workspaceId":"$WS_ID"}'
```

4. **Verify rollup includes schedule**
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/workspaces/$WS_ID/programs/$PROGRAM_ID/rollup" | jq '.data.schedule'
# Expect: horizonStart, horizonEnd, projectDateRangeItems with 3 items, milestones
```

5. **Set `program_schedule_horizon_days` to 30**
```bash
# Via policy override API
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "http://localhost:3000/api/policies/overrides" \
  -d '{"scope":"WORKSPACE","scopeId":"$WS_ID","key":"program_schedule_horizon_days","value":30}'
```
Verify timeline horizon shrinks in the rollup response.

6. **Set tight at-risk and critical thresholds**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "http://localhost:3000/api/policies/overrides" \
  -d '{"scope":"WORKSPACE","scopeId":"$WS_ID","key":"program_schedule_at_risk_days","value":3}'
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "http://localhost:3000/api/policies/overrides" \
  -d '{"scope":"WORKSPACE","scopeId":"$WS_ID","key":"program_schedule_critical_days","value":7}'
```
Verify classifications change in rollup without code changes.

7. **Verify deep links**
- Navigate to `/workspaces/$WS_ID/programs/$PROGRAM_ID` — schedule summary card visible
- Click "View Timeline" — navigates to `/workspaces/$WS_ID/programs/$PROGRAM_ID/timeline`
- Click a project bar in the timeline — navigates to `/projects/$PROJECT_ID`

8. **Confirm fail-open behavior**
- In test: mock `computeScheduleRollup` to throw
- Verify rollup endpoint still returns, `schedule` is `null`
- Test #19 covers this scenario

---

## Non-Goals (Confirmed Not Implemented)
- No full CPM critical path algorithm
- No cross-program dependencies
- No gantt editing in this sprint
- No new endpoints (schedule embedded in existing rollup)
