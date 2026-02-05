# MVP Smoke Test Verification Guide

**Date:** January 15, 2026
**Purpose:** End-to-end verification of MVP tester path with network inspection

---

## Pre-Test Setup

1. **Start Backend**
   ```bash
   cd zephix-backend
   npm run start:dev
   ```
   Verify: Backend running on port 3001 (or configured port)

2. **Start Frontend**
   ```bash
   cd zephix-frontend
   npm run dev
   ```
   Verify: Frontend running on port 5173 (or configured port)

3. **Open Browser DevTools**
   - Open Network tab
   - Enable "Preserve log"
   - Filter: XHR/Fetch only

---

## Test Sequence

### Step 1: Login as Admin

**Action:**
- Navigate to `/login`
- Login with admin credentials

**Network Check:**
```
POST /api/auth/login
Headers:
  ✓ Authorization: (none initially)
Response:
  ✓ 200 OK
  ✓ Body contains: { accessToken, user: { role: 'ADMIN' } }
```

**Console Check:**
- No errors
- Auth token stored in localStorage

---

### Step 2: Create Workspace

**Action:**
- Navigate to workspaces
- Click "Create Workspace"
- Fill form and submit

**Network Check:**
```
POST /api/workspaces
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: (none - workspace creation is org-scoped)
Response:
  ✓ 201 Created
  ✓ Body contains: { id: <uuid>, name: <name> }
```

**Console Check:**
- Workspace created successfully
- Workspace ID stored in workspace-storage

---

### Step 3: Add 2 Users (Member and Viewer)

**Action:**
- Go to workspace settings
- Add member with role "workspace_member"
- Add viewer with role "workspace_viewer"

**Network Check:**
```
POST /api/workspaces/:id/members
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Body:
  ✓ { userId: <uuid>, role: 'workspace_member' }
Response:
  ✓ 201 Created

POST /api/workspaces/:id/members
Body:
  ✓ { userId: <uuid>, role: 'workspace_viewer' }
Response:
  ✓ 201 Created
```

**Console Check:**
- Both users added successfully
- Member list updated

---

### Step 4: Select Workspace in UI

**Action:**
- Use workspace selector dropdown
- Select the created workspace

**Network Check:**
```
GET /api/workspaces/:id
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Response:
  ✓ 200 OK
  ✓ Body contains workspace details
```

**Console Check:**
- Workspace selected
- activeWorkspaceId in workspace-storage updated
- No errors about missing workspace

---

### Step 5: Apply Template to Create Project

**Action:**
- Navigate to Templates
- Select a template
- Click "Apply" or "Create Project"
- Fill project name
- Submit

**Network Check:**
```
GET /api/templates
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Response:
  ✓ 200 OK
  ✓ Body contains templates list

POST /api/templates/:id/instantiate
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Body:
  ✓ { name: <project-name>, workspaceId: <workspace-uuid> }
Response:
  ✓ 201 Created
  ✓ Body contains: { id: <project-uuid>, name: <name> }
```

**Console Check:**
- Project created successfully
- Redirected to project page
- No 404 or 403 errors

---

### Step 6: Open Project Overview

**Action:**
- Navigate to project detail page
- Click "Overview" tab (or default view)

**Network Check:**
```
GET /api/work/projects/:projectId/overview
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Response:
  ✓ 200 OK
  ✓ Body contains project overview data
```

**Console Check:**
- Overview loads without errors
- All sections visible (Health, Needs Attention, etc.)

---

### Step 7: Validate Work Management

#### 7a. Create Task

**Action:**
- Scroll to Task List Section
- Click "Create Task" or fill form
- Submit

**Network Check:**
```
POST /api/work/tasks
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Body:
  ✓ { projectId: <uuid>, title: <string>, ... }
Response:
  ✓ 201 Created
  ✓ Body contains: { id: <uuid>, title: <string>, status: 'TODO' }
```

**Console Check:**
- Task appears in list immediately
- No 404 errors
- No 403 errors

#### 7b. Assign Task to Member

**Action:**
- Click on created task
- Select assignee (Member user)
- Save

**Network Check:**
```
PATCH /api/work/tasks/:taskId
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Body:
  ✓ { assigneeUserId: <member-user-uuid> }
Response:
  ✓ 200 OK
  ✓ Body contains updated task with assigneeUserId
```

**Console Check:**
- Task shows assigned user
- No errors

#### 7c. Move Status: TODO → IN_PROGRESS → DONE

**Action:**
- Click status dropdown on task
- Select "IN_PROGRESS"
- Wait for save
- Select "DONE"

**Network Check:**
```
PATCH /api/work/tasks/:taskId
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Body:
  ✓ { status: 'IN_PROGRESS' }
Response:
  ✓ 200 OK

PATCH /api/work/tasks/:taskId
Body:
  ✓ { status: 'DONE' }
Response:
  ✓ 200 OK
```

**Console Check:**
- Status updates immediately
- Task list refreshes
- No errors

**FAILURE CHECK:**
- ❌ If you see `/api/tasks/:id` or `/api/projects/:id/tasks` → Commit 1 incomplete
- ❌ If you see 403 with "WORKSPACE_REQUIRED" → Commit 2 incomplete
- ❌ If you see 404 → Endpoint mismatch

---

### Step 8: Validate My Work

**Action:**
- Logout as Admin
- Login as Member user
- Navigate to "My Work" page

**Network Check:**
```
GET /api/my-work
Headers:
  ✓ Authorization: Bearer <member-token>
  ✓ x-workspace-id: (not required for my-work, but should be present if workspace selected)
Response:
  ✓ 200 OK
  ✓ Body contains:
    {
      version: 1,
      counts: { total: 1, ... },
      items: [
        {
          id: <task-uuid>,
          title: <task-title>,
          status: 'done',
          projectId: <project-uuid>,
          projectName: <project-name>,
          workspaceId: <workspace-uuid>,
          workspaceName: <workspace-name>
        }
      ]
    }
```

**Console Check:**
- Task assigned in Step 7b appears in My Work
- Status shows correctly
- Project and workspace names visible

**FAILURE CHECK:**
- ❌ If My Work is empty but task exists → Commit 3 incomplete (querying WorkItem instead of WorkTask)
- ❌ If 404 or 500 → Backend service error

---

### Step 9: Validate KPI Toggles

**Action:**
- Logout as Member
- Login as Admin
- Navigate to project overview
- Scroll to KPI Panel

#### 9a. Load KPIs

**Network Check:**
```
GET /api/projects/:projectId/kpis
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Response:
  ✓ 200 OK
  ✓ Body contains:
    {
      availableKPIs: [
        { id: <kpi-id>, name: <kpi-name>, description: <string>, ... }
      ],
      activeKpiIds: []
    }
```

**Console Check:**
- KPI panel loads
- Available KPIs listed
- All toggles initially OFF

#### 9b. Toggle 2 KPIs ON

**Action:**
- Toggle first KPI switch ON
- Toggle second KPI switch ON
- Wait for save indicator

**Network Check:**
```
PATCH /api/projects/:projectId/kpis
Headers:
  ✓ Authorization: Bearer <token>
  ✓ x-workspace-id: <workspace-uuid>
Body:
  ✓ { activeKpiIds: [<kpi-id-1>, <kpi-id-2>] }
Response:
  ✓ 200 OK
  ✓ Body contains:
    {
      availableKPIs: [...],
      activeKpiIds: [<kpi-id-1>, <kpi-id-2>]
    }
```

**Console Check:**
- Toggles show ON state
- "Saving..." indicator appears then disappears
- No errors

#### 9c. Refresh Page, Confirm KPIs Remain ON

**Action:**
- Refresh browser (F5)
- Wait for page load
- Check KPI panel

**Network Check:**
```
GET /api/projects/:projectId/kpis
Response:
  ✓ 200 OK
  ✓ Body contains:
    {
      activeKpiIds: [<kpi-id-1>, <kpi-id-2>]  // Same as before refresh
    }
```

**Console Check:**
- Both KPIs still show as ON
- State persisted

#### 9d. Toggle 1 KPI OFF

**Action:**
- Toggle first KPI switch OFF
- Wait for save

**Network Check:**
```
PATCH /api/projects/:projectId/kpis
Body:
  ✓ { activeKpiIds: [<kpi-id-2>] }  // Only second KPI
Response:
  ✓ 200 OK
  ✓ Body contains:
    {
      activeKpiIds: [<kpi-id-2>]
    }
```

**Console Check:**
- First KPI shows OFF
- Second KPI still ON
- Save successful

#### 9e. Refresh Page, Confirm KPI Remains OFF

**Action:**
- Refresh browser
- Check KPI panel

**Network Check:**
```
GET /api/projects/:projectId/kpis
Response:
  ✓ 200 OK
  ✓ Body contains:
    {
      activeKpiIds: [<kpi-id-2>]  // Only second KPI, first still off
    }
```

**Console Check:**
- First KPI still OFF
- Second KPI still ON
- State persisted correctly

**FAILURE CHECK:**
- ❌ If GET returns 404 → Commit 4 incomplete (endpoint not added)
- ❌ If PATCH returns 400 with "INVALID_KPI_IDS" → Validation working (good!)
- ❌ If activeKpiIds resets to [] after refresh → Commit 4 incomplete (migration not run or field not saved)

---

## Edge Case Tests

### Test A: Workspace Not Selected

**Action:**
- Clear workspace selection (or logout/login without selecting)
- Navigate to project page

**Expected Network:**
```
GET /api/work/projects/:projectId/overview
Headers:
  ✗ x-workspace-id: (missing)
Response:
  ✗ Request should NOT be sent (interceptor blocks it)
```

**Expected UI:**
- Clear message: "Workspace required. Please select a workspace first."
- No background request loop
- No console errors about failed requests

**FAILURE CHECK:**
- ❌ If requests are sent without x-workspace-id → Commit 2 incomplete
- ❌ If UI shows generic error → Need better error message

---

### Test B: Viewer Experience

**Action:**
- Login as Viewer
- Navigate to project overview
- Try to interact with KPIs and tasks

**Expected Network:**
```
GET /api/projects/:projectId/kpis
Response:
  ✓ 200 OK (viewer can read)

PATCH /api/projects/:projectId/kpis
Response:
  ✗ 403 Forbidden (viewer cannot write)

POST /api/work/tasks
Response:
  ✗ 403 Forbidden (viewer cannot create tasks)
```

**Expected UI:**
- KPI list visible
- KPI toggles disabled (grayed out)
- "Create Task" button hidden or disabled
- Error message shown if viewer tries to toggle: "You do not have permission to update KPIs"

**FAILURE CHECK:**
- ❌ If viewer can toggle KPIs → Role check missing
- ❌ If viewer sees generic error → Need better error handling
- ❌ If viewer can create tasks → Permission check missing

---

## Pass Criteria Summary

✅ **No 404 on task endpoints**
- All task operations use `/api/work/tasks/*`
- No calls to `/api/tasks/*` or `/api/projects/:id/tasks`

✅ **No 403 for missing x-workspace-id after workspace selection**
- All requests include `x-workspace-id` header
- Interceptor adds header automatically

✅ **My Work lists WorkTask records for assignee**
- My Work shows tasks assigned to current user
- Tasks appear after assignment

✅ **GET project KPIs returns available KPIs plus activeKpiIds**
- Response shape: `{ availableKPIs: [...], activeKpiIds: [...] }`
- Available KPIs come from template or templateSnapshot

✅ **PATCH project KPIs persists activeKpiIds**
- State persists after refresh
- Only active KPIs are saved

---

## Network Log Template

Copy this template and fill in actual values:

```
=== MVP Smoke Test Network Log ===
Date: _______________
Tester: _______________

1. Login
   POST /api/auth/login
   Status: ___
   Headers: Authorization: ___

2. Create Workspace
   POST /api/workspaces
   Status: ___
   Headers: x-workspace-id: ___

3. Create Task
   POST /api/work/tasks
   Status: ___
   Headers: x-workspace-id: ___
   Body: { projectId: ___, title: ___ }

4. My Work
   GET /api/my-work
   Status: ___
   Items Count: ___

5. Get KPIs
   GET /api/projects/:id/kpis
   Status: ___
   Available KPIs: ___
   Active KPIs: ___

6. Update KPIs
   PATCH /api/projects/:id/kpis
   Status: ___
   Body: { activeKpiIds: [___, ___] }

7. Refresh KPIs
   GET /api/projects/:id/kpis
   Status: ___
   Active KPIs After Refresh: ___
```

---

## Common Failures and Fixes

| Failure | Symptom | Fix |
|---------|---------|-----|
| 404 on tasks | Network shows `/api/tasks/*` | Commit 1: Update frontend to use `/work/tasks` |
| 403 WORKSPACE_REQUIRED | Missing x-workspace-id header | Commit 2: Add header in api.ts interceptor |
| My Work empty | Task exists but not shown | Commit 3: Update service to query WorkTask |
| KPIs not persisting | activeKpiIds resets | Commit 4: Run migration, check entity field |
| Viewer can toggle | No role check | Add role check in component and backend |

---

**Next:** After passing all checks, proceed to Phase 7.5 dashboards.
