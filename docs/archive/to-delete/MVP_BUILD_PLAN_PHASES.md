# MVP Build Plan: Phases and Priorities

**Date:** January 15, 2026
**Based on:** LinkedIn pain points and ClickUp differentiation strategy

---

## Phase 1: Unblock Core Execution ✅ COMPLETE

**Goal:** Templates create projects, tasks work, My Work shows assignments

**Status:** ✅ Complete

**What Was Built:**
- ✅ Templates create projects inside workspaces
- ✅ Project opens cleanly
- ✅ Tasks and phases load and update
- ✅ My Work shows assigned tasks in workspace
- ✅ Work management unified on WorkTask
- ✅ Workspace context enforced

**Acceptance:**
- ✅ No 404s on task endpoints
- ✅ No 403s after workspace selection
- ✅ Tasks appear in project views and My Work

---

## Phase 2: KPI Lego System ✅ MVP COMPLETE

**Goal:** KPI catalog, activation, manual values, computed pipeline

**Status:** ✅ MVP Complete, ⚠️ Manual values next

**What Was Built:**
- ✅ KPI catalog (in templates)
- ✅ Project activeKpiIds
- ✅ KPI toggle UI
- ✅ Default KPIs auto-enabled from template
- ✅ Dashboard endpoints filter by activeKpiIds
- ⚠️ Manual KPI values storage (next)
- ⚠️ Computed KPIs pipeline (basic exists, needs enhancement)

**What to Build Next:**

### 2a. Manual KPI Values Storage

**Entity:** `ProjectKpiValue`
```typescript
{
  id: string;
  projectId: string;
  kpiId: string;
  value: number | string | boolean | Date;
  valueType: 'number' | 'text' | 'boolean' | 'date' | 'enum';
  cadence?: 'weekly' | 'monthly';
  recordedAt: Date;
  recordedBy: string;
  notes?: string;
}
```

**Endpoints:**
- `POST /api/projects/:id/kpis/:kpiId/values` - Record manual value
- `GET /api/projects/:id/kpis/:kpiId/values` - Get value history
- `GET /api/projects/:id/kpis/values` - Get all active KPI values

**UI:**
- Manual KPI input field appears when KPI toggled ON
- Simple form: value + optional notes
- History view for audit

### 2b. Computed KPI Pipeline Enhancement

**Current:** Basic computation exists in `ProjectDashboardService`

**Enhance:**
- Task completion rate: `(doneTasks / totalTasks) * 100`
- Overdue tasks count: Tasks with `dueDate < now && status !== DONE`
- Blocked tasks count: Tasks with `status === BLOCKED`
- Cycle time: Average `completedAt - startedAt` for done tasks
- Planned vs actual: Compare `estimatedEndDate` vs `actualEndDate`
- Resource utilization: `(allocatedHours / capacityHours) * 100`

**Storage:**
- Computed values cached in `ProjectKpiValue` with `valueType: 'computed'`
- Recompute on task status change, phase update, allocation change

---

## Phase 3: Auto Status and Health ⚠️ IN PROGRESS

**Goal:** Status engine, health snapshot, dashboard cards, manual override

**Status:** ⚠️ In Progress (health computed, needs scheduled job + override)

**What Was Built:**
- ✅ `ProjectHealthService` computes health from signals
- ✅ Health stored in `Project.health` field
- ✅ `behindTargetDays` calculated
- ✅ Dashboard endpoints return health data
- ⚠️ Status engine scheduled job (next)
- ⚠️ Manual override with audit reason (next)

**What to Build Next:**

### 3a. Project Status Engine

**Service:** `ProjectStatusEngineService`

**Triggers:**
- Task status change (event-driven)
- Scheduled job (every 15 minutes)
- Phase milestone update
- Dependency change

**Inputs:**
- Task status distribution
- Overdue count and overdue days
- Blocked tasks count
- Milestone slips
- Risk signals and dependencies
- Resource allocation conflicts

**Outputs:**
- `Project.status` suggested value
- `Project.health` value
- `behindTargetDays`
- Explanation string (shown in UI)

**Rules:**
```typescript
if (anyMilestoneLate) → health = AT_RISK
if (blockedTasks > threshold) → health = AT_RISK
if (overdueTasksGrowing) → health = OFF_TRACK
if (90% done && noOverdue) → health = HEALTHY
```

**Implementation:**
- Extend `ProjectHealthService` with status engine logic
- Add scheduled job: `@Cron('*/15 * * * *')`
- Add event listener for task changes
- Store explanation in `Project.healthExplanation` field

### 3b. Manual Override with Audit Reason

**Entity Update:** `Project`
```typescript
{
  // ... existing fields
  healthOverride: ProjectHealth | null;
  healthOverrideReason: string | null;
  healthOverrideBy: string | null;
  healthOverrideAt: Date | null;
}
```

**Endpoints:**
- `PATCH /api/projects/:id/health/override` - Set manual override
- `DELETE /api/projects/:id/health/override` - Remove override

**UI:**
- "Override Health" button in project overview
- Modal: Select health value + reason text
- Show override indicator in health card
- Show "Computed: HEALTHY, Override: AT_RISK" when overridden

---

## Phase 4: Governance Plus Resources ⚠️ PARTIAL

**Goal:** Resource profiles, allocation, alerts

**Status:** ⚠️ Partial (roles done, resources next)

**What Was Built:**
- ✅ Workspace role enforcement everywhere
- ✅ Platform role: Admin
- ✅ Workspace roles: Owner, Member, Viewer
- ⚠️ Resource profiles (next)
- ⚠️ Allocation and overload alerts (next)

**What to Build Next:**

### 4a. Resource Profiles

**Entity:** `ResourceProfile`
```typescript
{
  id: string;
  workspaceId: string;
  userId: string;
  organizationId: string;
  capacityHoursPerWeek: number;
  costRate?: number; // Optional
  skills?: string[];
  availability?: {
    startDate: Date;
    endDate: Date;
    hoursPerWeek: number;
  }[];
}
```

**Endpoints:**
- `GET /api/workspaces/:id/resources` - List resource profiles
- `GET /api/workspaces/:id/resources/:userId` - Get profile
- `PATCH /api/workspaces/:id/resources/:userId` - Update profile

**Auto-Creation:**
- When user added to workspace, create resource profile
- Default capacity: 40 hours/week
- Workspace owner can update

### 4b. Resource Allocation

**Entity:** `ResourceAllocation`
```typescript
{
  id: string;
  projectId: string;
  taskId?: string; // Optional task-level allocation
  userId: string;
  workspaceId: string;
  organizationId: string;
  allocationType: 'soft' | 'hard';
  hoursPerWeek: number;
  startDate: Date;
  endDate: Date;
  notes?: string;
}
```

**Endpoints:**
- `POST /api/projects/:id/allocations` - Create allocation
- `GET /api/projects/:id/allocations` - List allocations
- `PATCH /api/projects/:id/allocations/:id` - Update allocation
- `DELETE /api/projects/:id/allocations/:id` - Remove allocation

**Alerts:**
- Over-allocation: `sum(allocations) > capacity`
- Unassigned tasks past due
- Workload imbalance by role

---

## Phase 5: Inbox Feature ⚠️ NOT STARTED

**Goal:** Mentions, assignments, due dates, status changes, template sync

**Status:** ⚠️ Not Started

**What to Build:**

### 5a. Inbox Entity

**Entity:** `InboxItem`
```typescript
{
  id: string;
  userId: string;
  organizationId: string;
  type: 'mention' | 'assignment' | 'due_date' | 'status_change' | 'template_sync';
  entityType: 'task' | 'project' | 'template';
  entityId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  metadata?: any;
}
```

**Endpoints:**
- `GET /api/inbox` - List inbox items
- `PATCH /api/inbox/:id/read` - Mark as read
- `DELETE /api/inbox/:id` - Dismiss item

**UI:**
- Inbox icon in header
- Badge with unread count
- List view with filters
- One-click actions (go to task, mark read, dismiss)

### 5b. Notification Generation

**Events:**
- Task mention: `@user` in comment
- Assignment: Task assigned to user
- Due date: Task due date changed
- Status change: Task status changed (if user follows task)
- Template sync: Template updated, project needs sync

**Service:** `InboxNotificationService`
- Listen to domain events
- Create inbox items
- Respect user notification preferences

---

## Build Sequence

### MVP (Now - Before Testers)
1. ✅ Phase 1: Core execution
2. ✅ Phase 2: KPI lego system (MVP)
3. 🚧 Phase 3: Auto status (partial - health computed)
4. ⚠️ Phase 2a: Manual KPI values (critical for MVP)

### Post-MVP (After Testers)
1. Phase 3a: Status engine scheduled job
2. Phase 3b: Manual override
3. Phase 4a: Resource profiles
4. Phase 4b: Resource allocation
5. Phase 5: Inbox feature

### Future (Premium)
1. Template versioning
2. Advanced resource analytics
3. 3D KPI model
4. Custom workflow rules

---

## Tester Instructions

**What to Tell Testers:**

1. **Create workspace**
   - Admin creates workspace
   - Assign workspace owners

2. **Apply template to create project**
   - Select template
   - Create project
   - Verify default KPIs active

3. **Toggle KPIs and enter manual values**
   - Toggle KPIs on/off
   - Enter manual KPI values (when implemented)
   - Verify computed KPIs show values

4. **Execute tasks, comments, and due dates**
   - Create tasks
   - Assign tasks
   - Update status
   - Add comments
   - Set due dates

5. **Watch project health update without manual changes**
   - Health updates automatically
   - Status reflects task state
   - Dashboard shows computed health

6. **Check My Work and Inbox**
   - My Work shows assigned tasks
   - Inbox shows notifications (when implemented)

---

**Status:** Plan complete. Ready to execute Phase 2a (Manual KPI values) for MVP completion.
