# DELETE CANDIDATE
# Reason: Merged into main audit
# Original: ZEPHIX_STRICT_AUDIT_ADDENDUM.md

# Zephix Platform Strict Audit - Addendum
## Following Exact Requirements with Precise Evidence Pointers

**Date:** 2025-01-27
**Methodology:** Evidence-only, no assumptions

---

## Critical Findings: Legacy vs New Modules

### Task Controllers (3 Found - Only 1 Active)

**LEGACY (Not Active in UI):**
1. **`TasksController`** at `/tasks`
   - **File:** `zephix-backend/src/modules/tasks/tasks.controller.ts:19-21`
   - **Routes:** `POST /tasks`, `GET /tasks/project/:projectId`, `GET /tasks/:id`, `PATCH /tasks/:id`, `DELETE /tasks/:id`
   - **Evidence:** Controller exists but frontend doesn't call these routes
   - **Status:** ❌ **LEGACY - Not wired to frontend**

2. **`TaskController`** at `/projects/:projectId/tasks`
   - **File:** `zephix-backend/src/modules/projects/controllers/task.controller.ts:20-22`
   - **Routes:** Project-scoped task endpoints
   - **Evidence:** May be used by some frontend components
   - **Status:** ⚠️ **PARTIALLY ACTIVE - Some frontend calls may use this**

**ACTIVE (Phase 5.1):**
3. **`WorkTasksController`** at `/work/tasks`
   - **File:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:64-68`
   - **Routes:** All work management endpoints
   - **Evidence:** Used by `ProjectPlanView` and work management features
   - **Status:** ✅ **ACTIVE - Phase 5.1 standard**

### Frontend API Contract Mismatches

**LEGACY API Calls (Don't Match Backend):**
- `taskService.getTasks()` calls `GET /tasks/project/${projectId}`
  - **File:** `zephix-frontend/src/services/taskService.ts:5-8`
  - **Backend Match:** ❌ No matching route (legacy `TasksController` exists but not used)
  - **Should Call:** `GET /work/tasks?projectId=${projectId}` with `x-workspace-id` header

- `taskService.createTask()` calls `POST /tasks`
  - **File:** `zephix-frontend/src/services/taskService.ts:15-18`
  - **Backend Match:** ❌ Legacy route exists but not active
  - **Should Call:** `POST /work/tasks` with `x-workspace-id` header

**ACTIVE API Calls (Match Backend):**
- `updatePhase()` calls `PATCH /work/phases/${phaseId}` with `x-workspace-id` header
  - **File:** `zephix-frontend/src/features/work-management/api/phases.api.ts:20-52`
  - **Backend Match:** ✅ `WorkPhasesController` at `zephix-backend/src/modules/work-management/controllers/work-phases.controller.ts:27-29`

---

## Enhanced Evidence Pointers for Key Flows

### Work Management: Create Task Flow

**Step 1: UI Entry**
- **Route:** `/projects/:projectId` → `ProjectOverviewPage`
- **File:** `zephix-frontend/src/App.tsx:110`
- **Component:** `zephix-frontend/src/features/projects/overview/ProjectOverviewPage.tsx:45-308`

**Step 2: Frontend API Call (CURRENT - WRONG)**
- **Function:** `api.get('/projects/${projectId}/tasks')`
- **File:** `zephix-frontend/src/components/tasks/TaskList.tsx:41`
- **Headers:** ❌ **MISSING** `x-workspace-id` header
- **Backend Match:** ❌ No matching route

**Step 2: Frontend API Call (SHOULD BE)**
- **Function:** Should call `GET /work/tasks?projectId=${projectId}`
- **Headers:** Must include `x-workspace-id: ${activeWorkspaceId}`
- **Backend Match:** ✅ `WorkTasksController.listTasks()` at `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:79-127`

**Step 3: Backend Controller**
- **Method:** `WorkTasksController.listTasks()`
- **File:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:113-127`
- **Line 118:** Validates `x-workspace-id` header via `validateWorkspaceId()`
- **Line 119:** Gets auth context via `getAuthContext(req)`

**Step 4: Service Layer**
- **Method:** `WorkTasksService.listTasks()`
- **File:** `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:143-207`
- **Line 148:** Gets `organizationId` via `tenantContext.assertOrganizationId()`
- **Lines 151-163:** Validates workspace access via `workspaceAccessService.canAccessWorkspace()`
- **Line 165:** Uses `TenantAwareRepository` query builder
- **Line 167:** Filters by `workspaceId` in WHERE clause

**Step 5: Tenant Scoping**
- **OrganizationId:** Enforced via `TenantAwareRepository` (automatic filter)
- **WorkspaceId:** Enforced via explicit WHERE clause at line 167
- **Access Check:** Validated at lines 151-163 before query execution

---

## Missing x-workspace-id Header Analysis

### Frontend Files That DO Send Header:
1. `zephix-frontend/src/features/work-management/api/phases.api.ts:32` ✅
2. `zephix-frontend/src/features/projects/overview/ProjectOverviewPage.tsx:98,138` ✅
3. `zephix-frontend/src/views/work-management/ProjectPlanView.tsx:80` ✅
4. `zephix-frontend/src/features/templates/api.ts:83,107,135` ✅
5. `zephix-frontend/src/lib/api/client.ts:76` ✅ (interceptor adds default)

### Frontend Files That DON'T Send Header:
1. `zephix-frontend/src/services/taskService.ts` ❌ (all methods)
2. `zephix-frontend/src/components/tasks/TaskList.tsx:41` ❌
3. `zephix-frontend/src/components/projects/TaskManagement.tsx:90` ❌

---

## Backend Header Validation

### Controllers That Validate x-workspace-id:
1. **WorkTasksController**
   - **Validation:** `validateWorkspaceId()` function
   - **File:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:48-62`
   - **Line 49:** Checks if header exists
   - **Line 55:** Validates UUID format
   - **Line 118:** Called in `listTasks()` method

2. **TemplatesController**
   - **Validation:** `validateWorkspaceId()` method
   - **File:** `zephix-backend/src/modules/templates/controllers/templates.controller.ts:72-86`
   - **Line 73:** Checks if header exists
   - **Line 79:** Validates UUID format

### ⚠️ RISK: Header Trusting Pattern
- Controllers validate **format** but access check happens in **service layer**
- **Evidence:** `WorkTasksController.listTasks()` validates format at line 118, but access check is in service at line 151
- **Risk:** If service check is bypassed, unauthorized access possible
- **Fix:** Move access check to controller level or add middleware

---

## Test Coverage Evidence

### Work Management Tests Found:
1. **Unit Test:** `task-dependencies.service.spec.ts`
   - **File:** `zephix-backend/src/modules/work-management/services/task-dependencies.service.spec.ts`
   - **Coverage:** TaskDependenciesService
   - **Status:** ✅ Exists

### Work Management Tests Missing:
1. ❌ `work-tasks.service.spec.ts` - No unit tests for WorkTasksService
2. ❌ `work-tasks.controller.spec.ts` - No controller tests
3. ❌ `work-phases.controller.spec.ts` - No controller tests
4. ❌ E2E tests for work management flows

### Template Tests Found:
1. **Unit Test:** `templates.service.spec.ts`
   - **File:** `zephix-backend/src/modules/templates/services/templates.service.spec.ts`
2. **Controller Test:** `templates.controller.spec.ts`
   - **File:** `zephix-backend/src/modules/templates/controllers/templates.controller.spec.ts`

### Admin Tests Found:
1. **Controller Test:** `admin.controller.spec.ts`
   - **File:** `zephix-backend/src/admin/admin.controller.spec.ts`

---

## Database Schema Evidence

### work_tasks Table (Phase 5.1 - Active)
- **Migration:** `1767637754000-Phase5WorkManagementCore.ts`
- **Evidence:** Creates `work_tasks` table with all columns
- **Lines 54-175:** Table definition with organization_id, workspace_id, project_id, phase_id
- **Status:** ✅ Active, used by WorkTasksService

### tasks Table (Legacy - May Still Exist)
- **Migration:** `1757254542149-AddTaskManagementSystem.ts`
- **Evidence:** Creates `tasks` table
- **Lines 8-50:** Table definition
- **Status:** ⚠️ Legacy, may still exist in database
- **Risk:** Data inconsistency if both tables have data

### templates Table (Active)
- **Migration:** `1769000000101-AddTemplateV1Columns.ts`
- **Evidence:** Creates/updates `templates` table
- **Lines 22-39:** Base table creation
- **Lines 50-56:** Adds v1 columns (is_default, lock_state, etc.)
- **Status:** ✅ Active

---

## Exact API Route Inventory

### Work Management Routes (Active)

| Method | Path | Controller | Method Name | Line | Guards | x-workspace-id | TenantAware |
|--------|------|------------|-------------|------|--------|----------------|-------------|
| GET | `/api/work/tasks` | WorkTasksController | listTasks | 79-127 | JwtAuthGuard | ✅ Validated | ✅ Yes |
| POST | `/api/work/tasks` | WorkTasksController | createTask | 130-168 | JwtAuthGuard, WorkspaceRoleGuard | ✅ Validated | ✅ Yes |
| PATCH | `/api/work/tasks/bulk` | WorkTasksController | bulkUpdateStatus | 171-211 | JwtAuthGuard, WorkspaceRoleGuard | ✅ Validated | ✅ Yes |
| POST | `/api/work/tasks/:id/dependencies` | WorkTasksController | addDependency | 214-269 | JwtAuthGuard, WorkspaceRoleGuard | ✅ Validated | ✅ Yes |
| DELETE | `/api/work/tasks/:id/dependencies` | WorkTasksController | removeDependency | 272-315 | JwtAuthGuard, WorkspaceRoleGuard | ✅ Validated | ✅ Yes |
| POST | `/api/work/tasks/:id/comments` | WorkTasksController | addComment | 318-361 | JwtAuthGuard, WorkspaceRoleGuard | ✅ Validated | ✅ Yes |
| GET | `/api/work/tasks/:id/comments` | WorkTasksController | listComments | 364-400 | JwtAuthGuard | ✅ Validated | ✅ Yes |
| GET | `/api/work/tasks/:id/activity` | WorkTasksController | listActivity | 403-442 | JwtAuthGuard | ✅ Validated | ✅ Yes |
| GET | `/api/work/tasks/:id` | WorkTasksController | getTaskById | 445-480 | JwtAuthGuard | ✅ Validated | ✅ Yes |
| PATCH | `/api/work/tasks/:id` | WorkTasksController | updateTask | 483-533 | JwtAuthGuard, WorkspaceRoleGuard | ✅ Validated | ✅ Yes |
| DELETE | `/api/work/tasks/:id` | WorkTasksController | deleteTask | 536-573 | JwtAuthGuard, WorkspaceRoleGuard | ✅ Validated | ✅ Yes |

**Evidence File:** `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`

---

## Summary: What Blocks End-to-End

### Work Management
1. **API Contract Mismatch:** Frontend `taskService.ts` calls `/tasks/*` but backend serves `/work/tasks`
   - **Fix:** Update `taskService.ts` to use `/work/tasks` endpoints
   - **Add:** `x-workspace-id` header to all calls

2. **Missing Workspace Header:** Some frontend components don't send `x-workspace-id`
   - **Fix:** Ensure all work management API calls include header
   - **Use:** `useWorkspaceStore.getState().activeWorkspaceId`

3. **VIEWER Role Filtering:** `listTasks()` doesn't filter by accessible workspaces for VIEWER
   - **Fix:** Add VIEWER filtering in `WorkTasksService.listTasks()` at line 143
   - **Use:** `workspaceAccessService.getAccessibleWorkspaceIds()` for VIEWER

### Template Center
1. **Mixed API Patterns:** Some calls use `/api/templates`, others use `/templates`
   - **Status:** Both work, but inconsistent
   - **Recommendation:** Standardize on `/api/templates`

### Admin Workflows
1. **Missing Endpoint:** `/admin/organization/overview` returns 404
   - **Evidence:** `ADMIN_CONSOLE_AUDIT_REPORT.md:65`
   - **Fix:** Implement endpoint in `AdminController`

---

**End of Addendum**
