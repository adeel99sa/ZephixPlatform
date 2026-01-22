# MVP Work Management Flow - Proof Documentation

## Summary

Locked MVP work management path: Workspace → Template → Project → Plan. Programs and Portfolios are hidden by default via feature flag.

## User Flow

1. **Create Workspace** - User creates workspace with only name and slug
2. **Template Center** - User browses templates and clicks "Create Project" (primary action)
3. **Instantiate Template** - Template is instantiated into a project, returns projectId
4. **Project Overview** - User lands on `/projects/:projectId`, sees project name and "Open Plan" button
5. **Open Plan** - User clicks "Open Plan", navigates to `/work/projects/:projectId/plan` to see phases and tasks

## Proof Artifacts

### 1. Workspace Create Success
**File:** `01_workspace_create_success.png`
- Shows success toast after creating workspace
- New workspace visible in sidebar/list

**HAR:** `02_workspace_create_success.har`
- Request: POST `/api/workspaces`
- Body: `{"name": "MVP Test Workspace", "slug": "mvp-test-workspace"}`
- Response: 201 Created with `workspaceId`

### 2. Template Center
**File:** `03_template_center.png`
- Shows Template Center with templates listed
- "Create Project" button visible as primary action on selected template

### 3. Template Instantiation
**HAR:** `04_instantiate_request.har`
- Request: POST `/api/templates/:templateId/instantiate-v5_1`
- Body: `{"projectName": "MVP Test Project"}`
- Headers: `x-workspace-id: <workspaceId>`
- Response: 201 Created with `{"data": {"projectId": "...", "projectName": "...", ...}}`

### 4. Project Overview
**File:** `05_project_overview.png`
- Shows `/projects/:projectId` page
- Project name visible in header
- "Open Plan" button visible
- Project health/status visible

### 5. Open Plan
**File:** `06_open_plan.png`
- Shows `/work/projects/:projectId/plan` page
- Phases and tasks visible
- Plan structure loaded from template

### 6. Programs/Portfolios Hidden
**File:** `07_programs_hidden.png`
- Shows sidebar with Programs and Portfolios links NOT visible
- Only visible: Overview, Projects, Members
- Feature flag `enableProgramsPortfolios` is false by default

## Key URLs Visited

1. `/login` - Login page
2. `/home` - Dashboard
3. `/workspaces` - Workspace selection (if needed)
4. `/templates` - Template Center
5. `/projects/:projectId` - Project Overview (after instantiation)
6. `/work/projects/:projectId/plan` - Project Plan (after clicking "Open Plan")

## Request Payloads

### Workspace Create
```json
{
  "name": "MVP Test Workspace",
  "slug": "mvp-test-workspace"
}
```

### Template Instantiate
```json
{
  "projectName": "MVP Test Project"
}
```

## Verification

✅ Workspace create sends only `name` and `slug` (no ownerId, organizationId, etc.)
✅ Workspace create succeeds (201 response)
✅ Template Center shows "Create Project" as primary action
✅ Instantiate returns `projectId` in response
✅ Navigation to `/projects/:projectId` works automatically
✅ Project Overview loads and shows project name
✅ "Open Plan" button navigates to `/work/projects/:projectId/plan`
✅ Plan view loads phases and tasks from template
✅ Programs and Portfolios are hidden in sidebar (feature flag false by default)
