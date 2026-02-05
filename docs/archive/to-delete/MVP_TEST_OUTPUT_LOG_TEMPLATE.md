# MVP Smoke Test Output Log Template

**Instructions:** Run the MVP smoke test sequence and paste actual network logs here.

---

## Test Environment

- **Date:** _______________
- **Backend URL:** _______________
- **Frontend URL:** _______________
- **Browser:** _______________

---

## Step-by-Step Network Logs

### Step 1: Login as Admin

```
POST /api/auth/login
Status: ___
Request Headers:
  Content-Type: application/json
Response Headers:
  Authorization: Bearer ___
Response Body:
  {
    "accessToken": "___",
    "user": {
      "id": "___",
      "role": "ADMIN"
    }
  }
```

**Console Output:**
```
[Paste any console logs here]
```

---

### Step 2: Create Workspace

```
POST /api/workspaces
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: (none - workspace creation is org-scoped)
Request Body:
  {
    "name": "___",
    ...
  }
Response Body:
  {
    "id": "___",
    "name": "___"
  }
```

**Console Output:**
```
[Paste console logs]
```

---

### Step 3: Add Member User

```
POST /api/workspaces/:workspaceId/members
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "userId": "___",
    "role": "workspace_member"
  }
Response Body:
  {
    "id": "___",
    "role": "workspace_member"
  }
```

---

### Step 4: Add Viewer User

```
POST /api/workspaces/:workspaceId/members
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "userId": "___",
    "role": "workspace_viewer"
  }
Response Body:
  {
    "id": "___",
    "role": "workspace_viewer"
  }
```

---

### Step 5: Select Workspace

```
GET /api/workspaces/:workspaceId
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Response Body:
  {
    "id": "___",
    "name": "___"
  }
```

**UI Check:**
- [ ] Workspace selector shows selected workspace
- [ ] No errors in console

---

### Step 6: Apply Template to Create Project

```
GET /api/templates
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Response Body:
  {
    "templates": [...]
  }

POST /api/templates/:templateId/instantiate
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "name": "___",
    "workspaceId": "___"
  }
Response Body:
  {
    "id": "___",
    "name": "___"
  }
```

**UI Check:**
- [ ] Project created successfully
- [ ] Redirected to project page
- [ ] No 404 or 403 errors

---

### Step 7: Open Project Overview

```
GET /api/work/projects/:projectId/overview
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Response Body:
  {
    "projectId": "___",
    "projectName": "___",
    "healthCode": "___",
    ...
  }
```

**UI Check:**
- [ ] Overview loads without errors
- [ ] All sections visible

---

### Step 8a: Create Task

```
POST /api/work/tasks
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "projectId": "___",
    "title": "___",
    "status": "TODO"
  }
Response Body:
  {
    "id": "___",
    "title": "___",
    "status": "TODO"
  }
```

**FAILURE CHECK:**
- [ ] ❌ If URL is `/api/tasks` → Commit 1 incomplete
- [ ] ❌ If 403 "WORKSPACE_REQUIRED" → Commit 2 incomplete
- [ ] ❌ If 404 → Endpoint mismatch

---

### Step 8b: Assign Task to Member

```
PATCH /api/work/tasks/:taskId
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "assigneeUserId": "___"
  }
Response Body:
  {
    "id": "___",
    "assigneeUserId": "___"
  }
```

---

### Step 8c: Move Status TODO → IN_PROGRESS

```
PATCH /api/work/tasks/:taskId
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "status": "IN_PROGRESS"
  }
Response Body:
  {
    "id": "___",
    "status": "IN_PROGRESS"
  }
```

---

### Step 8d: Move Status IN_PROGRESS → DONE

```
PATCH /api/work/tasks/:taskId
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "status": "DONE"
  }
Response Body:
  {
    "id": "___",
    "status": "DONE"
  }
```

---

### Step 9: Validate My Work (as Member)

```
GET /api/my-work
Status: ___
Request Headers:
  Authorization: Bearer ___
Response Body:
  {
    "version": 1,
    "counts": {
      "total": 1,
      "overdue": 0,
      "dueSoon7Days": 0,
      "inProgress": 0,
      "todo": 0,
      "done": 1
    },
    "items": [
      {
        "id": "___",
        "title": "___",
        "status": "done",
        "projectId": "___",
        "projectName": "___",
        "workspaceId": "___",
        "workspaceName": "___"
      }
    ]
  }
```

**FAILURE CHECK:**
- [ ] ❌ If items array is empty but task exists → Commit 3 incomplete
- [ ] ❌ If 404 or 500 → Backend service error

---

### Step 10a: Load KPIs (as Admin)

```
GET /api/projects/:projectId/kpis
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Response Body:
  {
    "availableKPIs": [
      {
        "id": "___",
        "name": "___",
        "description": "___"
      }
    ],
    "activeKpiIds": []
  }
```

**FAILURE CHECK:**
- [ ] ❌ If 404 → Commit 4 incomplete (endpoint not added)
- [ ] ❌ If availableKPIs is empty → Template has no KPIs (expected if template has none)

---

### Step 10b: Toggle 2 KPIs ON

```
PATCH /api/projects/:projectId/kpis
Status: ___
Request Headers:
  Authorization: Bearer ___
  x-workspace-id: ___
Request Body:
  {
    "activeKpiIds": ["kpi-id-1", "kpi-id-2"]
  }
Response Body:
  {
    "availableKPIs": [...],
    "activeKpiIds": ["kpi-id-1", "kpi-id-2"]
  }
```

**UI Check:**
- [ ] Toggles show ON state
- [ ] "Saving..." indicator appears then disappears
- [ ] No errors

---

### Step 10c: Refresh Page, Confirm KPIs Remain ON

```
GET /api/projects/:projectId/kpis
Status: ___
Response Body:
  {
    "activeKpiIds": ["kpi-id-1", "kpi-id-2"]  // Same as before refresh
  }
```

**UI Check:**
- [ ] Both KPIs still show as ON
- [ ] State persisted

---

### Step 10d: Toggle 1 KPI OFF

```
PATCH /api/projects/:projectId/kpis
Status: ___
Request Body:
  {
    "activeKpiIds": ["kpi-id-2"]  // Only second KPI
  }
Response Body:
  {
    "activeKpiIds": ["kpi-id-2"]
  }
```

---

### Step 10e: Refresh Page, Confirm KPI Remains OFF

```
GET /api/projects/:projectId/kpis
Status: ___
Response Body:
  {
    "activeKpiIds": ["kpi-id-2"]  // Only second KPI, first still off
  }
```

**UI Check:**
- [ ] First KPI still OFF
- [ ] Second KPI still ON
- [ ] State persisted correctly

---

## Edge Case Tests

### Test A: Workspace Not Selected

**Action:** Clear workspace selection, navigate to project page

**Expected:**
```
GET /api/work/projects/:projectId/overview
Status: (Request should NOT be sent - interceptor blocks it)
```

**UI Check:**
- [ ] Clear message: "Workspace required. Please select a workspace first."
- [ ] No background request loop
- [ ] No console errors

---

### Test B: Viewer Experience

**Action:** Login as Viewer, navigate to project overview

```
GET /api/projects/:projectId/kpis
Status: 200 (viewer can read)

PATCH /api/projects/:projectId/kpis
Status: 403 Forbidden (viewer cannot write)

POST /api/work/tasks
Status: 403 Forbidden (viewer cannot create tasks)
```

**UI Check:**
- [ ] KPI list visible
- [ ] KPI toggles disabled (grayed out)
- [ ] "Create Task" button hidden or disabled
- [ ] Error message shown if viewer tries to toggle

---

## Summary

**Pass Criteria:**
- [ ] ✅ No 404 on task endpoints
- [ ] ✅ No 403 for missing x-workspace-id after workspace selection
- [ ] ✅ My Work lists WorkTask records for assignee
- [ ] ✅ GET project KPIs returns available KPIs plus activeKpiIds
- [ ] ✅ PATCH project KPIs persists activeKpiIds

**Failures Found:**
[List any failures here with exact error messages and network logs]

---

**Next:** After passing all checks, proceed to Phase 7.5 dashboards implementation.
