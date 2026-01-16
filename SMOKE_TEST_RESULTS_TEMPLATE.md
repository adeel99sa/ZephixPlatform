# MVP Smoke Test Results Template

**Date:** _______________
**Tester:** _______________
**Environment:** Backend: _______________, Frontend: _______________

---

## Pre-Test Verification

```bash
./verify-mvp-readiness.sh
```

**Output:**
```
[Paste verification script output here]
```

**Result:** ✅ Pass / ❌ Fail

---

## Active Workspace ID

**Selected Workspace UUID:** `[Paste UUID here - no other text]`

---

## Network Logs - Required Endpoints

### 1. GET /api/work/tasks?projectId=...

```
Request URL: GET /api/work/tasks?projectId=...
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Response Body:
{
  [Paste full response body here]
}
```

**Console Errors:** [Any errors related to this request]

---

### 2. POST /api/work/tasks

```
Request URL: POST /api/work/tasks
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
{
  [Paste request body here]
}
Response Body:
{
  [Paste full response body here]
}
```

**Console Errors:** [Any errors related to this request]

---

### 3. GET /api/my-work

```
Request URL: GET /api/my-work
Status: ___
Request Headers:
  Authorization: Bearer ___
Response Body:
{
  [Paste full response body here]
}
```

**Console Errors:** [Any errors related to this request]

**UI Check:**
- [ ] Task appears in My Work list
- [ ] Task shows correct status
- [ ] Task shows project and workspace names

---

### 4. GET /api/projects/:id/kpis

```
Request URL: GET /api/projects/:id/kpis
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Response Body:
{
  [Paste full response body here]
}
```

**Console Errors:** [Any errors related to this request]

**UI Check:**
- [ ] KPI panel loads
- [ ] Available KPIs listed
- [ ] Default KPIs shown as active (if template has defaults)

---

### 5. PATCH /api/projects/:id/kpis

```
Request URL: PATCH /api/projects/:id/kpis
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
{
  "activeKpiIds": [___, ___]
}
Response Body:
{
  [Paste full response body here]
}
```

**Console Errors:** [Any errors related to this request]

**UI Check:**
- [ ] Toggles update immediately
- [ ] "Saving..." indicator appears
- [ ] No errors shown

---

### 6. GET /api/projects/:id/kpis (After Refresh)

```
Request URL: GET /api/projects/:id/kpis
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Response Body:
{
  [Paste full response body here]
}
```

**UI Check:**
- [ ] KPIs remain in same state after refresh
- [ ] activeKpiIds matches previous PATCH

---

## Test Flow Results

### Step 1: Login as Admin
- [ ] ✅ Success
- [ ] ❌ Failed - Error: _______________

### Step 2: Create Workspace
- [ ] ✅ Success - Workspace ID: `___`
- [ ] ❌ Failed - Error: _______________

### Step 3: Select Workspace
- [ ] ✅ Success
- [ ] ❌ Failed - Error: _______________

### Step 4: Apply Template → Create Project
- [ ] ✅ Success - Project ID: `___`
- [ ] ❌ Failed - Error: _______________

**Check:**
- [ ] Project loads without errors
- [ ] Default KPIs are active (if template has defaults)

### Step 5: Create Task
- [ ] ✅ Success - Task ID: `___`
- [ ] ❌ Failed - Error: _______________

**Check:**
- [ ] Task appears in project view
- [ ] No 404 errors
- [ ] No 403 errors

### Step 6: Assign Task to Self
- [ ] ✅ Success
- [ ] ❌ Failed - Error: _______________

### Step 7: Open My Work
- [ ] ✅ Success
- [ ] ❌ Failed - Error: _______________

**Check:**
- [ ] Assigned task appears
- [ ] Task shows correct project and workspace

### Step 8: Toggle KPI ON
- [ ] ✅ Success
- [ ] ❌ Failed - Error: _______________

### Step 9: Toggle KPI OFF
- [ ] ✅ Success
- [ ] ❌ Failed - Error: _______________

### Step 10: Refresh Page
- [ ] ✅ Success - KPI state persisted
- [ ] ❌ Failed - State lost

---

## Edge Case Tests

### Test A: Workspace Not Selected

**Action:** Clear workspace selection, navigate to project page

**Expected:**
- [ ] Request blocked by interceptor
- [ ] UI shows "Workspace required" message
- [ ] No request spam in network tab

**Actual:**
```
[Describe what happened]
```

---

### Test B: Viewer Experience

**Action:** Login as Viewer, navigate to project overview

**Expected:**
- [ ] GET /api/projects/:id/kpis returns 200
- [ ] PATCH /api/projects/:id/kpis returns 403
- [ ] Toggles disabled in UI

**Actual:**
```
[Paste network logs for viewer tests]
```

---

## Console Errors Summary

**Total Errors:** ___

**Errors:**
```
[Paste all console errors here]
```

---

## Pass Criteria Check

### Work Management
- [ ] ✅ No 404s for task list, create, update
- [ ] ✅ No 403s after workspace selection
- [ ] ✅ Tasks appear in project views and My Work

### Template Center
- [ ] ✅ Template apply creates phases and tasks
- [ ] ✅ Project opens with valid workspace context
- [ ] ✅ Project.templateSnapshot exists

### KPI Lego System
- [ ] ✅ Default KPIs active on new template-based projects
- [ ] ✅ Toggling updates Project.activeKpiIds
- [ ] ✅ Viewer role cannot toggle

### RBAC and Governance
- [ ] ✅ Admin/Workspace Owner can create projects
- [ ] ✅ Members can execute work
- [ ] ✅ Cross-workspace access fails safely

---

## Enterprise Standards Validation

### Tenancy and Isolation
- [ ] ✅ Workspace-scoped endpoints validate access
- [ ] ✅ ProjectId belongs to workspaceId
- [ ] ✅ Dashboard endpoints require workspace access

### Auditing and Traceability
- [ ] ✅ Task updates write activity records
- [ ] ✅ KPI changes update project.updatedAt

### Consistency Rules
- [ ] ✅ Template-based projects have templateId/templateSnapshot
- [ ] ✅ Template-based projects have activeKpiIds aligned with defaults
- [ ] ✅ Non-template projects return clear KPI behavior

### Stability
- [ ] ✅ WorkspaceGuard prevents request storms
- [ ] ✅ API errors show one clear message
- [ ] ✅ Refresh works without losing workspace context

---

## Issues Found

### Critical Issues
[List any blocking issues here]

### Non-Critical Issues
[List any non-blocking issues here]

---

## Next Steps

**Status:** Ready for review / Needs fixes

**Action Required:** [What needs to be done next]

---

**Once you paste this filled template, I will:**
1. Map any failures to exact files
2. Provide smallest fix set
3. Complete Phase 7.5 dashboard UI wiring
