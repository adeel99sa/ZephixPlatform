# Sprint 3 Verification Checklist

## Response Contract Stability

- [x] `healthCode` is one of: `HEALTHY`, `AT_RISK`, `BLOCKED`
- [x] `healthLabel` is one of: `On track`, `Needs attention`, `Blocked`
- [x] `nextStepCode` is stable enum value
- [x] `nextStepLabel` is human-readable string
- [x] All `needsAttention` items include: `typeCode`, `reasonText`, `nextStepCode`, `nextStepLabel`, `entityRef` (when relevant)
- [x] Success responses wrapped in `{ data: ... }`
- [x] Error responses use `{ code, message }` format

## Copy Rules Enforcement

- [x] No quotes in `reasonText` (verified in all 5 needsAttention types)
- [x] `reasonText` under 100 characters (titles truncated to 40 chars)
- [x] Task titles may contain names - **not fully PII-safe** (titles in reasonText)
- [x] Deterministic truncation (same inputs produce same `reasonText`)
- [x] All types follow format: `[Type]. [Title/Count]`
- [x] Note: For screenshots, consider moving titles to `entityRef` or separate `entityLabel` field

## Milestone Gating Correctness

- [x] Milestone detection works for `TaskType.MILESTONE` tasks
- [x] Milestone detection works for `isMilestone: true` phases with `dueDate`
- [x] `behindTargetDays` uses **date math**: `max(0, today - milestone dueDate)` in days
- [x] `behindTargetDays` is `0` if milestone is in future (not null)
- [x] `behindTargetDays` is `null` when no milestones exist
- [x] Frontend only shows "X days behind" when `behindTargetDays !== null && behindTargetDays > 0`

## Health Computation Approach

- [x] Health computed **on-demand** in overview endpoint (not cached/triggered)
- [x] No background jobs needed - always fresh when endpoint called
- [x] No triggers needed - computation happens at request time

## Frontend Behavior

- [x] Empty state shown when `needsAttention.length === 0`
- [x] Empty state shown when `nextActions.length === 0`
- [x] No blank panels - always shows message
- [x] Read-only view for stakeholders (no disabled buttons)

## E2E Tests

- [x] ReasonText format test (no quotes, under 100 chars)
- [x] behindTargetDays gating test (null when no milestones, exactly 1 when milestone due yesterday)
- [x] Health persistence test (update task, call overview twice, health reflects update)

## Verification Commands

### Local
```bash
cd zephix-backend
npm run build
npm run test:e2e -- work-management-overview.e2e-spec.ts
```

### Railway
```bash
# In Railway service shell
cd zephix-backend
npm run build
npm run test:e2e -- work-management-overview.e2e-spec.ts
```

## Response Examples

### Project Overview (Healthy)
```json
{
  "data": {
    "projectId": "uuid",
    "projectName": "Test Project",
    "healthCode": "HEALTHY",
    "healthLabel": "On track",
    "behindTargetDays": null,
    "needsAttention": [],
    "nextActions": []
  }
}
```

### Project Overview (At Risk)
```json
{
  "data": {
    "healthCode": "AT_RISK",
    "healthLabel": "Needs attention",
    "behindTargetDays": null,
    "needsAttention": [
      {
        "typeCode": "TASK_OVERDUE",
        "reasonText": "Overdue task. Fix bug",
        "nextStepCode": "UPDATE_DUE_DATE",
        "nextStepLabel": "Update due date",
        "entityRef": { "taskId": "uuid" }
      }
    ]
  }
}
```

