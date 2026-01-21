# Quick Check - Pre-Test Verification

Before running the full proof pack, verify these code paths are correct:

## Route Verification

### Login Flow
- [ ] `LoginPage.tsx` redirects to `/home` only (no other redirects)
- [ ] `HomeView.tsx` checks `activeWorkspaceId` and redirects once to `/workspaces/{id}/home`

### Workspace Create Flow
- [ ] `WorkspaceCreateModal.tsx` order: `onClose()` → `setActiveWorkspaceId()` → `navigate()`
- [ ] Modal closes before navigation

### Workspace Home Flow
- [ ] `WorkspaceHomePage.tsx` fetches:
  - `GET /api/workspaces/{id}`
  - `GET /api/workspaces/{id}/role`
  - `GET /api/workspaces/{id}/summary`
- [ ] About section editable for OWNER/ADMIN only
- [ ] KPI tiles display real data

### Plus Menu Flow
- [ ] `SidebarWorkspaces.tsx` plus menu items:
  - Project → `/templates`
  - Template Center → `/templates`
  - Doc → creates doc → `/docs/{docId}`
  - Form → creates form → `/forms/{formId}/edit`

## Backend Endpoint Verification

### Workspace Endpoints
- [ ] `GET /api/workspaces/{id}` returns `{ data: workspace }`
- [ ] `GET /api/workspaces/{id}/role` returns `{ data: { role } }`
- [ ] `GET /api/workspaces/{id}/summary` returns `{ data: { projectsTotal, projectsInProgress, tasksTotal, tasksCompleted } }`
- [ ] `PATCH /api/workspaces/{id}` accepts `{ description?: string }`

### Docs/Forms Endpoints
- [ ] `POST /api/workspaces/{workspaceId}/docs` returns `{ data: { docId } }`
- [ ] `POST /api/workspaces/{workspaceId}/forms` returns `{ data: { formId } }`

## Common Issues to Watch For

1. **Redirect Chains:** Check Network tab for multiple redirects (should be only one)
2. **Undefined workspaceId:** Check request payloads for `workspaceId: undefined` or `workspaceId: null`
3. **Modal vs Page:** After workspace create, verify full page layout, not centered modal
4. **404 on Summary:** If summary endpoint returns 404, backend may not be deployed or route is wrong

## Test Account Setup

Before starting:
- [ ] Clear browser cache
- [ ] Clear localStorage
- [ ] Have test account credentials ready
- [ ] Backend is running and accessible
- [ ] Frontend is running and accessible
