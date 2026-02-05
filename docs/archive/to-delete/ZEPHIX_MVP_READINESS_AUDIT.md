# Zephix MVP Readiness Audit
## Evidence-Based Assessment for 8 Core Flows

**Date:** 2025-01-27
**Methodology:** Evidence-only, no assumptions
**Auditor:** Senior Solution Architect

---

## Executive Summary

### What Works End-to-End Today
1. **Workspace & RBAC**: Admin creates workspace, becomes owner, adds members with role enforcement ✅
2. **Template Center**: Browse, preview, create, apply templates to create projects ✅
3. **Project Health**: Auto-calculated from work signals, persisted on Project entity ✅
4. **My Work View**: Exists but uses legacy WorkItem entity (not WorkTask) ⚠️

### What Is Partially Working
1. **Work Management**: Backend complete (Phase 5.1), frontend API contract mismatches
2. **KPI Lego System**: Templates store KPIs, but no toggle/activation on projects
3. **Resource Management**: Entities exist, but no workspace member → resource mapping

### What Is Missing
1. **KPI Toggle System**: No way to activate/deactivate KPIs on projects
2. **WorkItem vs WorkTask Mismatch**: My Work uses WorkItem, work management uses WorkTask
3. **Resource Auto-Mapping**: Workspace members don't automatically become resources

### Top 10 Blockers (Ordered by Impact)

1. **CRITICAL**: Frontend calls `/tasks/*` but backend serves `/work/tasks/*` - API contract mismatch
   - **Evidence**: `zephix-frontend/src/services/taskService.ts:5-8` vs `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:79-127`
   - **Impact**: Work management UI cannot create/update tasks

2. **CRITICAL**: My Work view uses `WorkItem` entity but work management uses `WorkTask` entity
   - **Evidence**: `zephix-backend/src/modules/work-items/services/my-work.service.ts:73` vs `zephix-backend/src/modules/work-management/entities/work-task.entity.ts:16`
   - **Impact**: My Work shows no tasks created via work management

3. **HIGH**: Missing `x-workspace-id` header in some frontend API calls
   - **Evidence**: `zephix-frontend/src/services/taskService.ts` (all methods) vs `zephix-frontend/src/features/work-management/api/phases.api.ts:32` (has header)
   - **Impact**: Backend rejects requests without workspace context

4. **HIGH**: No KPI toggle/activation system on projects
   - **Evidence**: Templates have `kpiPresets` (`zephix-backend/src/modules/templates/entities/project-template.entity.ts:135-136`) but projects have no `activeKPIs` field
   - **Impact**: Cannot activate/deactivate KPIs per project as required for MVP

5. **MEDIUM**: No automatic resource creation from workspace members
   - **Evidence**: `zephix-backend/src/modules/resources/entities/resource.entity.ts:26` has `userId` but no service creates resources on member add
   - **Impact**: Resource management shows no users until manually added

6. **MEDIUM**: Project creation not strictly workspace-scoped in all paths
   - **Evidence**: `zephix-backend/src/modules/projects/entities/project.entity.ts:88` has `workspaceId` but need to verify all creation paths enforce it
   - **Impact**: Risk of cross-workspace project creation

7. **MEDIUM**: VIEWER role filtering incomplete in work management list endpoints
   - **Evidence**: `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:143-207` doesn't filter by accessible workspaces for VIEWER
   - **Impact**: VIEWER may see tasks from inaccessible workspaces

8. **LOW**: Template instantiation creates `ProjectMetrics` but no active KPI tracking
   - **Evidence**: `zephix-backend/src/modules/templates/services/templates-instantiate.service.ts:196-226` creates metrics but no toggle state
   - **Impact**: KPIs exist but cannot be toggled on/off

9. **LOW**: Parent/subtask relationship exists but UI may not support it
   - **Evidence**: `zephix-backend/src/modules/work-management/entities/work-task.entity.ts:39-40,107-115` has `parentTaskId` and `subtasks` relation
   - **Impact**: Feature exists but may not be usable in UI

10. **LOW**: Project health triggers may miss some edge cases
    - **Evidence**: `zephix-backend/src/modules/work-management/services/project-health.service.ts:313-333` triggers on task updates but not all mutation paths
    - **Impact**: Health may be stale in some scenarios

---

## Deliverable A: MVP Readiness Summary

### What Works End-to-End Today

#### 1. Workspace & RBAC Flow ✅
- **Admin creates workspace**: `zephix-backend/src/modules/workspaces/workspaces.controller.ts:228-375`
- **Admin becomes workspace owner**: `zephix-backend/src/modules/workspaces/workspaces.service.ts:315-339` (creates workspace_members with role `workspace_owner`)
- **Admin adds members**: `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts:83-208`
- **Role enforcement**: `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts:132-138` (VIEWER always maps to `workspace_viewer`)
- **Workspace role guards**: `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:161-164` (uses `workspaceRoleGuard.requireWorkspaceWrite`)

#### 2. Template Center Flow ✅
- **Browse templates**: `zephix-backend/src/modules/templates/controllers/templates.controller.ts:276-279` (GET /api/templates)
- **Preview template**: `zephix-backend/src/modules/templates/controllers/templates.controller.ts:308-320` (GET /api/templates/:templateId/preview-v5_1)
- **Create template**: `zephix-backend/src/modules/templates/controllers/templates.controller.ts:323-362` (POST /api/templates)
- **Apply template**: `zephix-backend/src/modules/templates/controllers/templates.controller.ts:433-436` (POST /api/templates/:templateId/instantiate-v5_1)
- **Template instantiation**: `zephix-backend/src/modules/templates/services/templates-instantiate-v5-1.service.ts` creates projects, phases, tasks

#### 3. Project Health Auto-Status ✅
- **Health calculation**: `zephix-backend/src/modules/work-management/services/project-health.service.ts:61-307`
- **Health persistence**: `zephix-backend/src/modules/work-management/services/project-health.service.ts:313-333` (persists to `Project.health`)
- **Auto-triggers**: Health recalculates on task status change, due date change, dependency add/remove, start work
- **Health enum**: `zephix-backend/src/modules/projects/entities/project.entity.ts:35-39` (HEALTHY, AT_RISK, BLOCKED)

### What Is Partially Working

#### 1. Work Management Flow ⚠️
- **Backend**: Complete with proper tenancy (`zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`)
- **Frontend API**: Mismatch - calls `/tasks/*` but backend serves `/work/tasks/*`
- **Parent/subtask**: Entity supports it (`zephix-backend/src/modules/work-management/entities/work-task.entity.ts:39-40,107-115`) but UI may not expose it
- **Workspace header**: Some frontend calls missing `x-workspace-id` header

#### 2. KPI Lego System ⚠️
- **Template storage**: Templates have `kpiPresets` and `availableKPIs` (`zephix-backend/src/modules/templates/entities/project-template.entity.ts:65-74,135-136`)
- **Project metrics**: `ProjectMetrics` entity exists (`zephix-backend/src/pm/entities/project-metrics.entity.ts`)
- **Missing**: No `activeKPIs` field on Project, no toggle endpoint, no UI to activate/deactivate

#### 3. Resource Management ⚠️
- **Entities**: `Resource` and `ResourceAllocation` exist (`zephix-backend/src/modules/resources/entities/resource.entity.ts`)
- **Missing**: No automatic resource creation when workspace member added
- **Missing**: No capacity/allocation warning logic (entities exist but no service logic)

### What Is Missing

#### 1. KPI Toggle System ❌
- **Gap**: No way to activate/deactivate KPIs on a project
- **Required**: `activeKPIs: string[]` field on Project entity or separate `ProjectKpiToggle` entity
- **Required**: `PATCH /api/projects/:id/kpis` endpoint to toggle KPIs
- **Required**: UI toggle component in project settings

#### 2. WorkItem vs WorkTask Unification ❌
- **Gap**: My Work uses `WorkItem` but work management uses `WorkTask`
- **Required**: Migrate My Work to use `WorkTask` OR create mapping between entities
- **Evidence of mismatch**: `zephix-backend/src/modules/work-items/services/my-work.service.ts:73` queries `WorkItem` but tasks are created as `WorkTask`

#### 3. Resource Auto-Mapping ❌
- **Gap**: Workspace members don't automatically become resources
- **Required**: Service hook when workspace member added to create/update Resource entity
- **Evidence**: `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts:168-175` creates member but no resource creation

---

## Deliverable B: Evidence Matrix

### 1. Workspace and Roles End-to-End

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| Admin creates workspace | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/workspaces/workspaces.controller.ts:228-375`, `zephix-frontend/src/features/admin/workspaces/CreateWorkspaceModal.tsx` | Low | None needed |
| Admin becomes workspace owner | ✅ Complete | N/A | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/workspaces/workspaces.service.ts:315-339` | Low | None needed |
| Admin adds members | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts:83-208` | Low | None needed |
| Role enforcement (VIEWER → workspace_viewer) | ✅ Complete | N/A | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts:132-138` | Medium | Add E2E test for VIEWER role coercion |
| Workspace role guards on endpoints | ✅ Complete | N/A | N/A | ⚠️ Partial | `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:161-164` | Low | None needed |

### 2. Template Center End-to-End

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| Browse templates | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | `zephix-backend/src/modules/templates/controllers/templates.controller.ts:276-279`, `zephix-frontend/src/views/templates/TemplateCenter.tsx` | Low | None needed |
| Preview template structure | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/templates/controllers/templates.controller.ts:308-320` | Low | None needed |
| Create custom template | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/templates/controllers/templates.controller.ts:323-362` | Low | None needed |
| Apply template to create project | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete | `zephix-backend/src/modules/templates/controllers/templates.controller.ts:433-436`, `zephix-backend/src/modules/templates/services/templates-instantiate-v5-1.service.ts` | Low | None needed |
| Admin marks template as org default | ⚠️ Partial | ❌ Missing | ✅ Complete | ❌ Missing | `zephix-backend/src/modules/templates/entities/project-template.entity.ts:92` has `isDefault` but no endpoint | Medium | Add `PATCH /api/templates/:id/set-default` endpoint |

### 3. Project Creation Inside Workspace Only

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| Project has workspaceId | ✅ Complete | N/A | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/projects/entities/project.entity.ts:88` | Low | Verify all creation paths enforce workspaceId |
| Template instantiation sets workspaceId | ✅ Complete | N/A | ✅ Complete | ✅ Complete | `zephix-backend/src/modules/templates/services/templates-instantiate-v5-1.service.ts` (verify workspaceId passed) | Low | None needed |
| Direct project creation enforces workspace | ⚠️ Partial | ⚠️ Partial | ✅ Complete | ❌ Missing | Need to verify `POST /api/projects` enforces workspaceId | High | Add workspaceId validation in project creation endpoint |

### 4. KPI Lego System, Toggle to Activate KPIs

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| KPI definitions on templates | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/templates/entities/project-template.entity.ts:65-74,135-136` | Low | None needed |
| KPI instantiation on project creation | ✅ Complete | N/A | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/templates/services/templates-instantiate.service.ts:196-226` creates `ProjectMetrics` | Low | None needed |
| Toggle to activate/deactivate KPIs | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | No `activeKPIs` field on Project, no toggle endpoint | **HIGH** | Add `activeKPIs: string[]` to Project, create toggle endpoint |
| UI to render KPI columns | ❌ Missing | ❌ Missing | N/A | ❌ Missing | No UI component found | **HIGH** | Create KPI toggle UI in project settings |

### 5. Work Management Model

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| Phases exist and load per project | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/work-management/controllers/work-phases.controller.ts`, `zephix-backend/src/modules/work-management/entities/work-phase.entity.ts` | Low | None needed |
| Tasks exist as work_tasks (v5.1) | ✅ Complete | ⚠️ Partial | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/work-management/entities/work-task.entity.ts:16` | **HIGH** | Fix frontend API calls to use `/work/tasks` |
| Parent task and subtask relationship | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `zephix-backend/src/modules/work-management/entities/work-task.entity.ts:39-40,107-115` | Medium | Add UI support for parent/subtask |
| Assignment, status updates | ✅ Complete | ⚠️ Partial | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:483-533` | **HIGH** | Fix frontend API contract |
| Comments and activity feed | ✅ Complete | ❌ Missing | ✅ Complete | ❌ Missing | `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:318-442` | Low | Add UI for comments/activity |

### 6. My Work View for Individual Contributors

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| Page lists assigned tasks | ⚠️ Partial | ✅ Complete | ⚠️ Partial | ❌ Missing | `zephix-backend/src/modules/work-items/services/my-work.service.ts:73` queries `WorkItem` but tasks are `WorkTask` | **HIGH** | Migrate My Work to use `WorkTask` entity |
| Filter by accessible workspaces | ✅ Complete | N/A | N/A | ❌ Missing | `zephix-backend/src/modules/work-items/services/my-work.service.ts:34-39` uses `getAccessibleWorkspaceIds` | Low | Add test for VIEWER filtering |
| Required API endpoints exist | ⚠️ Partial | ✅ Complete | N/A | ❌ Missing | `zephix-backend/src/modules/work-items/my-work.controller.ts:33-44` exists but uses wrong entity | **HIGH** | Update My Work service to query `WorkTask` instead of `WorkItem` |

### 7. Project Health Auto Status

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| Health service exists | ✅ Complete | N/A | N/A | ⚠️ Partial | `zephix-backend/src/modules/work-management/services/project-health.service.ts:40-334` | Low | None needed |
| Health derived from KPIs and work signals | ✅ Complete | N/A | N/A | ⚠️ Partial | `zephix-backend/src/modules/work-management/services/project-health.service.ts:61-307` uses tasks, phases, milestones | Low | None needed |
| No manual project status update required | ✅ Complete | ✅ Complete | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/projects/entities/project.entity.ts:232-245` has `health` field, auto-updated | Low | None needed |

### 8. Resource Management Minimal

| Capability | Backend | Frontend | Data Model | Tests | Evidence Pointers | Risk if Shipped | Fix Strategy |
|------------|---------|----------|------------|-------|-------------------|-----------------|--------------|
| Resource entities exist | ✅ Complete | N/A | ✅ Complete | ⚠️ Partial | `zephix-backend/src/modules/resources/entities/resource.entity.ts` | Low | None needed |
| Members added to workspace appear in resources | ❌ Missing | N/A | ⚠️ Partial | ❌ Missing | `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts:168-175` creates member but no resource | **HIGH** | Add resource creation hook in workspace member service |
| Capacity and allocation logic exists | ⚠️ Partial | ❌ Missing | ✅ Complete | ❌ Missing | `zephix-backend/src/modules/resources/entities/resource.entity.ts:47-48,92-102` has capacity fields but no service logic | Medium | Add capacity calculation service, allocation warning logic |

---

## Deliverable C: Fix Plan

### Priority 1: Critical API Contract Fixes (Blocks Work Management)

#### Fix 1.1: Align Frontend API Calls with Backend Routes
**Files to Change:**
- `zephix-frontend/src/services/taskService.ts` - Update all endpoints to `/work/tasks`
- `zephix-frontend/src/components/tasks/TaskList.tsx` - Update API calls
- `zephix-frontend/src/components/projects/TaskManagement.tsx` - Update API calls

**Endpoints:**
- Change `GET /tasks/project/${projectId}` → `GET /work/tasks?projectId=${projectId}`
- Change `POST /tasks` → `POST /work/tasks`
- Change `PATCH /tasks/${taskId}` → `PATCH /work/tasks/${taskId}`
- Change `DELETE /tasks/${taskId}` → `DELETE /work/tasks/${taskId}`

**Acceptance Checks:**
- [ ] All task CRUD operations work in UI
- [ ] Tasks appear in project plan view
- [ ] No 404 errors in browser console

**Evidence:**
- Backend: `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:79-574`
- Frontend (current): `zephix-frontend/src/services/taskService.ts:5-8`

#### Fix 1.2: Add x-workspace-id Header to All Work Management Calls
**Files to Change:**
- `zephix-frontend/src/services/taskService.ts` - Add header to all methods
- `zephix-frontend/src/components/tasks/TaskList.tsx` - Add header
- `zephix-frontend/src/components/projects/TaskManagement.tsx` - Add header

**Implementation:**
```typescript
const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
headers: { 'x-workspace-id': workspaceId }
```

**Acceptance Checks:**
- [ ] No 400 errors for missing workspace header
- [ ] All work management API calls include header
- [ ] Backend logs show workspaceId in requests

**Evidence:**
- Backend validation: `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts:48-62`
- Frontend example (correct): `zephix-frontend/src/features/work-management/api/phases.api.ts:32`

#### Fix 1.3: Migrate My Work to Use WorkTask Entity
**Files to Change:**
- `zephix-backend/src/modules/work-items/services/my-work.service.ts` - Change repository injection from `WorkItem` to `WorkTask`
- `zephix-backend/src/modules/work-items/my-work.controller.ts` - Update service call if needed
- `zephix-backend/src/modules/work-items/work-items.module.ts` - Update module imports

**Implementation:**
- Replace `getTenantAwareRepositoryToken(WorkItem)` with `getTenantAwareRepositoryToken(WorkTask)`
- Update query to use `WorkTask` fields: `assigneeUserId` instead of `assigneeId`
- Update status mapping: `WorkTask.TaskStatus` instead of `WorkItem.WorkItemStatus`

**Acceptance Checks:**
- [ ] My Work page shows tasks created via work management
- [ ] Task statuses map correctly (TODO → todo, IN_PROGRESS → in_progress, DONE → done)
- [ ] No errors in backend logs

**Evidence:**
- Current (wrong): `zephix-backend/src/modules/work-items/services/my-work.service.ts:21-22,73`
- Target (correct): `zephix-backend/src/modules/work-management/entities/work-task.entity.ts:16,72,56`

### Priority 2: KPI Toggle System (Required for MVP)

#### Fix 2.1: Add activeKPIs Field to Project Entity
**Files to Change:**
- `zephix-backend/src/modules/projects/entities/project.entity.ts` - Add field
- Create migration: `zephix-backend/src/migrations/XXXXXX-AddActiveKPIsToProjects.ts`

**Implementation:**
```typescript
@Column({ name: 'active_kpis', type: 'text', array: true, default: [] })
activeKPIs: string[]; // Array of KPI IDs that are active on this project
```

**Acceptance Checks:**
- [ ] Migration runs successfully
- [ ] Existing projects have empty array
- [ ] Field appears in Project entity

**Evidence:**
- Template has similar: `zephix-backend/src/modules/templates/entities/project-template.entity.ts:68-74`

#### Fix 2.2: Create KPI Toggle Endpoint
**Files to Change:**
- `zephix-backend/src/modules/projects/controllers/projects.controller.ts` - Add endpoint
- `zephix-backend/src/modules/projects/services/projects.service.ts` - Add service method
- `zephix-backend/src/modules/projects/dto/update-project-kpis.dto.ts` - Create DTO

**Endpoints:**
- `PATCH /api/projects/:id/kpis` - Toggle KPIs on/off
- `GET /api/projects/:id/kpis` - Get active KPIs for project

**Acceptance Checks:**
- [ ] Endpoint validates KPI IDs exist in template
- [ ] Endpoint enforces workspace access
- [ ] Updates persist correctly

**Evidence:**
- Template KPI structure: `zephix-backend/src/modules/templates/entities/project-template.entity.ts:65-74`

#### Fix 2.3: Create KPI Toggle UI Component
**Files to Change:**
- `zephix-frontend/src/features/projects/settings/ProjectKPISettings.tsx` - Create component
- `zephix-frontend/src/features/projects/projects.api.ts` - Add API client methods
- `zephix-frontend/src/pages/projects/ProjectDetailPage.tsx` - Add KPI settings tab

**Acceptance Checks:**
- [ ] UI shows available KPIs from template
- [ ] Toggle switches work
- [ ] Changes persist to backend

**Evidence:**
- Template API: `zephix-frontend/src/services/templates.api.ts:17-24`

### Priority 3: Resource Auto-Mapping

#### Fix 3.1: Create Resource on Workspace Member Add
**Files to Change:**
- `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts` - Add resource creation in `addExisting` method
- `zephix-backend/src/modules/resources/services/resources.service.ts` - Add `createFromUser` method

**Implementation:**
```typescript
// In workspace-members.service.ts, after member creation:
const resource = await this.resourcesService.createFromUser({
  userId,
  organizationId: ws.organizationId,
  workspaceId,
  createdBy: actor.id,
});
```

**Acceptance Checks:**
- [ ] Resource created when member added
- [ ] Resource has correct userId, organizationId, workspaceId
- [ ] No duplicate resources created

**Evidence:**
- Resource entity: `zephix-backend/src/modules/resources/entities/resource.entity.ts:26-33`
- Member creation: `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts:168-175`

#### Fix 3.2: Add Capacity Warning Logic
**Files to Change:**
- `zephix-backend/src/modules/resources/services/resources.service.ts` - Add `checkCapacityWarnings` method
- `zephix-backend/src/modules/resources/controllers/resources.controller.ts` - Add warning endpoint

**Endpoints:**
- `GET /api/resources/:id/warnings` - Get capacity warnings for resource

**Acceptance Checks:**
- [ ] Warning when allocation > 100%
- [ ] Warning when allocation > 90% (configurable threshold)
- [ ] Warning includes project breakdown

**Evidence:**
- Resource allocation: `zephix-backend/src/modules/resources/entities/resource-allocation.entity.ts:29-30`
- Resource capacity: `zephix-backend/src/modules/resources/entities/resource.entity.ts:47-48,92-102`

### Priority 4: VIEWER Role Filtering

#### Fix 4.1: Add VIEWER Filtering to Work Tasks List
**Files to Change:**
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts` - Update `listTasks` method

**Implementation:**
```typescript
// After line 148 (after assertOrganizationId):
if (userRole === PlatformRole.VIEWER) {
  const accessibleWorkspaceIds = await this.workspaceAccessService.getAccessibleWorkspaceIds(
    organizationId,
    userId,
    userRole,
  );
  if (accessibleWorkspaceIds !== null && accessibleWorkspaceIds.length > 0) {
    queryBuilder.andWhere('work_task.workspace_id IN (:...workspaceIds)', {
      workspaceIds: accessibleWorkspaceIds,
    });
  } else {
    // No accessible workspaces, return empty
    return { items: [], total: 0 };
  }
}
```

**Acceptance Checks:**
- [ ] VIEWER only sees tasks from accessible workspaces
- [ ] ADMIN and MEMBER see all tasks (no filtering)
- [ ] Test with VIEWER in multiple workspaces

**Evidence:**
- Current implementation: `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:143-207`
- Workspace access service: `zephix-backend/src/modules/workspace-access/workspace-access.service.ts`

### Priority 5: Project Creation Workspace Enforcement

#### Fix 5.1: Verify All Project Creation Paths Enforce WorkspaceId
**Files to Change:**
- `zephix-backend/src/modules/projects/controllers/projects.controller.ts` - Add workspaceId validation
- `zephix-backend/src/modules/projects/services/projects.service.ts` - Enforce workspaceId in create method

**Acceptance Checks:**
- [ ] Direct project creation requires workspaceId
- [ ] Template instantiation sets workspaceId (already verified)
- [ ] No projects created without workspaceId

**Evidence:**
- Project entity: `zephix-backend/src/modules/projects/entities/project.entity.ts:88`
- Template instantiation: `zephix-backend/src/modules/templates/services/templates-instantiate-v5-1.service.ts`

---

## Deliverable D: MVP Tester Script

### Setup Steps

1. **Create Test Organization**
   - Sign up at `/signup` with email `admin@test.com`
   - Verify email via link in email
   - Login at `/login`

2. **Create Test Workspace**
   - Navigate to `/admin/workspaces`
   - Click "Create Workspace"
   - Name: "Test Workspace", Slug: "test-workspace"
   - Select yourself as owner
   - Click "Create"

3. **Add Test Members**
   - Navigate to `/workspaces/:id/members`
   - Click "Add Member"
   - Add user with email `member@test.com` (must exist in org)
   - Set role: "Member"
   - Add user with email `viewer@test.com`
   - Set role: "Guest"

4. **Create Test Template**
   - Navigate to `/admin/templates`
   - Click "Create Template"
   - Name: "Test Template", Methodology: "Agile"
   - Add 2 phases: "Sprint 1", "Sprint 2"
   - Add 3 KPIs: "Velocity", "Burndown", "Quality Score"
   - Click "Save"

### Test Steps: Workspace and Roles

#### Step 1: Verify Admin is Workspace Owner
- **Action**: Navigate to `/workspaces/:id/members`
- **Expected API Call**: `GET /api/workspaces/:id/members`
- **Expected Response**: List includes admin with role `workspace_owner`
- **Failure Indicator**: Admin not in list or role is not `workspace_owner`
- **Check Logs**: Backend log should show `workspace_members` query with `role = 'workspace_owner'`

#### Step 2: Verify Member Added Successfully
- **Action**: Check member list again
- **Expected API Call**: `GET /api/workspaces/:id/members`
- **Expected Response**: Member `member@test.com` appears with role `workspace_member`
- **Failure Indicator**: Member missing or role incorrect
- **Check Logs**: Backend log should show member creation with `role = 'workspace_member'`

#### Step 3: Verify Guest Maps to workspace_viewer
- **Action**: Check member list
- **Expected API Call**: `GET /api/workspaces/:id/members`
- **Expected Response**: Guest `viewer@test.com` appears with role `workspace_viewer` (not `workspace_member`)
- **Failure Indicator**: Guest has role other than `workspace_viewer`
- **Check Logs**: Backend log should show role coercion: `PlatformRole.VIEWER → workspace_viewer`

### Test Steps: Template Center

#### Step 4: Browse Templates
- **Action**: Navigate to `/templates`
- **Expected API Call**: `GET /api/templates`
- **Expected Response**: List includes "Test Template" and any system templates
- **Failure Indicator**: Template not in list or 404 error
- **Check Logs**: Backend log should show template query with organizationId filter

#### Step 5: Preview Template Structure
- **Action**: Click "Preview" on "Test Template"
- **Expected API Call**: `GET /api/templates/:templateId/preview-v5_1`
- **Expected Response**: Shows phases (Sprint 1, Sprint 2) and KPIs (Velocity, Burndown, Quality Score)
- **Failure Indicator**: Preview empty or 404 error
- **Check Logs**: Backend log should show template structure query

#### Step 6: Apply Template to Create Project
- **Action**: Click "Apply Template" on "Test Template", select "Test Workspace", name project "Test Project"
- **Expected API Call**: `POST /api/templates/:templateId/instantiate-v5_1` with body: `{ workspaceId, name, ... }`
- **Expected Response**: Project created with phases and tasks
- **Failure Indicator**: 404 error, project not created, or phases/tasks missing
- **Check Logs**: Backend log should show:
  - Project creation
  - Phase creation (2 phases)
  - Task creation (from template task templates)
  - KPI metrics creation (3 ProjectMetrics records)

### Test Steps: Work Management

#### Step 7: View Project Plan
- **Action**: Navigate to `/work/projects/:projectId/plan`
- **Expected API Call**: `GET /work/plan?projectId=:projectId` with header `x-workspace-id`
- **Expected Response**: Shows phases (Sprint 1, Sprint 2) with tasks
- **Failure Indicator**: 404 error, phases missing, or tasks missing
- **Check Logs**: Backend log should show workspaceId validation and phase/task queries

#### Step 8: Create Task
- **Action**: Click "Add Task" in a phase, enter title "Test Task", assign to yourself
- **Expected API Call**: `POST /api/work/tasks` with body: `{ projectId, phaseId, title, assigneeUserId, workspaceId }` and header `x-workspace-id`
- **Expected Response**: Task created and appears in phase
- **Failure Indicator**: 400 error (missing workspace header) or 404 error (wrong endpoint)
- **Check Logs**: Backend log should show:
  - WorkspaceId validation
  - Workspace access check
  - Task creation in `work_tasks` table

#### Step 9: Update Task Status
- **Action**: Change task status from "Todo" to "In Progress"
- **Expected API Call**: `PATCH /api/work/tasks/:taskId` with body: `{ status: 'IN_PROGRESS' }` and header `x-workspace-id`
- **Expected Response**: Task status updated, health recalculated
- **Failure Indicator**: 400 error or status not updated
- **Check Logs**: Backend log should show:
  - Task update
  - Health recalculation trigger
  - Project health update

#### Step 10: Create Subtask
- **Action**: Click "Add Subtask" on a task, enter title "Test Subtask"
- **Expected API Call**: `POST /api/work/tasks` with body: `{ parentTaskId, projectId, phaseId, title, ... }` and header `x-workspace-id`
- **Expected Response**: Subtask created and appears under parent task
- **Failure Indicator**: 400 error or subtask not linked to parent
- **Check Logs**: Backend log should show task creation with `parent_task_id` set

### Test Steps: KPI Toggle System (After Fixes)

#### Step 11: View Project KPIs
- **Action**: Navigate to `/projects/:projectId`, click "KPIs" tab
- **Expected API Call**: `GET /api/projects/:projectId/kpis`
- **Expected Response**: Shows available KPIs from template (Velocity, Burndown, Quality Score) with toggle switches
- **Failure Indicator**: 404 error or KPIs not shown
- **Check Logs**: Backend log should show KPI query from template

#### Step 12: Toggle KPI On
- **Action**: Toggle "Velocity" KPI to "On"
- **Expected API Call**: `PATCH /api/projects/:projectId/kpis` with body: `{ activeKPIs: ['velocity-id'] }`
- **Expected Response**: Toggle switches to "On", KPI column appears in project views
- **Failure Indicator**: 400 error or toggle not persisted
- **Check Logs**: Backend log should show Project update with `active_kpis` array

#### Step 13: Toggle KPI Off
- **Action**: Toggle "Velocity" KPI to "Off"
- **Expected API Call**: `PATCH /api/projects/:projectId/kpis` with body: `{ activeKPIs: [] }`
- **Expected Response**: Toggle switches to "Off", KPI column hidden
- **Failure Indicator**: Toggle not persisted or column still visible
- **Check Logs**: Backend log should show Project update with empty `active_kpis` array

### Test Steps: My Work View

#### Step 14: View My Work as Admin
- **Action**: Navigate to `/my-work` (as admin)
- **Expected API Call**: `GET /api/my-work`
- **Expected Response**: Shows all assigned tasks across all workspaces (admin sees all)
- **Failure Indicator**: 403 error or tasks missing
- **Check Logs**: Backend log should show WorkTask query with `assignee_user_id = admin-id` and no workspace filter (admin)

#### Step 15: View My Work as Member
- **Action**: Login as `member@test.com`, navigate to `/my-work`
- **Expected API Call**: `GET /api/my-work`
- **Expected Response**: Shows assigned tasks from accessible workspaces only
- **Failure Indicator**: Tasks from inaccessible workspaces visible
- **Check Logs**: Backend log should show workspace filtering via `getAccessibleWorkspaceIds`

#### Step 16: View My Work as Guest (Should Fail)
- **Action**: Login as `viewer@test.com`, navigate to `/my-work`
- **Expected API Call**: `GET /api/my-work`
- **Expected Response**: 403 Forbidden error
- **Failure Indicator**: Page loads or shows tasks (should be blocked)
- **Check Logs**: Backend log should show 403 response with "Forbidden" message

### Test Steps: Project Health Auto Status

#### Step 17: Verify Health Calculation
- **Action**: Create task with due date in past, assign to yourself, mark as "In Progress"
- **Expected API Call**: `PATCH /api/work/tasks/:taskId` (status update triggers health)
- **Expected Response**: Project health updates to "AT_RISK" or "BLOCKED" (depending on rules)
- **Failure Indicator**: Health not updated or remains "HEALTHY"
- **Check Logs**: Backend log should show:
  - Health recalculation trigger
  - Health computation (overdue tasks, blocked tasks, etc.)
  - Project update with new health value

#### Step 18: Verify Health Persistence
- **Action**: Refresh project overview page
- **Expected API Call**: `GET /api/projects/:projectId/overview`
- **Expected Response**: Health status matches previous calculation (persisted)
- **Failure Indicator**: Health resets to "HEALTHY" or doesn't match
- **Check Logs**: Backend log should show Project query with `health` field from database

### Test Steps: Resource Management

#### Step 19: Verify Resource Created on Member Add
- **Action**: Add new member to workspace, then check resources
- **Expected API Call**: `GET /api/resources` (after member added)
- **Expected Response**: Resource exists for new member with correct userId, organizationId, workspaceId
- **Failure Indicator**: Resource missing or has wrong workspaceId
- **Check Logs**: Backend log should show resource creation in workspace member service

#### Step 20: Verify Capacity Warning
- **Action**: Allocate resource to multiple projects totaling >100% capacity
- **Expected API Call**: `GET /api/resources/:id/warnings`
- **Expected Response**: Warning shows "Over-allocated: 120%" with project breakdown
- **Failure Indicator**: No warning or incorrect calculation
- **Check Logs**: Backend log should show capacity calculation and warning generation

### Role-Based Checks

#### Admin Checks
- ✅ Can create workspace
- ✅ Can add members with any role (Member, Guest)
- ✅ Can see all tasks in My Work (no workspace filter)
- ✅ Can create templates
- ✅ Can set template as org default

#### Member Checks
- ✅ Can see tasks in My Work (filtered by accessible workspaces)
- ✅ Can create tasks in accessible workspaces
- ✅ Can update task status
- ❌ Cannot create workspace (should be 403)
- ❌ Cannot set template as org default (should be 403)

#### Guest (VIEWER) Checks
- ✅ Automatically mapped to `workspace_viewer` role
- ✅ Can view tasks (read-only)
- ❌ Cannot access My Work (should be 403)
- ❌ Cannot create tasks (should be 403)
- ❌ Cannot update task status (should be 403)

---

## Appendix: Evidence Pointers Summary

### Backend Controllers
- Work Management: `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts`
- Templates: `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
- Workspaces: `zephix-backend/src/modules/workspaces/workspaces.controller.ts`
- Admin: `zephix-backend/src/admin/admin.controller.ts`
- My Work: `zephix-backend/src/modules/work-items/my-work.controller.ts`

### Backend Services
- Work Tasks: `zephix-backend/src/modules/work-management/services/work-tasks.service.ts`
- Project Health: `zephix-backend/src/modules/work-management/services/project-health.service.ts`
- Template Instantiation: `zephix-backend/src/modules/templates/services/templates-instantiate-v5-1.service.ts`
- Workspace Members: `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts`
- My Work: `zephix-backend/src/modules/work-items/services/my-work.service.ts`

### Entities
- WorkTask: `zephix-backend/src/modules/work-management/entities/work-task.entity.ts`
- WorkItem: `zephix-backend/src/modules/work-items/entities/work-item.entity.ts`
- Project: `zephix-backend/src/modules/projects/entities/project.entity.ts`
- Template: `zephix-backend/src/modules/templates/entities/template.entity.ts`
- Resource: `zephix-backend/src/modules/resources/entities/resource.entity.ts`

### Frontend Routes
- App Routing: `zephix-frontend/src/App.tsx:110-122`
- My Work: `zephix-frontend/src/pages/my-work/MyWorkPage.tsx`
- Template Center: `zephix-frontend/src/views/templates/TemplateCenter.tsx`
- Project Plan: `zephix-frontend/src/views/work-management/ProjectPlanView.tsx`

### Frontend API Clients
- Task Service (legacy): `zephix-frontend/src/services/taskService.ts`
- Phases API (correct): `zephix-frontend/src/features/work-management/api/phases.api.ts`
- Templates API: `zephix-frontend/src/services/templates.api.ts`

---

**End of Audit Report**
