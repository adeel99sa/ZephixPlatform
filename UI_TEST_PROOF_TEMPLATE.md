# Template Center UI Test Proof - Steps 6-8

## Step 6: Structure Editor Validation

### Case A: Zero phases
- **Screenshot**: `step6a_zero_phases.png`
- **Network**: No PATCH request fired
- **Error message**: "must have at least one phase"

### Case B: Phase with zero tasks
- **Screenshot**: `step6b_phase_zero_tasks.png`
- **Network**: No PATCH request fired
- **Error message**: "each phase must have at least one task"

### Case C: Empty task title
- **Screenshot**: `step6c_empty_task_title.png`
- **Network**: No PATCH request fired
- **Error message**: "task title required"

## Step 7: Structure Persistence

### Before Save
- **Screenshot**: `step7_before_save.png`
- **Changes made**:
  - Phase 1 renamed to "Phase 1 Updated UI"
  - Task 2 added: "Task 2 UI"

### PATCH Request
- **Method**: PATCH
- **URL**: `/api/templates/:id`
- **Headers**:
  - Authorization: Bearer ...
  - No x-workspace-id (ORG template)
- **Body**: `{"structure": {...}}`

### Response
- **Status**: 200
- **Body**: `{"data": {...}}`

### After Refresh
- **Screenshot**: `step7_after_refresh.png`
- **Confirmed**: Phase name persists, Task 2 exists

## Step 8: DefaultEnabledKPIs Persistence

### Before Save
- **Screenshot**: `step8_before_save.png`
- **KPIs selected**: schedule_variance, budget_variance, resource_utilization

### PATCH Request
- **Method**: PATCH
- **URL**: `/api/templates/:id`
- **Headers**:
  - Authorization: Bearer ...
  - No x-workspace-id (ORG template)
- **Body**: `{"defaultEnabledKPIs": ["schedule_variance", "budget_variance", "resource_utilization"]}`

### Response
- **Status**: 200
- **Body**: `{"data": {...}}`

### After Refresh
- **Screenshot**: `step8_after_refresh.png`
- **Confirmed**: KPIs remain selected

## Negative Checks

### Member ORG Update
- **Result**: 403 Forbidden
- **Screenshot**: `negative_member_org_update.png`

### Owner WORKSPACE without workspace
- **Result**: UI blocks or 400 Bad Request
- **Screenshot**: `negative_owner_no_workspace.png`
