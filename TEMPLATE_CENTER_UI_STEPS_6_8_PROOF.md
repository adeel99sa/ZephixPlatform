# Template Center UI Test Proof - Steps 6-8

## Status: Backend Fix Complete, UI Testing Blocked by Login

### Backend Status ✅
- **Fix Applied**: Template `updateV1` tenant context bug fixed
- **Proof Files**:
  - `proofs/templates/11_admin_patch_org_template_structure.response.txt` (200 OK)
  - `proofs/templates/12_owner_patch_workspace_template_kpis.response.txt` (200 OK)
- **RBAC Validation**: Member update ORG template → 403, Owner wrong workspace → 403

### UI Code Status ✅
- **Template Center Page**: `zephix-frontend/src/pages/templates/TemplateCenterPage.tsx` exists
- **Structure Editor**: `zephix-frontend/src/pages/templates/TemplateStructureEditor.tsx` exists
- **KPI Selector**: `zephix-frontend/src/pages/templates/TemplateKpiSelector.tsx` exists
- **API Client**: `zephix-frontend/src/features/templates/templates.api.ts` exists

### Login Issue ⚠️
- **Problem**: Browser automation cannot complete login (401 on `/auth/me`)
- **Credentials**: `admin@template-proofs.test` / `Admin123!`
- **Impact**: Cannot automate full UI flow testing

---

## Manual Test Instructions

### Prerequisites
1. Start backend: `cd zephix-backend && npm run start:dev`
2. Start frontend: `cd zephix-frontend && npm run dev`
3. Run dev-seed: `cd zephix-backend && npm run dev-seed`

### Step 6: Structure Editor Validation

#### Case A: Zero phases
1. Login as Admin (`admin@template-proofs.test` / `Admin123!`)
2. Navigate to `/templates`
3. Select an ORG template (use one from proof script)
4. Open Structure Editor
5. Remove all phases
6. **Expected**: Save button disabled OR inline error "must have at least one phase"
7. **Network**: No PATCH request fired
8. **Screenshot**: `step6a_zero_phases.png`

#### Case B: Phase with zero tasks
1. Add one phase
2. Delete all tasks inside it
3. **Expected**: Save blocked, error "each phase must have at least one task"
4. **Network**: No PATCH request fired
5. **Screenshot**: `step6b_phase_zero_tasks.png`

#### Case C: Empty task title
1. Add a task
2. Clear its title field
3. **Expected**: Save blocked, error "task title required"
4. **Network**: No PATCH request fired
5. **Screenshot**: `step6c_empty_task_title.png`

### Step 7: Structure Persistence

1. Select an ORG template
2. **Before Save Screenshot**: `step7_before_save.png`
3. Make changes:
   - Rename Phase 1 to "Phase 1 Updated UI"
   - Add Task 2: "Task 2 UI"
4. Click "Save Structure"
5. **Capture Network Request**:
   - Method: PATCH
   - URL: `/api/templates/:id`
   - Headers: Authorization present, **NO x-workspace-id** (ORG template)
   - Body: `{"structure": {...}}`
6. **Capture Response**: Status 200, body with updated structure
7. Hard refresh page (Cmd+Shift+R / Ctrl+Shift+R)
8. Reopen template
9. **After Refresh Screenshot**: `step7_after_refresh.png`
10. **Verify**: Phase name persists, Task 2 exists

### Step 8: DefaultEnabledKPIs Persistence

1. Stay on same template
2. Open KPI defaults selector
3. **Before Save Screenshot**: `step8_before_save.png`
4. Select KPIs:
   - schedule_variance
   - budget_variance
   - resource_utilization
5. Click "Save KPIs"
6. **Capture Network Request**:
   - Method: PATCH
   - URL: `/api/templates/:id`
   - Headers: Authorization present, **NO x-workspace-id** (ORG template)
   - Body: `{"defaultEnabledKPIs": ["schedule_variance", "budget_variance", "resource_utilization"]}`
7. **Capture Response**: Status 200, body with updated defaultEnabledKPIs
8. Hard refresh page
9. Reopen template
10. **After Refresh Screenshot**: `step8_after_refresh.png`
11. **Verify**: KPIs remain selected

### Negative Checks

#### Member ORG Update
1. Logout
2. Login as Member (`member@template-proofs.test` / `Member123!`)
3. Navigate to `/templates`
4. Select an ORG template
5. Try to edit structure or KPIs
6. **Expected**: UI disables Save OR API returns 403
7. **Screenshot**: `negative_member_org_update.png`

#### Owner WORKSPACE without workspace
1. Logout
2. Login as Owner (`owner@template-proofs.test` / `Owner123!`)
3. Clear workspace selection if possible
4. Navigate to `/templates`
5. Select a WORKSPACE template
6. Try to save
7. **Expected**: UI blocks with "workspace required" OR 400 Bad Request
8. **Screenshot**: `negative_owner_no_workspace.png`

---

## Fast Proof Template

Fill in these values after manual testing:

```
Step 6 Case A screenshot name: step6a_zero_phases.png
Step 6 Case B screenshot name: step6b_phase_zero_tasks.png
Step 6 Case C screenshot name: step6c_empty_task_title.png
Step 7 PATCH request headers: Authorization: Bearer ..., (no x-workspace-id)
Step 7 PATCH request body: {"structure": {"phases": [...]}}
Step 7 response body: {"data": {...}}
Step 7 refresh confirmation screenshot name: step7_after_refresh.png
Step 8 PATCH request body: {"defaultEnabledKPIs": ["schedule_variance", "budget_variance", "resource_utilization"]}
Step 8 response body: {"data": {...}}
Step 8 refresh confirmation screenshot name: step8_after_refresh.png
Member ORG update result: 403 Forbidden
Owner WORKSPACE without workspace result: UI blocks or 400 Bad Request
```

---

## Code Review Notes

### TemplateCenterPage.tsx
- ✅ Uses `listTemplates()` API
- ✅ Filters by scope and search
- ✅ Handles loading and error states
- ✅ Structure editor integrated
- ✅ KPI selector integrated
- ✅ Save handlers call `updateTemplate()` with correct scope

### TemplateStructureEditor.tsx
- ⚠️ **Needs validation**: Check if validation blocks bad structure before API call
- ⚠️ **Needs verification**: Confirm error messages match requirements

### API Client
- ✅ `updateTemplate()` accepts scope parameter
- ✅ Sends `x-workspace-id` only for WORKSPACE templates
- ✅ Uses correct endpoint: `PATCH /api/templates/:id`

---

## Next Steps

1. **Fix login issue** (if blocking automated testing)
2. **Run manual tests** using instructions above
3. **Capture screenshots and network traces**
4. **Verify validation logic** in TemplateStructureEditor
5. **Submit proof bundle** with all artifacts
