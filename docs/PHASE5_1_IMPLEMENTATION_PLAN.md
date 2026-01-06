# Phase 5.1: Work Management System - Implementation Plan

**Status**: In Progress
**Branch**: `phase5-1-work-management`
**Target**: First Customer UAT

## Overview

Implement Work Management System MVP for first customer UAT. This phase focuses on core work item management: tasks, dependencies, comments, and activity tracking.

## Guardrails

- **Do not change Phase 4 dashboard APIs** except for bug fixes
- **Do not add new dashboard endpoints** in Phase 5.1
- **Do not expand AI dashboard features** beyond current suggest and generate
- **Dashboard freeze**: Maintenance only until Phase 5.1 and Template Center are UAT-ready

## Implementation Steps

### Step 0: Branch, Baselines, and Documentation Anchor ✅

- [x] Checkout latest main
- [x] Create branch: `phase5-1-work-management`
- [x] Create `docs/PHASE5_1_IMPLEMENTATION_PLAN.md`
- [x] Create `docs/DASHBOARD_MASTER_PLAN.md`
- [ ] Update/create `docs/PHASE5_ROADMAP.md` and link both docs

### Step 1: Dashboard Master Plan Document ✅

- [x] Create `docs/DASHBOARD_MASTER_PLAN.md` with all sections
- [x] Document current state
- [x] Document v1 scope
- [x] Document backlog grouped by category
- [x] Document definition of done

### Step 2: Work Management Data Model Design

**Entities:**

1. **Project** (Existing - Verify)
   - Confirm existing fields
   - Ensure `workspaceId`, `organizationId` present
   - Ensure `status`, `startDate`, `endDate` present

2. **Task** (New Entity)
   - `id` uuid
   - `organizationId` uuid indexed
   - `workspaceId` uuid indexed
   - `projectId` uuid indexed
   - `title` varchar(200) required
   - `description` text nullable
   - `status` enum TaskStatus required default TODO
   - `type` enum TaskType required default TASK
   - `priority` enum Priority required default P2
   - `startDate` date nullable
   - `dueDate` date nullable
   - `estimateHours` numeric(6,2) nullable
   - `ownerUserId` uuid nullable indexed
   - `createdByUserId` uuid required
   - `updatedByUserId` uuid nullable
   - `createdAt`, `updatedAt`

3. **TaskDependency** (New Entity)
   - `id` uuid
   - `organizationId` uuid indexed
   - `workspaceId` uuid indexed
   - `projectId` uuid indexed
   - `predecessorTaskId` uuid indexed
   - `successorTaskId` uuid indexed
   - `type` enum DependencyType default FINISH_TO_START
   - `createdByUserId` uuid required
   - `createdAt`
   - **Unique constraint**: `successorTaskId + predecessorTaskId` unique

4. **TaskComment** (New Entity)
   - `id` uuid
   - `taskId` uuid indexed
   - `body` text required
   - `createdByUserId` uuid required
   - `createdAt`

5. **TaskActivity** (New Entity)
   - `id` uuid
   - `taskId` uuid indexed
   - `type` enum TaskActivityType
   - `payload` jsonb
   - `createdByUserId` uuid required
   - `createdAt`

### Step 3: Migrations

- [ ] Create migration for Task, TaskDependency, TaskComment, TaskActivity
- [ ] Add indices and constraints
- [ ] Run migration locally
- [ ] Add migration proof snippet template to this document

**Migration Proof Template:**
```bash
# Verify migration executed
psql "$DATABASE_URL" -c "SELECT id, timestamp, name FROM migrations WHERE name LIKE '%WorkManagement%' ORDER BY id DESC LIMIT 5;"

# Verify tables created
psql "$DATABASE_URL" -c "\d tasks"
psql "$DATABASE_URL" -c "\d task_dependencies"
psql "$DATABASE_URL" -c "\d task_comments"
psql "$DATABASE_URL" -c "\d task_activities"

# Verify indices
psql "$DATABASE_URL" -c "\di *task*"
```

### Step 4: Backend Module Structure

Create module: `work-management`

**Files:**
- `work-management.module.ts`
- `tasks.controller.ts`
- `tasks.service.ts`
- `task-dependencies.controller.ts`
- `task-dependencies.service.ts`
- `task-comments.controller.ts`
- `task-comments.service.ts`
- `task-activity.service.ts`

**Rules:**
- All endpoints require JWT
- All endpoints require `x-workspace-id`
- Use `WorkspaceAccessService` to verify workspace access
- Use `organizationId` from auth context
- Never infer `workspaceId` from path

### Step 5: DTOs and Validation

**Tasks:**
- `CreateTaskDto`
- `UpdateTaskDto`
- `BulkUpdateTasksDto`
- `ListTasksQueryDto`

**Dependencies:**
- `AddDependencyDto`
- `RemoveDependencyDto`

**Comments:**
- `AddCommentDto`
- `ListCommentsQueryDto`

**Validation Rules:**
- `title` required on create
- `status` must be enum
- dates ISO date only
- `estimateHours` numeric positive
- `ownerUserId` uuid

### Step 6: Services

**TasksService:**
- `createTask`
- `updateTask`
- `bulkUpdate`
- `listTasks` with filters
- `getTaskById`
- `deleteTask`

**TaskDependenciesService:**
- `addDependency`
- `removeDependency`
- `listDependencies`
- Validate same workspace, same project
- Prevent cycles (implement DFS check in service)

**TaskCommentsService:**
- `addComment`
- `listComments`

**TaskActivityService:**
- `recordActivity`
- Return activity feed

**Activity Emission Requirements:**
- On create task: `TASK_CREATED`
- On status change: `TASK_STATUS_CHANGED`
- On owner change: `TASK_OWNER_CHANGED`
- On dueDate change: `TASK_DUE_DATE_CHANGED`
- On dependency add and remove
- On comment added

### Step 7: Controllers and Route Order

**TasksController:**
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PATCH /api/tasks/bulk` (static route before `:id`)

**TaskDependenciesController:**
- `POST /api/tasks/:id/dependencies`
- `DELETE /api/tasks/:id/dependencies/:depId`
- `GET /api/tasks/:id/dependencies`

**TaskCommentsController:**
- `POST /api/tasks/:id/comments`
- `GET /api/tasks/:id/comments`

**Route Order Rule:**
Static routes before `:id`. Ensure `bulk` appears before `:id` if it shares the same controller path.

### Step 8: Frontend Minimal UI for UAT

**Pages:**
- `/projects`
- `/projects/:id`
- `/projects/:id/board`
- `/projects/:id/list`

**Features:**
- Create task
- Edit status
- Assign owner
- Set due date
- Add comment
- Add dependency basic UI
- Filters by status and owner

**Workspace Requirement:**
- If workspace not selected, show single clear message and a button to open workspace selector

### Step 9: Verification Scripts

- [ ] Create `scripts/phase5-1-work-management-verify.sh`

**Must:**
- Login using `source scripts/auth-login.sh` workflow
- Discover `ORG_ID` and `WORKSPACE_ID`
- Create a project if needed
- Create tasks
- Bulk update tasks
- Add dependency
- Verify cycle prevention
- Add comment
- Fetch activity feed
- Assert all 200 or expected error codes

### Step 10: E2E Tests Backend

- [ ] Add `zephix-backend/test/work-management.e2e-spec.ts`

**Cover:**
- Workspace header required
- Create task
- List tasks
- Bulk update
- Add dependency
- Cycle prevention returns 400
- Comment add and list
- Activity emitted

### Step 11: CI Regression Guards

- [ ] Add route order checks for:
  - Tasks controller
  - Dependencies controller
  - Comments controller

### Step 12: Release Log

- [ ] Create `docs/RELEASE_LOG_PHASE5.md`
- [ ] Add Phase 5.1 section with proof placeholders:
  - `/api/version` output
  - Migration output
  - Verification script output
  - Smoke checklist

### Step 13: Commits

Commit in this exact order:

1. `feat(work): add work management entities and migrations`
2. `feat(work): add tasks, dependencies, comments, activity APIs`
3. `test(work): add e2e suite and verification script`
4. `docs(phase5): add implementation plan, release log, dashboard master plan`

## Walkthrough to Run Locally

### Backend

**Terminal A:**
```bash
cd zephix-backend
export DATABASE_URL=your_local_postgres_url
npm run migration:run
npm run start:dev
```

**Terminal B:**
```bash
export BASE="http://localhost:3000"
export EMAIL=your_uat_email
export PASSWORD=your_uat_password
source scripts/auth-login.sh
bash scripts/phase5-1-work-management-verify.sh
```

### Frontend

**Terminal C:**
```bash
cd zephix-frontend
npm run dev
```

**Open:**
- `http://localhost:5173`

**Steps:**
1. Select workspace first
2. Go to Projects
3. Open project
4. Use List or Board view

## Related Documents

- `docs/DASHBOARD_MASTER_PLAN.md` - Dashboard roadmap and freeze rationale
- `docs/PHASE5_ROADMAP.md` - Overall Phase 5 roadmap
- `docs/RELEASE_LOG_PHASE5.md` - Phase 5 release log

