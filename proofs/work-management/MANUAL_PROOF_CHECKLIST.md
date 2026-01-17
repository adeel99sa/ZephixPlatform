# MVP Work Management Flow - Manual Proof Checklist

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
6. Set filter: `workspaces` or `templates` or `projects` (change as needed)

## Proof Artifacts to Capture

### 1. Workspace Create Success
**File:** `proofs/work-management/mvp-flow/01_workspace_create_success.png`

**Steps:**
1. Login as admin
2. Open Create Workspace modal
3. Enter:
   - Name: `MVP Test Workspace`
   - Slug: `mvp-test-workspace`
4. Click Create
5. **Screenshot:** Capture success toast + new workspace visible in sidebar/list

**HAR File:** `proofs/work-management/mvp-flow/02_workspace_create_success.har`
- Right-click POST `/api/workspaces` request
- Save all as HAR
- Verify request body contains only `{"name": "...", "slug": "..."}`

### 2. Template Center
**File:** `proofs/work-management/mvp-flow/03_template_center.png`

**Steps:**
1. Navigate to `/templates`
2. **Screenshot:** Show template list with "Create Project" button visible on selected template

### 3. Template Instantiation
**HAR File:** `proofs/work-management/mvp-flow/04_instantiate_request.har`

**Steps:**
1. In Template Center, select a template
2. Click "Create Project" button
3. Enter project name: `MVP Test Project`
4. Click "Create Project"
5. **HAR:** Right-click POST `/api/templates/:id/instantiate-v5_1` request
6. Verify response contains `projectId`

### 4. Project Overview
**File:** `proofs/work-management/mvp-flow/05_project_overview.png`

**Steps:**
1. After instantiation, should auto-navigate to `/projects/:projectId`
2. **Screenshot:** Show project overview page with:
   - Project name visible
   - "Open Plan" button visible
   - Project health/status visible

### 5. Open Plan
**File:** `proofs/work-management/mvp-flow/06_open_plan.png`

**Steps:**
1. On Project Overview page
2. Click "Open Plan" button
3. Should navigate to `/work/projects/:projectId/plan`
4. **Screenshot:** Show plan view with phases and tasks

### 6. Programs/Portfolios Hidden
**File:** `proofs/work-management/mvp-flow/07_programs_hidden.png`

**Steps:**
1. Navigate to any workspace
2. **Screenshot:** Show sidebar with Programs and Portfolios links NOT visible
3. Verify only: Overview, Projects, Members are visible

### 7. Proof Documentation
**File:** `proofs/work-management/mvp-flow/mvp-flow.proof.md`

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
- [ ] Template Center shows "Create Project" as primary action
- [ ] Instantiate returns `projectId` in response
- [ ] Navigation to `/projects/:projectId` works
- [ ] Project Overview loads and shows project name
- [ ] "Open Plan" button navigates to `/work/projects/:projectId/plan`
- [ ] Plan view loads phases and tasks
- [ ] Programs and Portfolios are hidden in sidebar (feature flag false)
