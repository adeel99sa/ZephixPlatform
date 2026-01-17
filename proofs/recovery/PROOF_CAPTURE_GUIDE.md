# Proof Capture Guide - End-to-End Flow Verification

## Purpose
Capture HAR files and screenshots for each step of the primary user flow to prove end-to-end functionality.

## Prerequisites
1. Browser DevTools open (F12)
2. Network tab open with "Preserve log" enabled
3. Clear browser cache and localStorage before starting
4. Have a test account ready

## Capture Steps

### Step 1: Login
**File names:** `01_login.har`, `01_login.png`

1. Navigate to `/login`
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Enter credentials and click Login
5. **Screenshot:** Capture the page after login completes
6. **HAR:** Right-click in Network tab → "Save all as HAR with content"
7. **Verify:**
   - Status: 200 for `/auth/login`
   - Final route: `/home` (check URL bar)
   - No 400, 401, 403, 404, 500 errors

### Step 2: Home Redirect
**File names:** `02_home_redirect.har`, `02_home_redirect.png`

1. Start from `/home` (after login)
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Refresh page (F5)
5. **Screenshot:** Capture the page after redirect completes
6. **HAR:** Right-click in Network tab → "Save all as HAR with content"
7. **Verify:**
   - If `activeWorkspaceId` exists: redirects to `/workspaces/{id}/home`
   - If no `activeWorkspaceId`: shows HomeEmptyState
   - No redirect chains (only one redirect)
   - Final route is clean (no nested paths)

### Step 3: Workspace Select
**File names:** `03_workspace_select.har`, `03_workspace_select.png`

1. Start from workspace home or `/home`
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Click workspace dropdown in sidebar
5. Select a different workspace
6. **Screenshot:** Capture the workspace home page after selection
7. **HAR:** Right-click in Network tab → "Save all as HAR with content"
8. **Verify:**
   - `activeWorkspaceId` is set (check localStorage)
   - Route: `/workspaces/{workspaceId}/home`
   - No workspaceId is undefined/null in any request
   - Status: 200 for workspace fetch

### Step 4: Workspace Create
**File names:** `04_workspace_create.har`, `04_workspace_create.png`

1. Start from any page
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Click "Add workspace" or workspace dropdown → "Add new workspace"
5. Fill in name (and optional slug)
6. Click "Create"
7. **Screenshot:** Capture the workspace home page (NOT a modal)
8. **HAR:** Right-click in Network tab → "Save all as HAR with content"
9. **Verify:**
   - Status: 200 for `POST /api/workspaces`
   - Modal closes
   - Route: `/workspaces/{newWorkspaceId}/home`
   - Page renders workspace home layout (not centered modal)
   - `activeWorkspaceId` is set in localStorage

### Step 5: Workspace Home
**File names:** `05_workspace_home.har`, `05_workspace_home.png`

1. Navigate to `/workspaces/{id}/home`
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Wait for page to fully load
5. **Screenshot:** Capture the full workspace home page
6. **HAR:** Right-click in Network tab → "Save all as HAR with content"
7. **Verify:**
   - Status: 200 for `GET /api/workspaces/{id}`
   - Status: 200 for `GET /api/workspaces/{id}/summary`
   - Status: 200 for `GET /api/workspaces/{id}/role`
   - About section visible
   - KPI tiles show real numbers (not all zeros if data exists)
   - Projects section visible
   - No 400, 401, 403, 404, 500 errors

### Step 6: Plus Menu
**File names:** `06_plus_menu.har`, `06_plus_menu.png`

1. Start from workspace home
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Click the "+" button next to workspace dropdown
5. **Screenshot:** Capture the plus menu dropdown open
6. **HAR:** Right-click in Network tab → "Save all as HAR with content"
7. **Verify:**
   - Menu opens (no errors)
   - Shows: Project, Template Center, Doc, Form
   - No API calls on menu open (only UI interaction)

### Step 7: Template Center
**File names:** `07_template_center.har`, `07_template_center.png`

1. Start from workspace home
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Click "+" → "Template Center" (or "Open Template Center" button)
5. **Screenshot:** Capture the template center page
6. **HAR:** Right-click in Network tab → "Save all as HAR with content"
7. **Verify:**
   - Route: `/templates`
   - Status: 200 for `GET /api/templates` (if endpoint exists)
   - Templates visible (4-5 templates)
   - No 400, 401, 403, 404, 500 errors

### Step 8: Create Project
**File names:** `08_create_project.har`, `08_create_project.png`

1. Start from template center (`/templates`)
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Click "Create Project" on a template
5. Fill in project name if prompted
6. Click "Create" or confirm
7. **Screenshot:** Capture the project page after creation
8. **HAR:** Right-click in Network tab → "Save all as HAR with content"
9. **Verify:**
   - Status: 200 for project creation endpoint
   - Route: `/projects/{projectId}` (or `/work/projects/{projectId}/plan`)
   - Project loads successfully
   - No 400, 401, 403, 404, 500 errors

### Step 9: Open Plan
**File names:** `09_open_plan.har`, `09_open_plan.png`

1. Start from project page (`/projects/{projectId}`)
2. Open DevTools → Network tab
3. Check "Preserve log"
4. Click "Open Plan" button
5. **Screenshot:** Capture the plan view
6. **HAR:** Right-click in Network tab → "Save all as HAR with content"
7. **Verify:**
   - Route: `/work/projects/{projectId}/plan`
   - Status: 200 for plan/phases/tasks endpoints
   - Plan view loads with phases and tasks
   - No 400, 401, 403, 404, 500 errors

## Failure Documentation

For any step that fails, record:

1. **Request URL:** The exact URL that failed
2. **Status Code:** The HTTP status code
3. **Response Body:** The error response (if available)
4. **Frontend Route:** The route shown in the URL bar at time of failure
5. **Console Error:** Copy the exact error line from browser console

Example:
```
Step: 05_workspace_home
Failure:
- Request URL: GET /api/workspaces/abc123/summary
- Status Code: 404
- Response Body: {"code": "NOT_FOUND", "message": "Workspace not found"}
- Frontend Route: /workspaces/abc123/home
- Console Error: "Failed to load workspace data: Workspace not found"
```

## File Organization

Save all files to: `proofs/recovery/recheck/`

```
proofs/recovery/recheck/
├── 01_login.har
├── 01_login.png
├── 02_home_redirect.har
├── 02_home_redirect.png
├── 03_workspace_select.har
├── 03_workspace_select.png
├── 04_workspace_create.har
├── 04_workspace_create.png
├── 05_workspace_home.har
├── 05_workspace_home.png
├── 06_plus_menu.har
├── 06_plus_menu.png
├── 07_template_center.har
├── 07_template_center.png
├── 08_create_project.har
├── 08_create_project.png
├── 09_open_plan.har
└── 09_open_plan.png
```

## Success Criteria

All steps pass if:
- ✅ No 400, 401, 403, 404, 500 status codes
- ✅ No requests with workspaceId/projectId undefined or null
- ✅ Routes are clean (no nested redirects)
- ✅ UI renders correctly (not modals where pages should be)
- ✅ Data loads and displays (not all zeros if data exists)
