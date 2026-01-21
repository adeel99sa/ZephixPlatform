# Phase 1-5 Regression Test Plan

**Date:** 2025-01-30
**Purpose:** Verify Phases 1-5 are wired together correctly before Phase 6

---

## Test Execution Summary

### ✅ Code Verification (Automated)
- [x] All routes exist and are properly configured
- [x] Permission guards are in place
- [x] API endpoints are protected
- [x] Frontend components conditionally render based on roles
- [x] Template instantiation includes risk and KPI creation

### ⏳ Manual Testing Required
The following tests require running the application and interacting with the UI:

---

## Test Suite

### 1. Admin and Roles

#### Test 1.1: Admin Access to Administration
**As:** Org Owner or Admin
**Steps:**
1. Log in as org owner or admin
2. Open Administration from the header (UserProfileDropdown)
3. Verify `/admin` route loads

**Expected:**
- ✅ Administration link visible in UserProfileDropdown (verified in code)
- ✅ `/admin` route exists and uses AdminLayout
- ✅ AdminGuard allows owner/admin roles

**Code Verification:**
- `UserProfileDropdown.tsx` shows Administration link for owner/admin
- `App.tsx` has `/admin/*` routes with AdminLayout
- `AdminGuard` allows both 'owner' and 'admin' roles

#### Test 1.2: Admin Overview
**As:** Org Owner or Admin
**Steps:**
1. Navigate to `/admin` or `/admin/overview`
2. Check Overview page loads

**Expected:**
- ✅ Overview page shows summary counts
- ✅ API endpoint `/api/admin/summary` returns data

**Code Verification:**
- `AdminOverviewPage.tsx` exists and fetches from `/api/admin/summary`
- `admin.controller.ts` has `GET /api/admin/summary` endpoint
- `admin.service.ts` implements summary calculation

#### Test 1.3: Admin Users Page
**As:** Org Owner or Admin
**Steps:**
1. Navigate to `/admin/users`
2. Verify users list

**Expected:**
- ✅ Users page shows only users in current organization
- ✅ API scoped to organizationId

**Code Verification:**
- `UsersListPage.tsx` exists
- `admin.controller.ts` `GET /api/admin/users` filters by organizationId
- `admin.service.ts` queries users scoped to organization

#### Test 1.4: Admin Workspaces Page
**As:** Org Owner or Admin
**Steps:**
1. Navigate to `/admin/workspaces`
2. Verify workspaces list
3. Try creating a workspace

**Expected:**
- ✅ Workspaces page shows only org workspaces
- ✅ Create workspace functionality works

**Code Verification:**
- `WorkspacesListPage.tsx` exists
- `admin.controller.ts` `GET /api/admin/workspaces` filters by organizationId
- `CreateWorkspaceModal.tsx` exists

#### Test 1.5: Member/Viewer Cannot Access Admin
**As:** Member or Viewer
**Steps:**
1. Log in as member or viewer
2. Check header for Administration link
3. Try direct navigation to `/admin/*`

**Expected:**
- ✅ No Administration link in header
- ✅ Direct hit to `/admin/*` returns 403 or redirects

**Code Verification:**
- `UserProfileDropdown.tsx` conditionally shows Administration only for owner/admin
- `AdminGuard` blocks member/viewer (returns 403)
- `AdminRoute` component checks role before rendering

---

### 2. Workspace Settings and Permissions

#### Test 2.1: Workspace Settings Access
**As:** Admin or Owner
**Steps:**
1. Open a workspace
2. Navigate to Workspace Settings (from workspace menu or Cmd+K)
3. Verify settings page loads

**Expected:**
- ✅ Workspace Settings accessible from workspace context
- ✅ Route `/workspaces/:id/settings` exists
- ✅ `WorkspaceSettingsPage.tsx` renders

**Code Verification:**
- `App.tsx` has route `/workspaces/:id/settings`
- `WorkspaceSettingsPage.tsx` exists with tabs: General, Members, Permissions, Activity
- Command Palette shows "Workspace Settings" when workspace is active

#### Test 2.2: General Tab - Edit Workspace
**As:** Admin or Owner
**Steps:**
1. In Workspace Settings > General tab
2. Change name, description, default methodology
3. Change owner
4. Save

**Expected:**
- ✅ Changes persist
- ✅ API endpoint `PATCH /api/workspaces/:id/settings` works
- ✅ Permission check: `edit_workspace_settings` or owner/admin

**Code Verification:**
- `GeneralTab.tsx` has form fields for name, description, methodology, owner
- `workspaces.controller.ts` has `PATCH /api/workspaces/:id/settings` endpoint
- `@RequireWorkspacePermission('edit_workspace_settings')` guard in place

#### Test 2.3: Members Tab - Manage Members
**As:** Admin or Owner
**Steps:**
1. In Workspace Settings > Members tab
2. Change a member role
3. Add a member
4. Try to remove or demote the last owner

**Expected:**
- ✅ Role changes work
- ✅ Adding members works
- ✅ System blocks removing/demoting last owner

**Code Verification:**
- `MembersTab.tsx` has role dropdowns and add member functionality
- `workspace-members.service.ts` has `updateMemberRole` method
- `workspace-members.service.ts` has check to prevent removing last owner
- `workspaces.controller.ts` has `PATCH /api/workspaces/:id/members/:userId` endpoint

#### Test 2.4: Permissions Tab - Edit Matrix
**As:** Admin or Owner
**Steps:**
1. In Workspace Settings > Permissions tab
2. Change a few matrix checkboxes
3. Save

**Expected:**
- ✅ Changes persist to `permissionsConfig`
- ✅ API endpoint `PATCH /api/workspaces/:id/settings` accepts `permissionsConfig`

**Code Verification:**
- `PermissionsTab.tsx` has permission matrix UI
- `workspaces.controller.ts` accepts `permissionsConfig` in update DTO
- `workspaces.service.ts` saves `permissionsConfig` to workspace entity

#### Test 2.5: Member Cannot Edit Settings
**As:** Plain Member (with restricted permissions)
**Steps:**
1. Open workspace where member has limited permissions
2. Go to Workspace Settings
3. Try to edit General tab
4. Try to edit Permissions tab

**Expected:**
- ✅ If `edit_workspace_settings` disabled, General and Permissions tabs are read-only
- ✅ Backend rejects edits with 403

**Code Verification:**
- `GeneralTab.tsx` checks permissions before allowing edits
- `PermissionsTab.tsx` checks permissions before allowing edits
- `RequireWorkspacePermissionGuard` enforces `edit_workspace_settings` permission
- Backend returns 403 if permission denied

---

### 3. Template Center

#### Test 3.1: Template Center Access
**As:** Admin or Owner
**Steps:**
1. Navigate to `/templates`
2. Verify Template Center loads

**Expected:**
- ✅ Template Center page loads
- ✅ Shows list of templates

**Code Verification:**
- `TemplateCenter.tsx` exists
- Route `/templates` configured in `App.tsx`
- `GET /api/templates` endpoint exists

#### Test 3.2: Template Filters
**As:** Admin or Owner
**Steps:**
1. In Template Center, use search filter
2. Use methodology filter
3. Verify results filter correctly

**Expected:**
- ✅ Search filters templates by name/description
- ✅ Methodology filter filters by methodology
- ✅ API accepts query parameters: `search`, `methodology`

**Code Verification:**
- `TemplateCenter.tsx` has search input and methodology dropdown
- `templates.controller.ts` `GET /api/templates` accepts `search` and `methodology` query params
- `templates.service.ts` `findAll` method filters by these params

#### Test 3.3: Template Detail and Edit
**As:** Admin or Owner
**Steps:**
1. Click a template to open detail page
2. Edit metadata (name, description, category)
3. Edit structure (phases, tasks)
4. Save
5. Refresh page

**Expected:**
- ✅ Template detail page loads at `/templates/:id`
- ✅ Edits persist
- ✅ Refresh shows updated data

**Code Verification:**
- `TemplateDetailPage.tsx` exists
- Route `/templates/:id` configured
- `PATCH /api/templates/:id` endpoint exists
- `templates.service.ts` `update` method saves changes

---

### 4. Project Creation from Templates

#### Test 4.1: Use Template to Create Project
**As:** Admin or Owner
**Steps:**
1. From Template Center, click "Use in workspace" on a template
2. Select a workspace
3. Enter project name
4. Create project

**Expected:**
- ✅ Modal opens with workspace selection
- ✅ Project is created
- ✅ User lands on new project page
- ✅ Project is in correct workspace

**Code Verification:**
- `UseTemplateModal.tsx` exists
- `POST /api/templates/:id/instantiate` endpoint exists
- `TemplatesInstantiateService.instantiate` creates project
- Navigation to `/projects/:id` after creation

#### Test 4.2: No Other Project Creation Paths
**As:** Any User
**Steps:**
1. Check workspace projects list
2. Check AI Dashboard
3. Check any other pages

**Expected:**
- ✅ No "+ New Project" buttons outside Template Center
- ✅ All project creation goes through templates

**Code Verification:**
- `WorkspaceProjectsList.tsx` "+ New" button redirects to `/templates`
- `AIDashboard.tsx` has no "+ New Project" button
- No other project creation modals in active use

---

### 5. Risk and KPI Presets (Phase 5)

#### Test 5.1: Add Risk and KPI Presets
**As:** Admin or Owner
**Steps:**
1. On template detail page
2. Add a few risk presets (title, severity, probability)
3. Add a few KPI presets (name, metricType, unit, direction)
4. Save template
5. Refresh page

**Expected:**
- ✅ Risk presets section visible
- ✅ KPI presets section visible
- ✅ Add buttons work
- ✅ Presets save and load correctly

**Code Verification:**
- `TemplateDetailPage.tsx` has Risk Presets and KPI Presets sections
- `handleAddRisk` and `handleAddKpi` functions exist
- `handleSave` includes `riskPresets` and `kpiPresets` in update payload
- `PATCH /api/templates/:id` accepts presets
- `loadTemplate` loads presets from API response

#### Test 5.2: Instantiate Project with Presets
**As:** Admin or Owner
**Steps:**
1. Use template with risk and KPI presets to create a project
2. Verify project is created
3. Check backend (or existing UI) for risks and KPIs

**Expected:**
- ✅ Project is created
- ✅ Risks exist with `source = 'template_preset'`
- ✅ KPI metrics exist and are tied to project

**Code Verification:**
- `TemplatesInstantiateService.instantiate` creates risks from `template.riskPresets`
- `TemplatesInstantiateService.instantiate` creates KPI metrics from `template.kpiPresets`
- Risk entity has `source` field set to `'template_preset'`
- ProjectMetrics created with `metricCategory = 'template_preset'`

#### Test 5.3: Member Cannot Edit Presets
**As:** Member or Viewer
**Steps:**
1. Open template detail page
2. Check Risk Presets and KPI Presets sections
3. Try PATCH with presets via client/dev tools

**Expected:**
- ✅ Presets visible but read-only
- ✅ No Add, Edit, or Delete buttons visible
- ✅ PATCH with presets returns 403

**Code Verification:**
- `TemplateDetailPage.tsx` checks `canEdit` (owner/admin only) before showing edit controls
- `templates.controller.ts` `PATCH /api/templates/:id` checks role before allowing preset updates
- Returns 403 ForbiddenException if member/viewer tries to update presets

---

### 6. Cross Role Check on Project Creation

#### Test 6.1: Admin Can Create Project
**As:** Admin (with `create_project_in_workspace` permission)
**Steps:**
1. Use template to create project in workspace
2. Verify success

**Expected:**
- ✅ Project creation succeeds
- ✅ Workspace permission check passes

**Code Verification:**
- `TemplatesInstantiateService.instantiate` checks `create_project_in_workspace` permission
- `WorkspacePermissionService.isAllowed` resolves permission correctly
- Admin/owner roles have permission by default

#### Test 6.2: Member Cannot Create Project (Permission Denied)
**As:** Member (without `create_project_in_workspace` permission)
**Steps:**
1. Try to create project in workspace via "Use in workspace"
2. Verify modal shows
3. Submit form

**Expected:**
- ✅ Modal shows (frontend allows)
- ✅ API call fails with 403
- ✅ Clear error message shown
- ✅ No project created

**Code Verification:**
- `UseTemplateModal.tsx` shows workspace selection
- `POST /api/templates/:id/instantiate` checks permission
- `TemplatesInstantiateService.instantiate` throws ForbiddenException if permission denied
- Frontend shows error toast with message

---

## Code Verification Results

### ✅ Routes and Navigation
- [x] `/admin/*` routes exist with AdminLayout
- [x] `/workspaces/:id/settings` route exists
- [x] `/templates` and `/templates/:id` routes exist
- [x] Command Palette shows Workspace Settings when workspace active

### ✅ Permission Guards
- [x] AdminGuard allows owner/admin, blocks member/viewer
- [x] RequireWorkspacePermissionGuard enforces workspace permissions
- [x] Template preset editing requires org owner/admin role
- [x] Project creation requires `create_project_in_workspace` permission

### ✅ API Endpoints
- [x] `/api/admin/summary` - Admin overview
- [x] `/api/admin/users` - User management (org-scoped)
- [x] `/api/admin/workspaces` - Workspace management (org-scoped)
- [x] `/api/workspaces/:id/settings` - Workspace settings (permission-protected)
- [x] `/api/workspaces/:id/members/:userId` - Member management (permission-protected)
- [x] `/api/templates` - Template list (with filters)
- [x] `/api/templates/:id` - Template detail
- [x] `/api/templates/:id` PATCH - Template update (preset editing requires admin)
- [x] `/api/templates/:id/instantiate` - Project creation (permission-protected)

### ✅ Frontend Components
- [x] UserProfileDropdown conditionally shows Administration
- [x] AdminLayout and admin pages exist
- [x] WorkspaceSettingsPage with all tabs
- [x] TemplateCenter with filters
- [x] TemplateDetailPage with risk and KPI presets
- [x] UseTemplateModal for project creation

### ✅ Business Logic
- [x] Last owner protection in workspace members
- [x] Permission matrix stored in workspace.permissionsConfig
- [x] Template instantiation creates risks and KPIs
- [x] Risk source tracking (`source = 'template_preset'`)
- [x] KPI metrics linked to projects

---

## Manual Testing Checklist

### Prerequisites
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Database migrations run (including Phase 5 migration)
- [ ] Test users created (owner, admin, member, viewer)
- [ ] Test workspaces created with different permission configurations

### Test Execution Order

1. **Admin Access** (Tests 1.1-1.5)
   - [ ] Log in as owner/admin
   - [ ] Verify Administration access
   - [ ] Verify Overview, Users, Workspaces pages
   - [ ] Log in as member/viewer
   - [ ] Verify no Administration access

2. **Workspace Settings** (Tests 2.1-2.5)
   - [ ] As admin: Edit General, Members, Permissions tabs
   - [ ] Verify last owner protection
   - [ ] As member: Verify read-only when permissions restricted

3. **Template Center** (Tests 3.1-3.3)
   - [ ] Navigate to Template Center
   - [ ] Test filters (search, methodology)
   - [ ] Edit template and verify persistence

4. **Project Creation** (Tests 4.1-4.2)
   - [ ] Create project from template
   - [ ] Verify no other creation paths exist

5. **Risk and KPI Presets** (Tests 5.1-5.3)
   - [ ] Add presets as admin
   - [ ] Instantiate project and verify risks/KPIs created
   - [ ] Verify member cannot edit presets

6. **Cross Role Project Creation** (Tests 6.1-6.2)
   - [ ] Admin creates project (should succeed)
   - [ ] Member without permission tries (should fail with 403)

---

## Expected Outcomes

If all tests pass:
- ✅ Phases 1-5 are correctly wired together
- ✅ Permissions are enforced at both frontend and backend
- ✅ Template instantiation works end-to-end
- ✅ Risk and KPI presets are created correctly
- ✅ Safe to proceed with Phase 6

If any test fails:
- ⚠️ Document the failure
- ⚠️ Fix the issue before proceeding to Phase 6
- ⚠️ Re-run regression tests

---

## Notes

- All code paths have been verified to exist
- Permission guards are in place
- API endpoints are protected
- Frontend conditionally renders based on roles
- Manual testing is required to verify end-to-end behavior

**Status:** Ready for manual testing execution


















