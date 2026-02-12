# Sprint 8 — Program Schedule Aggregation — Contract Capture

## Existing Endpoints and Consumers

| Endpoint | Service | Consumer |
|---|---|---|
| `GET /workspaces/:wsId/programs/:programId/rollup` | `ProgramsRollupService.getRollup` | `ProgramDetailPage.tsx` |
| `GET /workspaces/:wsId/programs` | `ProgramsService.listByWorkspace` | `ProgramsListPage.tsx` |
| `GET /work/tasks?projectId=X` | `WorkTasksService.listTasks` | Multiple project views |
| `GET /work/projects/:projectId/plan` | `WorkPhasesService.listByProject` | `ProjectGanttTab.tsx` |
| `POST /work/phases/:phaseId/complete` | Gate-evaluated transition | Phase completion flow |
| Budget rollup (internal) | `BudgetService.getProgramBudgetRollup` | `ProgramsRollupService` |
| Risk per project (internal) | `WorkRisksService.getOpenRisksForProject` | Gate evaluator |
| Conflict engine (internal) | `ResourceConflictEngineService.computeConflicts` | Analytics, heatmap, rollups, gates |

## Current ProgramRollupResponseDto

```typescript
{
  version: 2,
  program: { id, name, status, workspaceId, portfolioId },
  totals: { projectsTotal, projectsActive, projectsAtRisk, workItemsOpen, workItemsOverdue, resourceConflictsOpen, risksActive },
  health: { status: 'green'|'yellow'|'red', reasons: string[], updatedAt: string },
  projects: [{ id, name, status, startDate, endDate, healthStatus }],
  budget: { aggregateBAC, aggregateAC, aggregateEAC, aggregateVariance, aggregateCPI } | null
}
```

## New Field: schedule (added to ProgramRollupResponseDto)

```typescript
schedule?: ProgramScheduleRollupDto | null
```

All fields optional. Older clients ignore the field. Fail-open: if schedule service throws, `schedule` is `null` and a warning is appended.

## Key Entities for Schedule

| Entity | Date Fields | Type/Status Fields |
|---|---|---|
| `Project` | startDate, endDate | status, health |
| `WorkTask` | startDate, dueDate, actualStartDate, actualEndDate, completedAt | status, type (TASK, EPIC, MILESTONE, BUG) |
| `WorkPhase` | startDate, dueDate, startedAt, completedAt | phaseStatus (NOT_STARTED, ACTIVE, COMPLETED) |

## Frontend State

- No program timeline exists yet
- `ProjectGanttTab` uses `gantt-task-react` library — reusable pattern
- `ProgramDetailPage` uses direct API calls (no React Query hooks)
- Routes gated by `programsPortfolios` feature flag
