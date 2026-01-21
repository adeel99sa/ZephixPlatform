# MVP Work Management Loop - Manual Proof Checklist

## Prerequisites
- Backend running on http://localhost:3000
- Frontend running on http://localhost:5173
- Chrome browser with DevTools
- Test admin account (admin@zephix.ai / admin123456)

## Setup DevTools
1. Open Chrome
2. Navigate to http://localhost:5173/login
3. Open DevTools (F12 or Cmd+Option+I)
4. Go to Network tab
5. Enable:
   - ✅ Preserve log
   - ✅ Disable cache
6. Set filter as needed (workspaces, templates, projects, home)

## Proof Artifacts to Capture

### 1. Workspace Create Success
**File:** `proofs/mvp/11_workspace_create_success.har`
**File:** `proofs/mvp/12_workspace_create_success.png`

**Steps:**
1. Login as admin
2. Open Create Workspace modal
3. Enter:
   - Name: `MVP Test Workspace`
   - Slug: `mvp-test-workspace`
4. Click Create
5. **Screenshot:** Capture success toast (no alert popup) + new workspace visible
6. **HAR:** Right-click POST `/api/workspaces` request → Save all as HAR
7. **Verify:** Request body contains only `{"name": "...", "slug": "..."}` (no ownerId)

### 2. Home Empty State
**File:** `proofs/mvp/13_home_empty_state.png`

**Steps:**
1. Clear active workspace (if one is selected)
2. Navigate to `/home`
3. **Screenshot:** Show empty state with "Select Workspace" and "Create Project" buttons
4. Verify no "Failed to load home data" error

### 3. Template Center
**File:** `proofs/mvp/14_template_center.png`

**Steps:**
1. Navigate to `/templates`
2. Select a template from the list
3. **Screenshot:** Show template details with "Create Project" button as primary action (green, larger)

### 4. Template Instantiation
**File:** `proofs/mvp/15_instantiate.har`

**Steps:**
1. In Template Center, select a template
2. Click "Create Project" button
3. Enter project name: `MVP Test Project`
4. Click "Create Project"
5. **HAR:** Right-click POST `/api/templates/:id/instantiate-v5_1` request
6. **Verify:** Response contains `{"data": {"projectId": "...", ...}}`
7. **Verify:** Auto-navigates to `/projects/:projectId`

### 5. Project Overview
**File:** `proofs/mvp/16_project_overview.png`

**Steps:**
1. After instantiation, should be on `/projects/:projectId`
2. **Screenshot:** Show project overview page with:
   - Project name in header
   - "Open Plan" button visible
   - Project health/status visible

### 6. Open Plan
**File:** `proofs/mvp/17_open_plan.png`

**Steps:**
1. On Project Overview page
2. Click "Open Plan" button
3. Should navigate to `/work/projects/:projectId/plan`
4. **Screenshot:** Show plan view with phases and tasks from template

### 7. Programs/Portfolios Hidden
**File:** `proofs/mvp/18_programs_portfolios_hidden.png`

**Steps:**
1. Navigate to any workspace
2. **Screenshot:** Show sidebar with Programs and Portfolios links NOT visible
3. Verify only: Overview, Projects, Members are visible

### 8. Proof Summary
**File:** `proofs/mvp/19_proof_summary.txt`

**Content:**
- List each artifact with description
- Include exact URLs visited
- Include request payload snippets from DevTools:
  - Workspace create request body
  - Template instantiate request body
  - Template instantiate response (projectId)

## Verification Checklist

- [ ] Workspace create sends only `name` and `slug` (no ownerId)
- [ ] Workspace create succeeds (201 response)
- [ ] Workspace create shows toast (no alert popup)
- [ ] `/home` loads without workspace and shows empty state
- [ ] `/home` error state has retry button
- [ ] Template Center shows "Create Project" as primary action
- [ ] Instantiate returns `projectId` in response
- [ ] Navigation to `/projects/:projectId` works automatically
- [ ] Project Overview loads and shows project name
- [ ] "Open Plan" button navigates to `/work/projects/:projectId/plan`
- [ ] Plan view loads phases and tasks
- [ ] Programs and Portfolios are hidden in sidebar (feature flag false)
