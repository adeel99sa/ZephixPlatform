# Quick Smoke Test Guide

**Time:** ~5 minutes
**Goal:** Prove user journey, not features

---

## Prerequisites

```bash
# 1. Run verification
./verify-mvp-readiness.sh

# 2. Start backend
cd zephix-backend && npm run start:dev

# 3. Start frontend (new terminal)
cd zephix-frontend && npm run dev
```

---

## Test Flow (10 Steps)

### 1. Login as Admin
- Navigate to `/login`
- Login with admin credentials
- ✅ Token stored

### 2. Create Workspace
- Navigate to workspaces
- Click "Create Workspace"
- Fill form, submit
- ✅ Workspace created
- **Note:** Workspace ID: `[Paste UUID here]`

### 3. Select Workspace
- Use workspace selector
- Select created workspace
- ✅ Workspace selected

### 4. Apply Template → Create Project
- Navigate to Templates
- Select a template
- Click "Apply" or "Create Project"
- Fill project name, submit
- ✅ Project created
- **Check:** Project loads without errors
- **Check:** Default KPIs active (if template has defaults)

### 5. Create Task
- Scroll to Task List Section
- Click "Create Task"
- Fill form, submit
- ✅ Task created
- **Check:** No 404 errors
- **Check:** No 403 errors

### 6. Assign Task to Self
- Click on created task
- Select yourself as assignee
- Save
- ✅ Task assigned

### 7. Open My Work
- Navigate to "My Work" page
- ✅ Task appears in list
- **Check:** Task shows correct project and workspace

### 8. Toggle KPI ON
- Navigate back to project overview
- Scroll to KPI Panel
- Toggle one KPI switch ON
- Wait for save indicator
- ✅ KPI toggled ON

### 9. Toggle KPI OFF
- Toggle same KPI switch OFF
- Wait for save indicator
- ✅ KPI toggled OFF

### 10. Refresh Page
- Press F5 or refresh button
- Check KPI panel
- ✅ KPI state persisted (still OFF)

---

## Network Logs to Capture

**Open Browser DevTools → Network Tab**

**Filter:** XHR/Fetch only

**Capture these 5 requests:**

1. **GET /api/work/tasks?projectId=...**
   - After creating task
   - Copy: URL, status, headers, response body

2. **POST /api/work/tasks**
   - When creating task
   - Copy: URL, status, headers, request body, response body

3. **GET /api/my-work**
   - When opening My Work
   - Copy: URL, status, headers, response body

4. **GET /api/projects/:id/kpis**
   - When opening project overview
   - Copy: URL, status, headers, response body

5. **PATCH /api/projects/:id/kpis**
   - When toggling KPI
   - Copy: URL, status, headers, request body, response body

**Also Capture:**
- Active workspace UUID (from workspace selector or network headers)
- Any console errors
- Any 404/403/500 responses

---

## Quick Pass/Fail Check

### ✅ Pass If:
- All 10 steps complete without errors
- All 5 network requests return 200/201
- Task appears in My Work
- KPI toggle persists after refresh
- No 404/403 errors after workspace selection

### ❌ Fail If:
- Any step fails with error
- Any network request returns 404/403/500
- Task doesn't appear in My Work
- KPI toggle doesn't persist
- Console shows repeated errors

---

## Results Template

**Paste in:** `SMOKE_TEST_RESULTS_TEMPLATE.md`

**Minimum Required:**
1. Active workspace UUID
2. Network logs for 5 endpoints
3. Pass/fail for each step
4. Any console errors

---

**Time:** ~5 minutes
**Next:** Paste results, get fixes + Phase 7.5 completion
