# Execution System Decision — Architect Brief

**Audience:** Enterprise Architect
**Purpose:** Single source of truth for task execution; decision criteria, current state, and implementation path.
**Date:** 2025-02-02

---

## 1. Decision criteria (how we evaluate)

| Criterion | Description |
|----------|-------------|
| **Tenant safety** | organizationId/workspaceId on every path; no cross-workspace leakage; VIEWER filtered to accessible workspaces. |
| **API contract clarity** | One canonical contract for tasks (list, get, create, update, delete, dependencies, comments); consistent DTOs and error codes. |
| **Data model fitness** | Supports phases, hierarchy, dependencies, comments, activity, bulk ops; aligns to template → project → phases → tasks lineage. |
| **Workflow enforcement** | Status transitions validated; soft delete where needed; structure guards (e.g. template lock). |
| **Auditability** | Audit events and evidence pack generation; lineage from template to work tasks. |
| **Frontend alignment cost** | Single API client pattern; all task UI calling one set of endpoints with guaranteed workspace header. |
| **Migration risk** | Clear cutover: one write path; legacy read-only or behind flag; data migration path if required. |

---

## 2. What you have today

### 2.1 Legacy tasks module

**Backend**

- **Routes:** `GET/POST /api/tasks`, `GET /api/tasks/project/:projectId`, `GET/PATCH/DELETE /api/tasks/:id`, `PATCH /api/tasks/:id/progress`, `GET /api/tasks/my-tasks`, `POST/DELETE/GET /api/tasks/:id/dependencies`.
- **Controller:** `zephix-backend/src/modules/tasks/tasks.controller.ts` — `@Controller('tasks')`.
- **Service:** `TasksService` — uses `TenantAwareRepository<Task>`; scopes by `organizationId` (and projectId for list).
- **Entity:** `tasks` table — `Task` entity (`zephix-backend/src/modules/tasks/entities/task.entity.ts`): projectId, organizationId, name, status (string), progress, assignee, phases commented out; no workspaceId; no phaseId.
- **Tenancy:** Organization-scoped only. No `x-workspace-id`; no workspace-scoped filtering. VIEWER/accessibleWorkspaceIds not applied.

**Strengths**

- Existing UI usage in several places.
- Simpler data model (single table, no phases in entity).

**Weaknesses**

- Coexists with work_tasks → split brain (two task systems).
- Contract mismatch: legacy uses `tasks/project/:id` and free-form status strings; long-term contract uses workspace-scoped `/work/tasks?projectId=` and enum statuses.
- No workspace header enforcement; old code paths can bypass workspace/guard patterns.
- Not aligned to Template instantiate v5.1 (v5.1 creates WorkPhase + WorkTask, not Task).

---

### 2.2 Projects module task controller (nested under projects)

**Backend**

- **Routes:** `GET/POST /api/projects/:projectId/tasks`, `GET/PATCH/DELETE /api/projects/:projectId/tasks/:id`, `PUT /api/projects/:projectId/tasks/:id/progress`.
- **Controller:** `zephix-backend/src/modules/projects/controllers/task.controller.ts` — `@Controller('projects/:projectId/tasks')`.
- **Service:** Projects `TaskService` (different from `TasksService`); findOne/update/delete by id without consistent org/workspace checks in controller (service may differ).
- **Entity:** Can reference project-scoped task entity (projects or tasks module).

**Note:** This is a second legacy surface: project-nested tasks. Frontend backup file `TaskList.backup.tsx` calls `GET /projects/${projectId}/tasks`.

**Weaknesses**

- Another competing contract; no `x-workspace-id` in route design; increases split brain.

---

### 2.3 Work management module (work_tasks, work_phases)

**Backend**

- **Routes (summary):**
  - **Tasks:** `GET /api/work/tasks` (query: projectId, status, assigneeUserId, search, includeArchived, limit, offset), `POST /api/work/tasks`, `GET/PATCH/DELETE /api/work/tasks/:id`, bulk status, dependencies, comments, activity.
  - **Phases:** `GET/POST/PATCH/DELETE /api/work/projects/:projectId/phases`.
  - **Plan:** `GET /api/work/projects/:projectId/plan` (phases + tasks).
- **Controllers:** `WorkTasksController` (`work/tasks`), `WorkPhasesController`, `WorkPlanController`.
- **Services:** WorkTasksService, TaskDependenciesService, TaskCommentsService, TaskActivityService, WorkPhasesService, WorkPlanService, ProjectStructureGuardService, etc.
- **Entities:** `work_tasks`, `work_phases`, task dependencies, task comments, task activity; all with organizationId + workspaceId.
- **Tenancy:** Every work endpoint requires `x-workspace-id`; validated in controller; `WorkspaceAccessService.canAccessWorkspace` used in service. Tenant-aware repositories used.
- **Template v5.1:** `POST /api/templates/:templateId/instantiate-v5_1` creates Project + WorkPhase(s) + WorkTask(s) and sets templateId/templateVersion on project. This is the platform spine for deterministic execution from Template Center.

**Strengths**

- Designed for workspace-scoped execution; phases, task hierarchy, dependencies, comments, activity, bulk ops.
- Tenant-aware repository patterns and workspace guard in core paths.
- Aligns to template instantiate v5.1 (single execution contract from template → work plan).
- Better foundation for list, board, timeline, gantt, phase-based plan views.

**Weaknesses**

- Frontend still calls legacy task endpoints in some places (see frontend list below).
- Status transition validation not yet enforced in service layer.
- Soft delete not implemented for work_tasks/work_phases.
- Viewer role filtering (accessibleWorkspaceIds) on list endpoints needs tightening.

---

### 2.4 Work-items module (separate from work_tasks)

**Backend**

- **Routes:** `/api/work-items`, `/api/work-items/project/:projectId`, etc. (create, update status, comments, bulk update/delete).
- **Frontend:** `TaskListSection.tsx` and `ProjectTasksList.tsx` use `/work-items` APIs.

**Note:** This is a third surface (work-items vs work_tasks). For “one execution system,” the decision is work management (work_tasks). Work-items may be legacy or a different abstraction; consolidation would mean either migrating work-items usage to work/tasks or clearly defining when to use which (and then still making work/tasks the single source of truth for template-driven execution).

---

## 3. Which is better for Zephix

**Work management (work_tasks + work_phases) is the better platform execution system.**

**Reason**

- The platform differentiator is governance plus deterministic execution from Template Center with lineage and evidence. Template instantiate v5.1 creates WorkPhases and WorkTasks; that makes work management the natural execution contract.
- Keeping legacy tasks (and project-nested tasks) active maintains two (or three) competing execution contracts and blocks MVP readiness because you keep chasing contract and tenancy mismatches.

---

## 4. What to do next (in sequence)

1. **Declare one source of truth**
   Work management is the only write path for tasks in MVP user journeys. Legacy tasks (and optionally project-nested tasks) become read-only or hidden behind an internal flag.

2. **Fix the frontend contract**
   Update all task reads/writes to use `/api/work/tasks` and `/api/work/projects` (plan/phases) endpoints. Enforce `x-workspace-id` on every work call from a single API client/interceptor (see “Frontend files” below).

3. **Close safety gaps in work management**
   Add status transition validation in the service layer. Add soft delete to work_tasks and work_phases (and restore endpoints if trash is in MVP). Add VIEWER filtering (accessibleWorkspaceIds) on list endpoints.

4. **Migration and cleanup**
   Identify remaining legacy `tasks` table usage. Migrate data into work_tasks if continuity is required. Remove or lock legacy task endpoints after migration.

5. **MVP proof path**
   Workspace select → Template apply → project with phases and tasks → Work plan view reads work phases/tasks → Task create/update/comment/dependency → Audit events and evidence pack generation.

---

## 5. Fast decision test (30 minutes)

- If “Template apply v5.1” creates work tasks and the work plan view is meant to show phase-based execution, the answer is work management.
- If the primary UI still depends on legacy tasks and you are not ready to refactor the UI, you are not ready for MVP anyway, because the platform spine will not hold.

---

## 6. Frontend files: legacy `/tasks` and `/projects/:id/tasks` callers

Below is the list of frontend files that call **legacy** task endpoints (`/tasks` or `/projects/:id/tasks`). Use this for the exact Cursor change plan (file-by-file) and to enforce a single API client pattern with guaranteed `x-workspace-id` for work.

### 6.1 Files calling legacy `/tasks` (or `taskService` which uses `apiClient` → no workspace header)

| File | API client | Endpoints called | Action |
|------|------------|-------------------|--------|
| `zephix-frontend/src/services/taskService.ts` | `apiClient` (auth.interceptor) | `GET /tasks/project/:projectId`, `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `PATCH /tasks/:id/progress`, `GET /projects/:id/phases` | Replace with work/tasks + work plan APIs; switch to `api` from `@/lib/api` (or single work client) so `x-workspace-id` is sent. |
| `zephix-frontend/src/features/workspaces/workspace.api.ts` | `api` (lib/api) | `GET /tasks?workspaceId=:id&due=week` | Legacy backend has no GET `/tasks?workspaceId=`. Replace with `GET /work/tasks?projectId=` (or work plan) scoped by workspace after selecting projects in workspace. |
| `zephix-frontend/src/components/dashboard/MyTasksDashboard.tsx` | `api` (services/api) | `GET /tasks/my-tasks` | Replace with `GET /work/tasks?assigneeUserId=<currentUser>` (with x-workspace-id); or add work management “my tasks” endpoint. |
| `zephix-frontend/src/components/CommandPalette.tsx` | `api` (services/api) | `POST /tasks` with `{ name: taskName }` | Replace with `POST /work/tasks` (body: projectId, phaseId or let backend assign, title, workspace from context); require workspace + project context or disable until in project. |
| `zephix-frontend/src/components/tasks/TaskCard.tsx` | Uses `taskService` (apiClient) | All taskService methods (get, update, delete, progress) | Stop using taskService; use work/tasks API via shared client (e.g. `api` from lib/api with workspace); update types to work task shape. |
| `zephix-frontend/src/components/tasks/CreateTaskModal.tsx` | Uses `taskService` (apiClient) | `taskService.createTask` → `POST /tasks` | Replace with `POST /work/tasks` (projectId, title, etc.) via client that sends x-workspace-id. |

### 6.2 Files calling legacy `/projects/:projectId/tasks`

| File | API client | Endpoints called | Action |
|------|------------|-------------------|--------|
| `zephix-frontend/src/components/tasks/TaskList.backup.tsx` | `api` | `GET /projects/:projectId/tasks` | Already backup; when removing legacy, delete or ensure no imports. If restoring a list view, use `GET /work/tasks?projectId=` + x-workspace-id. |

### 6.3 Files already using `/work/tasks` (align to single client + workspace header)

These already call work management endpoints; ensure they use the same API client that always sends `x-workspace-id` (e.g. `api` from `@/lib/api` or a dedicated work client):

| File | Endpoints called |
|------|-------------------|
| `zephix-frontend/src/pages/projects/ProjectDetailPage.tsx` | `GET /work/tasks?projectId=`, `PATCH /work/tasks/:id` |
| `zephix-frontend/src/features/projects/projects.api.ts` | `GET /work/tasks?projectId=` |
| `zephix-frontend/src/components/tasks/TaskList.tsx` | `GET /work/tasks?projectId=` |
| `zephix-frontend/src/components/tasks/EditTaskModal.tsx` | `GET /work/tasks/:id`, `POST/DELETE /work/tasks/:id/dependencies`, `PATCH /work/tasks/:id` |
| `zephix-frontend/src/components/tasks/CreateTaskForm.tsx` | `POST /work/tasks` |
| `zephix-frontend/src/components/projects/TaskManagement.tsx` | `GET /work/tasks?projectId=`, `PATCH /work/tasks/:id`, `POST /work/tasks` |

**Note:** `lib/api.ts` and `services/api.ts` both add `x-workspace-id` when available. Work endpoints require workspace; ensure all work callers use one of these clients and that workspace is set (e.g. from route or store) before any work call.

### 6.4 Other task-related UI (no direct legacy task URL in snippet)

- `zephix-frontend/src/app/Sidebar.tsx` — route link `to='/tasks'` only (no API).
- `zephix-frontend/src/features/projects/components/TaskListSection.tsx` — uses `/work-items` (see work-items vs work_tasks note above).
- `zephix-frontend/src/features/work-items/ProjectTasksList.tsx` — uses work-items API.

---

## 7. Single API client pattern for workspace headers

- **Current:** `lib/api.ts` and `services/api.ts` add `x-workspace-id` from store/context for non-auth, non-health URLs. `auth.interceptor` (apiClient) does **not** add `x-workspace-id`.
- **Recommendation:** Use one axios instance for all **work** (and workspace-scoped) calls: e.g. `api` from `@/lib/api`. Ensure:
  - Every call to `/work/*` (and any task/project write) goes through this client.
  - Interceptor adds `x-workspace-id` from `useWorkspaceStore.getState().activeWorkspaceId` (or equivalent).
  - For routes that require workspace, fail fast if `activeWorkspaceId` is null (e.g. reject with `WORKSPACE_REQUIRED`) so no request is sent without header.
- **Concrete:** Replace `taskService` (and any direct `apiClient` usage for tasks) with a single `workTasksApi` (or use `api` from lib/api) that only talks to `/work/tasks` and `/work/projects`, and ensure that client is the one with the workspace interceptor. Then delete or read-only legacy task endpoints.

---

## 8. Summary table

| System | Controller | Entity | Workspace header | Template v5.1 | Suggested role |
|--------|------------|--------|------------------|----------------|-----------------|
| Legacy tasks | `tasks.controller` | `Task` (tasks) | No | No | Read-only or behind flag |
| Projects tasks | `projects/controllers/task.controller` | (project tasks) | No | No | Read-only or behind flag |
| Work management | WorkTasksController, WorkPhasesController | WorkTask, WorkPhase | Yes (required) | Yes | **Single source of truth** |
| Work-items | work-items controller | WorkItem | Via api (lib) | No | Consolidate or define boundary |

This brief gives your architect everything in one place: criteria, current state, decision, next steps, and the exact frontend file list for the Cursor change plan and single API client pattern.
