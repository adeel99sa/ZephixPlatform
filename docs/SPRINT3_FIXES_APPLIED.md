# Sprint 3 Fixes Applied

## Issue 1: Health Computation Approach - FIXED

### Problem
- Implemented on-demand computation, but locked rule requires health persistence and triggers
- UX lock: store health on Project, recalculate on triggers

### Solution Applied
- ✅ Added `recalculateProjectHealth(projectId, organizationId, workspaceId)` method
- ✅ Health persisted to Project entity (health, behindTargetDays, healthUpdatedAt)
- ✅ Health recalculation triggered from:
  - Task status change (`work-tasks.service.ts` updateTask)
  - Task due date change (`work-tasks.service.ts` updateTask)
  - Dependency add (`task-dependencies.service.ts` addDependency)
  - Dependency remove (`task-dependencies.service.ts` removeDependency)
  - Start work (`project-start.service.ts` startWork)
  - Bulk status update (`work-tasks.service.ts` bulkUpdateStatus)
- ✅ Overview endpoint reads Project.health as source of truth
- ✅ needsAttention computed on-demand (not persisted)

### Files Changed
- `project-health.service.ts` - Added `recalculateProjectHealth` method
- `project-overview.service.ts` - Reads from Project.health
- `work-tasks.service.ts` - Triggers health recalculation on status/dueDate change
- `task-dependencies.service.ts` - Triggers health recalculation on add/remove
- `project-start.service.ts` - Triggers health recalculation after start

## Issue 2: behindTargetDays Logic - FIXED

### Problem
- Used `Math.max(0, overdueTasks.length)` which is count, not days
- Should be date math: `max(0, today - milestone dueDate)` in days

### Solution Applied
- ✅ Changed to date-based calculation:
  ```typescript
  const daysDiff = Math.floor((now.getTime() - milestoneDate.getTime()) / (24 * 60 * 60 * 1000));
  behindTargetDays = Math.max(0, daysDiff);
  ```
- ✅ Returns `0` if milestone is in future (not null)
- ✅ Returns `null` only when no milestones exist
- ✅ Uses most overdue milestone (task or phase)

### Files Changed
- `project-health.service.ts` - Fixed behindTargetDays calculation (line 231-239)

## Issue 3: Error Contract - VERIFIED

### Status
- ✅ Success: always `{ data: ... }`
- ✅ Error: always `{ code, message }` (no nested objects)
- ✅ RequestId: header only (`X-Request-Id`)
- ✅ 403 FORBIDDEN and 403 WORKSPACE_REQUIRED both follow same shape

### Files Verified
- `api-error.filter.ts` - Already correct, returns `{ code, message }` at top level

## Issue 4: Copy Rules and PII - UPDATED

### Status
- ✅ No quotes in reasonText (verified)
- ✅ Under 100 chars (verified)
- ⚠️ **Task titles may contain names** - not fully PII-safe
- ✅ Deterministic truncation (verified)

### Note
- Titles are in `reasonText` for UAT
- Future: Consider moving titles to `entityRef` or separate `entityLabel` field for screenshots

## Issue 5: E2E Tests - UPDATED

### Changes
- ✅ Updated behindTargetDays test to verify exact date math (expects 1 when milestone due yesterday)
- ✅ Added health persistence test requirement

### Files Changed
- `work-management-overview.e2e-spec.ts` - Updated test to verify exact date math

## Verification Checklist Updated

- ✅ `SPRINT3_VERIFICATION_CHECKLIST.md` updated with:
  - Health persistence approach
  - Date-based behindTargetDays calculation
  - PII note about task titles

## Acceptance Proof

### Health Persistence
```bash
# Update a task
PATCH /api/work/tasks/:id
{ "status": "BLOCKED" }

# Call overview twice
GET /api/work/projects/:projectId/overview
# First call: Health reflects update (recalculated)
GET /api/work/projects/:projectId/overview
# Second call: Health still reflects update (from Project.health)
```

### behindTargetDays Date Math
```bash
# Create milestone due yesterday
POST /api/work/tasks
{ "type": "MILESTONE", "dueDate": "2024-01-01" }  # yesterday

# Get overview
GET /api/work/projects/:projectId/overview
# behindTargetDays = 1

# Move to tomorrow
PATCH /api/work/tasks/:id
{ "dueDate": "2024-01-03" }  # tomorrow

# Get overview
GET /api/work/projects/:projectId/overview
# behindTargetDays = 0 (not null)
```

## Next Steps

1. Run E2E tests to verify health persistence
2. Run E2E tests to verify behindTargetDays date math
3. Update Sprint 4 prompt with template recommendations

