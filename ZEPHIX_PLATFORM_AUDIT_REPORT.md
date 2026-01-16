# Zephix Platform Audit Report
## Senior Solution Architect Assessment

**Date:** 2025-01-27
**Scope:** Work Management System, Template Center, Admin Workflows
**Methodology:** Evidence-based code and documentation review

---

## Executive Summary

### What is Complete

**Work Management System:**
- ✅ Core entities (WorkTask, WorkPhase) with proper tenancy
- ✅ Backend controllers with workspace scoping
- ✅ TenantAwareRepository pattern enforced
- ✅ Basic frontend routes and components exist
- ⚠️ **Gap:** Frontend API clients use legacy endpoints (`/tasks`, `/projects/:id/tasks`) that don't match backend routes (`/work/tasks`)

**Template Center:**
- ✅ Template entity with v1 fields (lockState, isDefault, etc.)
- ✅ Template blocks and lego blocks system
- ✅ Backend controllers with org scoping
- ✅ Template instantiation v5.1 (creates WorkPhase/WorkTask)
- ⚠️ **Gap:** Frontend uses mixed API patterns (some `/api/templates`, some `/templates`)

**Admin Workflows:**
- ✅ Admin guard and role enforcement
- ✅ Admin controller with stats, users, workspaces endpoints
- ✅ Frontend admin routes and pages exist
- ⚠️ **Gap:** Some admin endpoints return 404 (e.g., `/admin/organization/overview`)

### What Blocks End-to-End Usage

1. **API Contract Mismatch:** Frontend calls `/projects/:id/tasks` but backend serves `/work/tasks` with workspace header
2. **Missing Workspace Header:** Frontend API clients don't consistently send `x-workspace-id` header
3. **Incomplete Role Enforcement:** Some endpoints check workspace access but don't enforce role-based filtering for VIEWER
4. **Template Apply Flow:** Frontend template center exists but instantiation may fail if workspace context missing

### What is Risky

1. **Multiple Task Entities:** `tasks` table (legacy) and `work_tasks` table (Phase 5.1) coexist - risk of data inconsistency
2. **Header Trusting:** Some controllers validate `x-workspace-id` format but don't verify user has access before using it
3. **Service Layer Bypass:** Some services use direct TypeORM repositories instead of TenantAwareRepository
4. **Status Flow Not Enforced:** Task status transitions not validated in service layer

### Minimal Changes for MVP Readiness

1. **Fix API Contracts:** Align frontend API clients with backend routes (`/work/tasks` not `/tasks`)
2. **Add Workspace Header:** Ensure all work management API calls include `x-workspace-id`
3. **Complete Role Filtering:** Add VIEWER role filtering to list endpoints
4. **Remove Legacy Task Entity:** Migrate any remaining `tasks` table usage to `work_tasks`

---

## Deliverable 1: End-to-End Flow Maps

### A. Work Management Flow Map

#### Entry Points in UI
- **Route:** `/projects/:projectId` → `ProjectOverviewPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:110`
  - **Component:** `zephix-frontend/src/features/projects/overview/ProjectOverviewPage.tsx`
- **Route:** `/work/projects/:projectId/plan` → `ProjectPlanView`
  - **Evidence:** `zephix-frontend/src/App.tsx:111`
  - **Component:** `zephix-frontend/src/views/work-management/ProjectPlanView.tsx`

#### Create Workspace or Select Workspace
- **Route:** `/workspaces` → `WorkspacesIndexPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:112`
- **Backend:** `GET /api/workspaces` → `WorkspacesController.list()`
  - **Evidence:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts`
- **Workspace Selection:** Stored in `workspace.store.ts` and sent as `x-workspace-id` header
  - **Evidence:** `zephix-frontend/src/state/workspace.store.ts`

#### Create Project
- **Frontend:** Project creation via template instantiation or direct creation
- **Backend:** `POST /api/projects` (not found in work management module, likely in projects module)
- **Template Instantiation:** `POST /api/templates/:templateId/instantiate-v5_1`
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:363-448`

#### Create Work Items and Tasks
- **Frontend API Call:** `api.get('/projects/${projectId}/tasks')` (LEGACY - doesn't match backend)
  - **Evidence:** `zephix-frontend/src/components/tasks/TaskList.tsx:41`
- **Backend Route:** `POST /api/work/tasks` (requires `x-workspace-id` header)
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:130-168`
- **Service:** `WorkTasksService.createTask()` uses TenantAwareRepository
  - **Evidence:** `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:59-141`

#### Assign Work
- **Backend:** `PATCH /api/work/tasks/:id` with `assigneeUserId` in body
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:483-533`
- **Service:** Updates task and records activity
  - **Evidence:** `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:474-534`

#### Status Updates and Transitions
- **Backend:** `PATCH /api/work/tasks/:id` or `PATCH /api/work/tasks/bulk`
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:171-211, 483-533`
- **Status Enum:** `BACKLOG | TODO | IN_PROGRESS | BLOCKED | IN_REVIEW | DONE | CANCELED`
  - **Evidence:** `zephix-backend/src/modules/work-management/entities/work-task.entity.ts:52-56`
- **⚠️ Risk:** No service-layer validation of valid status transitions

#### Comments and Activity
- **Add Comment:** `POST /api/work/tasks/:id/comments`
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:318-361`
- **List Comments:** `GET /api/work/tasks/:id/comments`
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:364-400`
- **Activity Feed:** `GET /api/work/tasks/:id/activity`
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:403-442`

#### Views and Filters
- **List Tasks:** `GET /api/work/tasks` with query params (projectId, status, assigneeUserId, search)
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:79-127`
- **Service:** Filters by workspaceId and organizationId via TenantAwareRepository
  - **Evidence:** `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:143-207`

#### Rollups and Health
- **Project Overview:** `GET /api/work/projects/:projectId/overview`
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-plan.controller.ts:158-208`
- **Project Health:** `ProjectHealthService` (not exposed as endpoint, used internally)
  - **Evidence:** `zephix-backend/src/modules/work-management/services/project-health.service.ts`

#### Permissions Behavior
- **Admin:** Full access via `WorkspaceRoleGuardService.requireWorkspaceWrite()`
  - **Evidence:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:161-164`
- **Member:** Write access via same guard
- **Viewer:** Read-only (no write guard, but service may filter)
  - **⚠️ Gap:** No explicit VIEWER filtering in `listTasks()` service method

---

### B. Template Center Flow Map

#### Browse Templates
- **Frontend Route:** `/templates` → `TemplateCenter`
  - **Evidence:** `zephix-frontend/src/App.tsx:122`
- **Component:** `zephix-frontend/src/views/templates/TemplateCenter.tsx`
- **Backend:** `GET /api/templates` with filters
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:114-134`
- **Service:** `TemplatesService.listV1()` uses TenantAwareRepository
  - **Evidence:** `zephix-backend/src/modules/templates/services/templates.service.ts:520-600`

#### Template Detail View
- **Backend:** `GET /api/templates/:id`
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:298-301`
- **Service:** `TemplatesService.getV1()` includes blocks if requested
  - **Evidence:** `zephix-backend/src/modules/templates/services/templates.service.ts:614-650`

#### Create Template
- **Backend:** `POST /api/templates`
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:103-106`
- **Service:** `TemplatesService.createV1()` sets `createdById`, defaults `lockState` to UNLOCKED
  - **Evidence:** `zephix-backend/src/modules/templates/services/templates.service.ts:698-720`

#### Edit Template
- **Backend:** `PUT /api/templates/:id` or `PATCH /api/templates/:id`
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:308-346`
- **Guard:** `TemplateLockGuard` blocks writes if `lockState = 'LOCKED'`
  - **Evidence:** `zephix-backend/src/modules/templates/guards/template-lock.guard.ts`

#### Validate Template
- **No explicit validation endpoint found**
- **Validation happens during instantiation**

#### Apply Template to Create Project, Phases, Tasks
- **Backend:** `POST /api/templates/:templateId/instantiate-v5_1`
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:363-448`
- **Service:** `TemplatesInstantiateV51Service.instantiateV51()`
  - **Evidence:** `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts`
- **Creates:** Project → WorkPhases → WorkTasks
- **Enforces:** Workspace and organization scoping
  - **Evidence:** `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts:55-142`

#### Post-Apply Behavior
- **Returns:** Project ID, name, phase count, task count
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:438-447`
- **Frontend:** Redirects to project overview
  - **Evidence:** `zephix-frontend/src/features/templates/api.ts` (instantiateV51 function)

#### Permissions Behavior
- **Admin:** Can create, edit, lock/unlock templates
- **Member:** Can view and apply templates
- **Viewer:** Can view templates (read-only)
- **⚠️ Gap:** No explicit VIEWER filtering in template list service

---

### C. Admin Workflows Flow Map

#### Admin Login and Landing
- **Route:** `/admin` → `AdminDashboardPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:147`
- **Guard:** `AdminRoute` component checks `isAdminUser()`
  - **Evidence:** `zephix-frontend/src/routes/AdminRoute.tsx:18-103`
- **Backend Guard:** `AdminGuard` checks platformRole === 'ADMIN' or role === 'admin'/'owner'
  - **Evidence:** `zephix-backend/src/admin/guards/admin.guard.ts:6-25`

#### Manage Users
- **Route:** `/admin/users` → `AdminUsersPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:152`
- **Backend:** `GET /api/admin/users` with pagination, search, role filters
  - **Evidence:** `zephix-backend/src/admin/admin.controller.ts` (lines 200-400, not shown in full read)
- **Update Role:** `PATCH /api/admin/users/:userId/role`
  - **Evidence:** `zephix-backend/src/admin/admin.controller.ts` (referenced in ADMIN_CONSOLE_AUDIT_REPORT.md:86)
- **Delete User:** `DELETE /api/admin/users/:userId` (soft delete)
  - **Evidence:** `zephix-backend/src/admin/admin.controller.ts` (referenced in ADMIN_CONSOLE_AUDIT_REPORT.md:87)

#### Manage Organizations
- **Route:** `/admin/org` → `AdminOrganizationPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:151`
- **⚠️ Gap:** Backend endpoint `GET /admin/organization/overview` returns 404
  - **Evidence:** `ADMIN_CONSOLE_AUDIT_REPORT.md:65`

#### Manage Workspaces
- **Route:** `/admin/workspaces` → `AdminWorkspacesPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:166`
- **Backend:** `GET /api/admin/workspaces`
  - **Evidence:** `zephix-backend/src/admin/admin.controller.ts` (referenced in admin service)

#### Manage Templates
- **Route:** `/admin/templates` → `AdminTemplatesPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:161`
- **Backend:** `GET /admin/templates` (admin-only controller)
  - **Evidence:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:575-590`

#### Manage Trash, Restore and Purge
- **Route:** `/admin/trash` → `AdminTrashPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:168`
- **⚠️ Gap:** Backend endpoints for trash/restore not found in audit

#### Manage Usage and Billing Stubs
- **Route:** `/admin/usage` → `AdminUsagePage`
  - **Evidence:** `zephix-frontend/src/App.tsx:156`
- **Route:** `/admin/billing` → `AdminBillingPage`
  - **Evidence:** `zephix-frontend/src/App.tsx:157`
- **⚠️ Gap:** Backend endpoints not verified in this audit

#### Permissions and Guard Enforcement
- **All Admin Routes:** Protected by `AdminGuard` + `JwtAuthGuard`
  - **Evidence:** `zephix-backend/src/admin/admin.controller.ts:38`
- **Guard Logic:** Checks `platformRole === 'ADMIN'` or legacy `role === 'admin'/'owner'`
  - **Evidence:** `zephix-backend/src/admin/guards/admin.guard.ts:14-21`

---

## Deliverable 2: Build Status Matrix

### Work Management System

| Capability | Backend | Frontend | Data Model | Tests | Evidence | Gaps | MVP Work |
|------------|---------|----------|------------|-------|-----------|------|----------|
| List tasks | ✅ Complete | ⚠️ Partial | ✅ Complete | ⚠️ Partial | `work-tasks.controller.ts:79-127`, `TaskList.tsx:37-59` | Frontend calls `/projects/:id/tasks` but backend serves `/work/tasks` | Fix API client to use `/work/tasks` with workspace header |
| Create task | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-tasks.controller.ts:130-168`, `CreateTaskForm.tsx` | Frontend may not send workspace header | Add workspace header to API calls |
| Update task | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-tasks.controller.ts:483-533` | Same API contract issue | Fix API client |
| Delete task | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-tasks.controller.ts:536-573` | Same API contract issue | Fix API client |
| Task dependencies | ✅ Complete | ❌ Missing | ✅ Complete | ✅ Complete | `work-tasks.controller.ts:214-315`, `task-dependencies.service.spec.ts` | No frontend UI for dependencies | Add dependency UI (low priority for MVP) |
| Task comments | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-tasks.controller.ts:318-400` | Frontend may not use these endpoints | Wire up comment endpoints |
| Task activity feed | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `work-tasks.controller.ts:403-442` | No frontend UI | Add activity feed UI (low priority) |
| Status transitions | ⚠️ Partial | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-tasks.service.ts:474-534` | No validation of valid transitions | Add status transition validation |
| Assign work | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-tasks.controller.ts:483-533` | API contract issue | Fix API client |
| Bulk status update | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `work-tasks.controller.ts:171-211` | No frontend UI | Add bulk actions UI (low priority) |
| Project overview | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-plan.controller.ts:158-208` | Frontend may not use this endpoint | Wire up overview endpoint |
| Project health | ⚠️ Partial | ❌ Missing | ✅ Complete | ❌ Missing | `project-health.service.ts` | Not exposed as endpoint | Expose health endpoint or use internally |
| Phase management | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `work-phases.controller.ts` | Frontend may not use phase endpoints | Wire up phase endpoints |
| Role-based filtering | ⚠️ Partial | N/A | N/A | ❌ Missing | `work-tasks.service.ts:143-207` | VIEWER role not explicitly filtered | Add VIEWER filtering to list methods |

### Template Center

| Capability | Backend | Frontend | Data Model | Tests | Evidence | Gaps | MVP Work |
|------------|---------|----------|------------|-------|-----------|------|----------|
| Browse templates | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | `templates.controller.ts:114-134`, `TemplateCenter.tsx` | None | None |
| Template detail | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `templates.controller.ts:298-301`, `templates.service.spec.ts` | None | None |
| Create template | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `templates.controller.ts:103-106` | Frontend may not have create UI | Add create template UI (admin only) |
| Edit template | ✅ Complete | ⚠️ Partial | ✅ Complete | ❌ Missing | `templates.controller.ts:308-346` | Lock guard enforced, but frontend may not show lock state | Show lock state in UI |
| Validate template | ❌ Missing | ❌ Missing | N/A | ❌ Missing | N/A | No validation endpoint | Add validation (low priority) |
| Apply template | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `templates.controller.ts:363-448`, `TemplateCenter.tsx` | Workspace context must be present | Ensure workspace context in apply flow |
| Clone template | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `template-actions.controller.ts:16-24` | No frontend UI | Add clone button (low priority) |
| Lock/unlock template | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `template-actions.controller.ts:32-45` | No frontend UI | Add lock/unlock UI (admin only) |
| Set default template | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `template-actions.controller.ts:25-31` | No frontend UI | Add default toggle (admin only) |
| Template blocks | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `template-blocks.controller.ts` | No frontend UI for block management | Add block management UI (low priority) |
| Template recommendations | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `templates.controller.ts:141-230`, `TemplateCenter.tsx` | None | None |
| Template preview | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `templates.controller.ts:237-290` | None | None |
| Role-based access | ⚠️ Partial | N/A | N/A | ❌ Missing | `templates.service.ts:520-600` | VIEWER role not explicitly filtered | Add VIEWER filtering |

### Admin Workflows

| Capability | Backend | Frontend | Data Model | Tests | Evidence | Gaps | MVP Work |
|------------|---------|----------|------------|-------|-----------|------|----------|
| Admin dashboard | ✅ Complete | ✅ Complete | N/A | ⚠️ Partial | `admin.controller.ts:69-105`, `AdminDashboardPage.tsx`, `admin.controller.spec.ts` | None | None |
| System health | ✅ Complete | ✅ Complete | N/A | ❌ Missing | `admin.controller.ts:107-144` | None | None |
| List users | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `admin.controller.ts` (referenced), `AdminUsersPage.tsx` | None | None |
| Create user | ⚠️ Partial | ⚠️ Partial | ✅ Complete | ❌ Missing | `admin.controller.ts` (referenced) | May not be fully implemented | Verify and complete |
| Update user role | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `admin.controller.ts` (referenced) | None | None |
| Delete user | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `admin.controller.ts` (referenced) | None | None |
| List workspaces | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `admin.controller.ts` (referenced) | None | None |
| Create workspace | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `admin.controller.ts` (referenced) | None | None |
| List templates (admin) | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `templates.controller.ts:575-590` | None | None |
| Organization overview | ❌ Missing | ⚠️ Partial | N/A | ❌ Missing | `ADMIN_CONSOLE_AUDIT_REPORT.md:65` | Backend endpoint 404 | Implement `/admin/organization/overview` |
| Teams management | ✅ Complete | ✅ Complete | ✅ Complete | ❌ Missing | `admin.controller.ts` (teams endpoints) | None | None |
| Trash/restore | ❌ Missing | ⚠️ Partial | ✅ Complete | ❌ Missing | `AdminTrashPage.tsx` exists | Backend endpoints not found | Implement trash endpoints |
| Usage metrics | ⚠️ Partial | ⚠️ Partial | N/A | ❌ Missing | `AdminUsagePage.tsx` exists | Backend may be stub | Verify and implement |
| Billing stubs | ⚠️ Partial | ⚠️ Partial | N/A | ❌ Missing | `AdminBillingPage.tsx` exists | Backend may be stub | Verify and implement |

---

## Deliverable 3: API and Guard Inventory

### Work Management APIs

| Method | Path | Guards | WorkspaceId Source | OrganizationId Enforcement | TenantAwareRepository | Risk | Fix |
|--------|------|--------|-------------------|---------------------------|----------------------|------|-----|
| GET | `/api/work/tasks` | JwtAuthGuard | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTask) | Medium | Add VIEWER filtering |
| POST | `/api/work/tasks` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTask) | Low | None |
| PATCH | `/api/work/tasks/bulk` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTask) | Low | None |
| POST | `/api/work/tasks/:id/dependencies` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTaskDependency) | Low | None |
| DELETE | `/api/work/tasks/:id/dependencies` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTaskDependency) | Low | None |
| POST | `/api/work/tasks/:id/comments` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (TaskComment) | Low | None |
| GET | `/api/work/tasks/:id/comments` | JwtAuthGuard | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (TaskComment) | Medium | Add VIEWER filtering |
| GET | `/api/work/tasks/:id/activity` | JwtAuthGuard | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (TaskActivity) | Medium | Add VIEWER filtering |
| GET | `/api/work/tasks/:id` | JwtAuthGuard | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTask) | Medium | Add VIEWER filtering |
| PATCH | `/api/work/tasks/:id` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTask) | High | Add status transition validation |
| DELETE | `/api/work/tasks/:id` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTask) | Low | None |
| GET | `/api/work/projects/:projectId/plan` | JwtAuthGuard | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkPhase, WorkTask) | Medium | Add VIEWER filtering |
| GET | `/api/work/projects/:projectId/overview` | JwtAuthGuard | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (WorkTask, WorkPhase) | Medium | Add VIEWER filtering |
| POST | `/api/work/projects/:projectId/start` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (Project) | Low | None |

**Evidence:**
- Controllers: `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`
- Services: `zephix-backend/src/modules/work-management/services/work-tasks.service.ts`
- Guards: `zephix-backend/src/modules/workspace-access/workspace-role-guard.service.ts`

### Template Center APIs

| Method | Path | Guards | WorkspaceId Source | OrganizationId Enforcement | TenantAwareRepository | Risk | Fix |
|--------|------|--------|-------------------|---------------------------|----------------------|------|-----|
| GET | `/api/templates` | JwtAuthGuard | Optional header | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Medium | Add VIEWER filtering |
| GET | `/api/templates/recommendations` | JwtAuthGuard | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| GET | `/api/templates/:templateId/preview-v5_1` | JwtAuthGuard, WorkspaceRoleGuard (read) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (ProjectTemplate) | Low | None |
| GET | `/api/templates/:id` | JwtAuthGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Medium | Add VIEWER filtering |
| POST | `/api/templates` | JwtAuthGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| PUT | `/api/templates/:id` | JwtAuthGuard, TemplateLockGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| PATCH | `/api/templates/:id` | JwtAuthGuard, TemplateLockGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Medium | Org role check for riskPresets/kpiPresets |
| DELETE | `/api/templates/:id` | JwtAuthGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| POST | `/api/templates/:templateId/instantiate-v5_1` | JwtAuthGuard, WorkspaceRoleGuard (write) | Header `x-workspace-id` | `tenantContext.assertOrganizationId()` | ✅ Yes (Project, WorkPhase, WorkTask) | Low | None |
| POST | `/api/templates/:id/instantiate` | JwtAuthGuard | Body `workspaceId` | `user.organizationId` | ⚠️ Partial (legacy) | High | Migrate to v5.1 endpoint |
| POST | `/api/templates/:id/clone` | JwtAuthGuard, TemplateLockGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| POST | `/api/templates/:id/default` | JwtAuthGuard, RequireOrgRoleGuard (admin) | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| POST | `/api/templates/:id/lock` | JwtAuthGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| POST | `/api/templates/:id/unlock` | JwtAuthGuard, RequireOrgRoleGuard (admin) | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| POST | `/api/templates/:id/archive` | JwtAuthGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| POST | `/api/templates/:id/blocks` | JwtAuthGuard, TemplateLockGuard, BlockRoleGuard | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (TemplateBlock) | Low | None |
| GET | `/admin/templates` | JwtAuthGuard, RequireOrgRoleGuard (admin) | N/A (org-scoped) | `tenantContext.assertOrganizationId()` | ✅ Yes (Template) | Low | None |
| POST | `/admin/templates/:id/apply` | JwtAuthGuard, RequireOrgRoleGuard (admin) | Body `workspaceId` | `user.organizationId` | ⚠️ Partial (legacy) | High | Migrate to v5.1 endpoint |

**Evidence:**
- Controllers: `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
- Services: `zephix-backend/src/modules/templates/services/templates.service.ts`
- Guards: `zephix-backend/src/modules/templates/guards/template-lock.guard.ts`

### Admin APIs

| Method | Path | Guards | WorkspaceId Source | OrganizationId Enforcement | TenantAwareRepository | Risk | Fix |
|--------|------|--------|-------------------|---------------------------|----------------------|------|-----|
| GET | `/api/admin/stats` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | Low | None |
| GET | `/api/admin/health` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | Low | None |
| GET | `/api/admin/org/summary` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | Low | None |
| GET | `/api/admin/users` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | Low | None |
| GET | `/api/admin/users/:userId` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | Low | None |
| PATCH | `/api/admin/users/:userId/role` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | Low | None |
| DELETE | `/api/admin/users/:userId` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | Low | None |
| GET | `/api/admin/workspaces` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | ✅ Yes (Workspace) | Low | None |
| POST | `/api/admin/workspaces` | JwtAuthGuard, AdminGuard | Body | `getAuthContext(req).organizationId` | ✅ Yes (Workspace) | Low | None |
| GET | `/api/admin/organization/overview` | JwtAuthGuard, AdminGuard | N/A | `getAuthContext(req).organizationId` | N/A | High | **MISSING - Returns 404** |

**Evidence:**
- Controller: `zephix-backend/src/admin/admin.controller.ts`
- Guard: `zephix-backend/src/admin/guards/admin.guard.ts`

---

## Deliverable 4: Data Model Inventory

### Work Management Entities

#### WorkTask
- **File:** `zephix-backend/src/modules/work-management/entities/work-task.entity.ts`
- **Key Columns:**
  - `id` (UUID, PK)
  - `organization_id` (UUID, indexed)
  - `workspace_id` (UUID, indexed)
  - `project_id` (UUID, indexed)
  - `phase_id` (UUID, nullable, indexed)
  - `parent_task_id` (UUID, nullable, indexed)
  - `title` (VARCHAR(300))
  - `status` (enum: BACKLOG, TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE, CANCELED)
  - `type` (enum: TASK, EPIC, MILESTONE, BUG)
  - `priority` (enum: LOW, MEDIUM, HIGH, CRITICAL)
  - `assignee_user_id` (UUID, nullable, indexed)
  - `reporter_user_id` (UUID, nullable, indexed)
  - `start_date` (DATE, nullable)
  - `due_date` (DATE, nullable)
  - `completed_at` (TIMESTAMP, nullable)
  - `rank` (NUMERIC, nullable, indexed)
  - `tags` (JSONB, nullable)
  - `metadata` (JSONB, nullable)
- **Tenancy:** ✅ `organizationId` and `workspaceId` columns present
- **Ownership:** `assigneeUserId`, `reporterUserId`
- **Soft Delete:** ❌ No `deleted_at` column
- **Relations:** Project (ManyToOne), WorkPhase (ManyToOne), ParentTask (ManyToOne), Subtasks (OneToMany)
- **Migration:** `1767637754000-Phase5WorkManagementCore.ts`

#### WorkPhase
- **File:** `zephix-backend/src/modules/work-management/entities/work-phase.entity.ts` (referenced, not read)
- **Key Columns (from migration):**
  - `id` (UUID, PK)
  - `organization_id` (UUID)
  - `workspace_id` (UUID)
  - `project_id` (UUID, nullable)
  - `program_id` (UUID, nullable)
  - `name` (TEXT)
  - `sort_order` (INT)
  - `reporting_key` (TEXT)
  - `is_milestone` (BOOLEAN)
  - `start_date` (DATE, nullable)
  - `due_date` (DATE, nullable)
- **Tenancy:** ✅ `organizationId` and `workspaceId` columns present
- **Ownership:** `created_by_user_id` (from migration)
- **Soft Delete:** ❌ No `deleted_at` column
- **Migration:** `1767752663000-AddWorkPhaseAndPhaseIdToTasks.ts`

#### WorkTaskDependency
- **File:** `zephix-backend/src/modules/work-management/entities/task-dependency.entity.ts` (referenced, not read)
- **Key Columns (from service usage):**
  - `predecessor_task_id` (UUID)
  - `successor_task_id` (UUID)
  - `dependency_type` (enum: FINISH_TO_START, START_TO_START, FINISH_TO_FINISH, START_TO_FINISH)
- **Tenancy:** ✅ Uses TenantAwareRepository (organizationId/workspaceId inferred from tasks)
- **Migration:** `1767637754000-Phase5WorkManagementCore.ts`

#### TaskComment
- **File:** `zephix-backend/src/modules/work-management/entities/task-comment.entity.ts` (referenced, not read)
- **Tenancy:** ✅ Uses TenantAwareRepository
- **Migration:** `1767637754000-Phase5WorkManagementCore.ts`

#### TaskActivity
- **File:** `zephix-backend/src/modules/work-management/entities/task-activity.entity.ts` (referenced, not read)
- **Tenancy:** ✅ Uses TenantAwareRepository
- **Migration:** `1767637754000-Phase5WorkManagementCore.ts`

#### ⚠️ Legacy Task Entity
- **Table:** `tasks` (legacy)
- **Migration:** `1757254542149-AddTaskManagementSystem.ts`
- **Risk:** Coexists with `work_tasks` table - potential data inconsistency
- **Recommendation:** Migrate any remaining usage to `work_tasks`

### Template Center Entities

#### Template
- **File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`
- **Key Columns:**
  - `id` (UUID, PK)
  - `name` (VARCHAR(100))
  - `description` (TEXT, nullable)
  - `category` (VARCHAR(50), nullable)
  - `kind` (enum: project, board, mixed)
  - `icon` (VARCHAR(50), nullable)
  - `is_active` (BOOLEAN, default true)
  - `is_system` (BOOLEAN, default false)
  - `organization_id` (UUID, nullable - null for system templates)
  - `is_default` (BOOLEAN, default false)
  - `lock_state` (VARCHAR(20), default 'UNLOCKED')
  - `created_by_id` (UUID, nullable)
  - `updated_by_id` (UUID, nullable)
  - `published_at` (TIMESTAMP, nullable)
  - `archived_at` (TIMESTAMP, nullable)
  - `metadata` (JSONB, nullable)
  - `methodology` (VARCHAR(50), nullable - legacy)
  - `structure` (JSONB, nullable - legacy)
  - `metrics` (JSONB, default [])
  - `version` (INT, default 1)
  - `work_type_tags` (TEXT[], default [])
  - `scope_tags` (TEXT[], default [])
  - `complexity_bucket` (VARCHAR(20), nullable)
  - `duration_min_days` (INT, nullable)
  - `duration_max_days` (INT, nullable)
  - `setup_time_bucket` (VARCHAR(20), default 'SHORT')
  - `structure_summary` (JSONB, nullable)
  - `lock_policy` (JSONB, nullable)
- **Tenancy:** ✅ `organizationId` column (nullable for system templates)
- **Ownership:** `createdById`, `updatedById`
- **Soft Delete:** ✅ `archivedAt` column
- **Indexes:** `idx_templates_org`, `idx_templates_org_default` (unique), `idx_templates_org_name` (unique)
- **Migration:** `1769000000101-AddTemplateV1Columns.ts`

#### TemplateBlock
- **File:** `zephix-backend/src/modules/templates/entities/template-block.entity.ts` (referenced, not read)
- **Key Columns (from migration):**
  - `id` (UUID, PK)
  - `organization_id` (UUID)
  - `template_id` (UUID, FK to templates)
  - `block_id` (UUID, FK to lego_blocks)
  - `enabled` (BOOLEAN, default true)
  - `display_order` (INT, default 0)
  - `config` (JSONB, default {})
  - `locked` (BOOLEAN, default false)
- **Tenancy:** ✅ `organizationId` column
- **Unique Constraint:** `(organization_id, template_id, block_id)`
- **Migration:** `1769000000103-CreateTemplateBlocksV1.ts`

#### LegoBlock
- **File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts` (referenced, not read)
- **Tenancy:** ✅ `organizationId` column (nullable for system blocks)
- **Migration:** `1769000000102-AddLegoBlockV1Columns.ts`

#### ProjectTemplate (Legacy)
- **Table:** `project_templates` (legacy, may coexist with `templates`)
- **Migration:** `1763000000000-CreateProjectTemplateTable.ts`
- **Risk:** Duplicate entity representing same concept
- **Recommendation:** Verify migration path from `project_templates` to `templates`

### Admin Entities

#### User
- **Tenancy:** Organization-scoped via `UserOrganization` join table
- **Evidence:** Referenced in admin controller

#### Workspace
- **Tenancy:** ✅ `organizationId` column
- **Evidence:** `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts` (referenced)

#### Organization
- **Tenancy:** Top-level entity
- **Evidence:** `zephix-backend/src/organizations/entities/organization.entity.ts` (referenced)

---

## Deliverable 5: End-to-End Proof Checklist

### Work Management System

#### Setup Steps
1. **Create Organization and Workspace**
   - Login as admin
   - Navigate to `/admin/workspaces`
   - Create a new workspace
   - **Expected:** Workspace created with slug
   - **Failure:** 403 if not admin, 400 if validation fails

2. **Select Workspace**
   - Navigate to workspace switcher
   - Select the created workspace
   - **Expected:** Workspace context stored, `x-workspace-id` header set
   - **Failure:** Workspace not in accessible list

3. **Create Project (via Template)**
   - Navigate to `/templates`
   - Select a template
   - Click "Apply Template"
   - Enter project name
   - **Expected:** Project created with phases and tasks
   - **Failure:** 403 if workspace write access denied, 404 if template not found

#### Test Steps

4. **List Tasks**
   - Navigate to `/projects/:projectId`
   - **Expected:** Tasks list displayed, filtered by project
   - **Failure:** 403 if workspace access denied, empty list if no tasks
   - **Logs:** Check for `GET /api/work/tasks` with `x-workspace-id` header

5. **Create Task**
   - Click "Create Task" button
   - Fill in title, description, assignee
   - Submit
   - **Expected:** Task created and appears in list
   - **Failure:** 403 if write access denied, 400 if validation fails
   - **Logs:** Check for `POST /api/work/tasks` with workspace header

6. **Update Task Status**
   - Click on a task
   - Change status (e.g., TODO → IN_PROGRESS)
   - **Expected:** Status updated, activity recorded
   - **Failure:** 403 if write access denied, 400 if invalid status
   - **Logs:** Check for `PATCH /api/work/tasks/:id`

7. **Assign Task**
   - Open task detail
   - Select assignee from dropdown
   - Save
   - **Expected:** Task assigned, activity recorded
   - **Failure:** 403 if write access denied
   - **Logs:** Check for `PATCH /api/work/tasks/:id` with `assigneeUserId`

8. **Add Comment**
   - Open task detail
   - Add a comment
   - Submit
   - **Expected:** Comment added and visible
   - **Failure:** 403 if write access denied
   - **Logs:** Check for `POST /api/work/tasks/:id/comments`

9. **View Activity Feed**
   - Open task detail
   - Navigate to activity tab
   - **Expected:** Activity feed shows task history
   - **Failure:** 403 if workspace access denied
   - **Logs:** Check for `GET /api/work/tasks/:id/activity`

10. **Add Dependency**
    - Open task detail
    - Add a dependency to another task
    - **Expected:** Dependency created, cycle detection works
    - **Failure:** 400 if cycle detected, 403 if write access denied
    - **Logs:** Check for `POST /api/work/tasks/:id/dependencies`

11. **Bulk Status Update**
    - Select multiple tasks
    - Change status in bulk
    - **Expected:** All selected tasks updated
    - **Failure:** 403 if write access denied, 404 if task not found
    - **Logs:** Check for `PATCH /api/work/tasks/bulk`

12. **View Project Overview**
    - Navigate to `/work/projects/:projectId/plan`
    - **Expected:** Project plan with phases and tasks displayed
    - **Failure:** 403 if workspace access denied
    - **Logs:** Check for `GET /api/work/projects/:projectId/plan`

13. **Role-Based Access (Admin)**
    - Login as admin
    - Perform all above steps
    - **Expected:** All operations succeed
    - **Failure:** Should not occur for admin

14. **Role-Based Access (Member)**
    - Login as member
    - Perform read and write operations
    - **Expected:** Read and write operations succeed
    - **Failure:** 403 if workspace write access denied

15. **Role-Based Access (Viewer)**
    - Login as viewer
    - Attempt to create/update/delete task
    - **Expected:** 403 Forbidden
    - **Failure:** If write operations succeed, role enforcement is broken
    - **Logs:** Check for `WorkspaceRoleGuard.requireWorkspaceWrite()` calls

16. **Workspace Scoping**
    - Create task in Workspace A
    - Switch to Workspace B
    - List tasks
    - **Expected:** Task from Workspace A not visible
    - **Failure:** If task visible, workspace scoping is broken
    - **Logs:** Check for `workspaceId` filter in service queries

17. **Organization Scoping**
    - Create task in Org A, Workspace A
    - Login as user from Org B
    - Attempt to access task
    - **Expected:** 403 Forbidden or 404 Not Found
    - **Failure:** If task accessible, organization scoping is broken
    - **Logs:** Check for `organizationId` filter in TenantAwareRepository

18. **Status Transition Validation**
    - Create task with status TODO
    - Attempt to transition directly to DONE (skipping IN_PROGRESS)
    - **Expected:** Either succeeds (if no validation) or 400 (if validation exists)
    - **Failure:** If validation exists but doesn't work, status flow is broken
    - **Note:** Current implementation may not validate transitions

19. **Phase Assignment**
    - Create task without phase
    - **Expected:** Task auto-assigned to first phase of project
    - **Failure:** If task has no phase and project has phases, auto-assignment failed
    - **Logs:** Check for `WorkTasksService.createTask()` phase assignment logic

20. **Task Deletion**
    - Delete a task
    - **Expected:** Task removed from list
    - **Failure:** 403 if write access denied, 404 if task not found
    - **Logs:** Check for `DELETE /api/work/tasks/:id`

---

### Template Center

#### Setup Steps
1. **Login as Admin or Member**
2. **Select Workspace** (for template application)

#### Test Steps

1. **Browse Templates**
   - Navigate to `/templates`
   - **Expected:** Template list displayed with filters
   - **Failure:** 403 if not authenticated, empty list if no templates
   - **Logs:** Check for `GET /api/templates`

2. **View Template Detail**
   - Click on a template
   - **Expected:** Template detail with blocks, phases, tasks preview
   - **Failure:** 404 if template not found
   - **Logs:** Check for `GET /api/templates/:id`

3. **Get Template Recommendations**
   - Navigate to template center
   - Fill in recommendation filters (containerType, workType, durationDays, complexity)
   - **Expected:** Top 3 recommended templates plus others
   - **Failure:** 400 if invalid filters
   - **Logs:** Check for `GET /api/templates/recommendations`

4. **Preview Template**
   - Click "Preview" on a template
   - **Expected:** Template preview with structure, phase count, task count
   - **Failure:** 403 if workspace access denied, 404 if template not found
   - **Logs:** Check for `GET /api/templates/:templateId/preview-v5_1`

5. **Apply Template (Admin)**
   - Login as admin
   - Select template
   - Click "Apply Template"
   - Enter project name and workspace
   - **Expected:** Project created with phases and tasks
   - **Failure:** 403 if workspace write access denied, 400 if validation fails
   - **Logs:** Check for `POST /api/templates/:templateId/instantiate-v5_1`

6. **Apply Template (Member)**
   - Login as member
   - Select template
   - Apply to workspace where member has write access
   - **Expected:** Project created
   - **Failure:** 403 if workspace write access denied

7. **Apply Template (Viewer)**
   - Login as viewer
   - Attempt to apply template
   - **Expected:** 403 Forbidden
   - **Failure:** If template applied, role enforcement is broken

8. **Create Template (Admin)**
   - Login as admin
   - Navigate to `/admin/templates`
   - Click "Create Template"
   - Fill in name, description, category
   - **Expected:** Template created
   - **Failure:** 403 if not admin, 400 if validation fails
   - **Logs:** Check for `POST /api/templates`

9. **Edit Template (Admin)**
   - Login as admin
   - Edit a template
   - **Expected:** Template updated
   - **Failure:** 403 if template locked, 403 if not admin
   - **Logs:** Check for `PUT /api/templates/:id`

10. **Lock Template (Admin)**
    - Login as admin
    - Lock a template
    - Attempt to edit
    - **Expected:** Edit blocked by TemplateLockGuard
    - **Failure:** If edit succeeds, lock guard is broken
    - **Logs:** Check for `POST /api/templates/:id/lock`

11. **Set Default Template (Admin)**
    - Login as admin
    - Set a template as default
    - **Expected:** Template marked as default, other defaults unset
    - **Failure:** 403 if not admin
    - **Logs:** Check for `POST /api/templates/:id/default`

12. **Clone Template**
    - Clone a template
    - **Expected:** New template created as copy
    - **Failure:** 403 if template locked, 403 if write access denied
    - **Logs:** Check for `POST /api/templates/:id/clone`

13. **Archive Template (Admin)**
    - Login as admin
    - Archive a template
    - **Expected:** Template archived (soft delete)
    - **Failure:** 403 if not admin
    - **Logs:** Check for `DELETE /api/templates/:id`

14. **Organization Scoping**
    - Create template in Org A
    - Login as user from Org B
    - Attempt to view template
    - **Expected:** Template not visible (unless system template)
    - **Failure:** If template visible, organization scoping is broken
    - **Logs:** Check for `organizationId` filter in TenantAwareRepository

15. **System Templates**
    - View system templates (isSystem = true)
    - **Expected:** System templates visible to all organizations
    - **Failure:** If system templates not visible, scoping is broken

---

### Admin Workflows

#### Setup Steps
1. **Login as Admin**
   - Use admin account (platformRole === 'ADMIN' or role === 'admin'/'owner')
   - **Expected:** Access to `/admin` routes
   - **Failure:** Redirect to `/home` if not admin

#### Test Steps

1. **View Admin Dashboard**
   - Navigate to `/admin`
   - **Expected:** Dashboard with stats (user count, template count, project count)
   - **Failure:** 403 if not admin, 500 if stats service fails (should return safe defaults)
   - **Logs:** Check for `GET /api/admin/stats`

2. **View System Health**
   - Navigate to `/admin` (health shown on dashboard)
   - **Expected:** System health status displayed
   - **Failure:** 500 if health check fails (should return error status, not throw)
   - **Logs:** Check for `GET /api/admin/health`

3. **List Users**
   - Navigate to `/admin/users`
   - **Expected:** User list with pagination, search, role filters
   - **Failure:** 403 if not admin
   - **Logs:** Check for `GET /api/admin/users`

4. **Update User Role**
   - Select a user
   - Change role (e.g., MEMBER → VIEWER)
   - **Expected:** Role updated
   - **Failure:** 403 if not admin, 400 if invalid role
   - **Logs:** Check for `PATCH /api/admin/users/:userId/role`

5. **Delete User**
   - Select a user
   - Delete user
   - **Expected:** User soft deleted (isActive = false)
   - **Failure:** 403 if not admin, 404 if user not found
   - **Logs:** Check for `DELETE /api/admin/users/:userId`

6. **List Workspaces**
   - Navigate to `/admin/workspaces`
   - **Expected:** Workspace list
   - **Failure:** 403 if not admin
   - **Logs:** Check for `GET /api/admin/workspaces`

7. **Create Workspace**
   - Navigate to `/admin/workspaces`
   - Create new workspace
   - **Expected:** Workspace created
   - **Failure:** 403 if not admin, 400 if validation fails
   - **Logs:** Check for `POST /api/admin/workspaces`

8. **List Templates (Admin)**
   - Navigate to `/admin/templates`
   - **Expected:** Template list (admin view)
   - **Failure:** 403 if not admin
   - **Logs:** Check for `GET /admin/templates`

9. **Organization Overview**
   - Navigate to `/admin/org`
   - **Expected:** Organization overview (if endpoint exists) or 404
   - **Failure:** 404 if endpoint not implemented
   - **Logs:** Check for `GET /api/admin/organization/overview` (may 404)

10. **Teams Management**
    - Navigate to `/admin/teams`
    - **Expected:** Teams list
    - **Failure:** 403 if not admin
    - **Logs:** Check for teams endpoints

11. **Trash Management**
    - Navigate to `/admin/trash`
    - **Expected:** Trash list (if implemented) or placeholder
    - **Failure:** 404 if endpoints not implemented
    - **Logs:** Check for trash/restore endpoints

12. **Usage Metrics**
    - Navigate to `/admin/usage`
    - **Expected:** Usage metrics (if implemented) or placeholder
    - **Failure:** 404 if endpoints not implemented

13. **Billing Stubs**
    - Navigate to `/admin/billing`
    - **Expected:** Billing info (if implemented) or placeholder
    - **Failure:** 404 if endpoints not implemented

14. **Admin Guard Enforcement**
    - Login as member (not admin)
    - Attempt to access `/admin` routes
    - **Expected:** Redirect to `/home` or 403
    - **Failure:** If admin routes accessible, guard is broken
    - **Logs:** Check for `AdminGuard.canActivate()` returning false

15. **Organization Scoping**
    - Login as admin from Org A
    - View users/workspaces/templates
    - **Expected:** Only Org A data visible
    - **Failure:** If Org B data visible, organization scoping is broken
    - **Logs:** Check for `organizationId` filter in admin service queries

---

## Deliverable 6: Architectural Risks and Decisions

### High-Signal Risks (30-90 Day Impact)

#### 1. Multiple Task Entities Representing Same Concept
**Risk:** `tasks` table (legacy) and `work_tasks` table (Phase 5.1) coexist
- **Evidence:**
  - Legacy: `1757254542149-AddTaskManagementSystem.ts`
  - Phase 5.1: `1767637754000-Phase5WorkManagementCore.ts`
- **Impact:** Data inconsistency, confusion about which entity to use
- **Recommendation:**
  - Migrate all `tasks` table usage to `work_tasks`
  - Deprecate `tasks` table after migration
  - Update frontend to use `/work/tasks` endpoints only

#### 2. Status Flow Not Enforced in Service Layer
**Risk:** Task status transitions not validated
- **Evidence:** `work-tasks.service.ts:474-534` - no transition validation
- **Impact:** Invalid status transitions allowed (e.g., TODO → DONE skipping IN_PROGRESS)
- **Recommendation:**
  - Add status transition matrix to service
  - Validate transitions in `updateTask()` method
  - Return 400 with clear error if invalid transition

#### 3. Template Apply Not Idempotent
**Risk:** Multiple template applications may create duplicate projects
- **Evidence:** `templates-instantiate-v51.service.ts:55-142` - no idempotency check
- **Impact:** Accidental duplicate projects from template
- **Recommendation:**
  - Add idempotency key (e.g., templateId + workspaceId + projectName hash)
  - Check for existing project before creation
  - Return existing project if idempotency key matches

#### 4. Workspace Scoping Done in Controller Only
**Risk:** Some services may bypass workspace validation
- **Evidence:** Controllers validate `x-workspace-id` header, but services may not consistently enforce
- **Impact:** Potential data leakage across workspaces
- **Recommendation:**
  - Ensure all service methods that accept `workspaceId` verify user has access
  - Use `WorkspaceAccessService.canAccessWorkspace()` in service layer
  - Add workspaceId to all TenantAwareRepository queries

#### 5. Header-Trusting Patterns
**Risk:** Controllers validate `x-workspace-id` format but may not verify access before using
- **Evidence:** `work-tasks.controller.ts:48-62` - validates format but access check happens in service
- **Impact:** If service check is missed, unauthorized workspace access possible
- **Recommendation:**
  - Move workspace access verification to controller level (before service call)
  - Use `WorkspaceRoleGuardService` in controller decorators where possible
  - Add middleware to verify workspace access for all requests with `x-workspace-id` header

#### 6. Direct Repository Access Bypassing Tenant Layer
**Risk:** Some services use direct TypeORM repositories instead of TenantAwareRepository
- **Evidence:** `work-tasks.service.ts:50-51` - `workPhaseRepository` is direct `Repository<WorkPhase>`
- **Impact:** Potential organization/workspace scoping bypass
- **Recommendation:**
  - Migrate all direct repositories to TenantAwareRepository
  - Use `createTenantAwareRepositoryProvider()` in module
  - Remove direct `@InjectRepository()` usage

#### 7. VIEWER Role Not Explicitly Filtered
**Risk:** VIEWER users may see data they shouldn't
- **Evidence:** `work-tasks.service.ts:143-207` - `listTasks()` doesn't filter by role
- **Impact:** VIEWER users may see tasks from workspaces they shouldn't access
- **Recommendation:**
  - Add role-based filtering to all list endpoints
  - For VIEWER, filter by `accessibleWorkspaceIds` from workspace access service
  - Add VIEWER filtering to template list service

#### 8. Legacy Template Endpoints Still Active
**Risk:** `POST /api/templates/:id/instantiate` (legacy) creates `Task` entities instead of `WorkTask`
- **Evidence:** `templates.controller.ts:458-568` - legacy endpoint still exists
- **Impact:** Inconsistent data model, confusion about which endpoint to use
- **Recommendation:**
  - Deprecate legacy `/instantiate` endpoint
  - Redirect to `/instantiate-v5_1` endpoint
  - Remove legacy endpoint after migration period

#### 9. Template and ProjectTemplate Entities Coexist
**Risk:** `templates` table and `project_templates` table may both exist
- **Evidence:**
  - `templates` entity: `template.entity.ts`
  - `project_templates` migration: `1763000000000-CreateProjectTemplateTable.ts`
- **Impact:** Confusion about which entity to use, potential data duplication
- **Recommendation:**
  - Verify migration path from `project_templates` to `templates`
  - Ensure all code uses `Template` entity, not `ProjectTemplate`
  - Remove `project_templates` table after migration

#### 10. No Soft Delete for Work Management Entities
**Risk:** `WorkTask`, `WorkPhase` don't have `deleted_at` column
- **Evidence:** `work-task.entity.ts` - no soft delete field
- **Impact:** Permanent data loss on delete, no audit trail
- **Recommendation:**
  - Add `deletedAt` column to `WorkTask` and `WorkPhase` entities
  - Update services to soft delete instead of hard delete
  - Add restore endpoint for soft-deleted items

---

## Appendix: Evidence File Index

### Backend Controllers
- `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`
- `zephix-backend/src/modules/work-management/controllers/work-phases.controller.ts`
- `zephix-backend/src/modules/work-management/controllers/work-plan.controller.ts`
- `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
- `zephix-backend/src/modules/templates/controllers/template-actions.controller.ts`
- `zephix-backend/src/modules/templates/controllers/template-blocks.controller.ts`
- `zephix-backend/src/admin/admin.controller.ts`

### Backend Services
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts`
- `zephix-backend/src/modules/work-management/services/work-phases.service.ts`
- `zephix-backend/src/modules/work-management/services/task-dependencies.service.ts`
- `zephix-backend/src/modules/work-management/services/task-comments.service.ts`
- `zephix-backend/src/modules/work-management/services/task-activity.service.ts`
- `zephix-backend/src/modules/templates/services/templates.service.ts`
- `zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts`
- `zephix-backend/src/admin/admin.service.ts`

### Backend Entities
- `zephix-backend/src/modules/work-management/entities/work-task.entity.ts`
- `zephix-backend/src/modules/templates/entities/template.entity.ts`

### Frontend Routes
- `zephix-frontend/src/App.tsx`
- `zephix-frontend/src/routes/AdminRoute.tsx`

### Frontend Components
- `zephix-frontend/src/views/templates/TemplateCenter.tsx`
- `zephix-frontend/src/features/projects/overview/ProjectOverviewPage.tsx`
- `zephix-frontend/src/components/tasks/TaskList.tsx`

### Frontend API Clients
- `zephix-frontend/src/services/taskService.ts`
- `zephix-frontend/src/services/templates.api.ts`
- `zephix-frontend/src/services/adminApi.ts`

### Migrations
- `zephix-backend/src/migrations/1767637754000-Phase5WorkManagementCore.ts`
- `zephix-backend/src/migrations/1767752663000-AddWorkPhaseAndPhaseIdToTasks.ts`
- `zephix-backend/src/migrations/1769000000101-AddTemplateV1Columns.ts`
- `zephix-backend/src/migrations/1769000000103-CreateTemplateBlocksV1.ts`

### Documentation
- `ADMIN_CONSOLE_AUDIT_REPORT.md`
- `PLATFORM_REVIEW_AND_NEXT_STEPS.md`
- `TEMPLATE_CENTER_V1_IMPLEMENTATION_SEQUENCE.md`

---

**End of Audit Report**
