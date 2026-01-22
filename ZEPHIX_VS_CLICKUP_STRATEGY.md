# Zephix vs ClickUp: Strategic Differentiation

**Date:** January 15, 2026
**Goal:** Map LinkedIn pain points to Zephix features and build plan

---

## Core Differentiators

### 1. Fast Status Accuracy ✅ (In Progress)

**ClickUp Problem:**
- Teams update tasks, project status stays wrong
- Leaders lose trust in dashboards

**Zephix Solution:**
- Project health and status become computed outcomes, not manual fields
- Manual override for edge cases with audit reason

**Current Implementation:**
- ✅ `ProjectHealthService` computes health from signals
- ✅ `behindTargetDays` calculated from milestones
- ✅ Health stored in `Project.health` field
- ⚠️ Status engine runs on task change (needs scheduled job)
- ⚠️ Manual override with audit reason (not yet implemented)

**What to Build:**
- Project Status Engine (scheduled job + event-driven)
- Manual override UI with reason field
- Status explanation string in UI

**Rules Example:**
```typescript
if (anyMilestoneLate) → health = AT_RISK
if (blockedTasks > threshold) → health = AT_RISK
if (overdueTasksGrowing) → health = OFF_TRACK
if (90% done && noOverdue) → health = HEALTHY
```

**Why This Beats ClickUp:**
- ClickUp: Status is a label
- Zephix: Status is a result

---

### 2. Templates as Control Plane ✅ (Started)

**ClickUp Problem:**
- Templates exist but don't enforce consistency
- Every team drifts, reports break

**Zephix Solution:**
- Template is blueprint for structure, fields, KPIs, governance
- Projects carry template snapshot (already started)

**Current Implementation:**
- ✅ Template instantiation creates projects with `templateSnapshot`
- ✅ Template defines `availableKPIs` and `defaultEnabledKPIs`
- ✅ Project stores `activeKpiIds` from template defaults
- ⚠️ Template versioning (not yet implemented)
- ⚠️ Template guardrails (required phases, status transitions) (not yet implemented)

**What to Build:**
- Template versioning rules
- Template sync with change preview
- Template guardrails:
  - Required phases
  - Required task types
  - Allowed status transitions
  - Required KPIs for template types

**Why This Beats ClickUp:**
- ClickUp: Templates copy structure
- Zephix: Templates drive execution rules and reporting

---

### 3. KPI Lego System with Zero Setup ✅ (MVP Complete)

**ClickUp Problem:**
- Custom fields are powerful but too open-ended
- No curated KPI catalog

**Zephix Solution:**
- Two buckets: Manual entry KPIs vs Computed KPIs
- Template defines available KPIs
- Project stores activeKpiIds
- Dashboard shows only active KPIs

**Current Implementation:**
- ✅ Template defines `availableKPIs` and `defaultEnabledKPIs`
- ✅ Project stores `activeKpiIds`
- ✅ KPI toggle UI in project overview
- ✅ Dashboard endpoints filter by `activeKpiIds`
- ⚠️ Manual KPI value storage (ProjectKpiValue table) (not yet implemented)
- ⚠️ Computed KPI pipeline (basic implementation exists)

**KPI Buckets:**

**Bucket A: Manual Entry KPIs**
- On track flag
- Weekly confidence
- RAID count
- Vendor delivery rating
- Budget spent to date
- Forecast finish date

**Bucket B: Computed KPIs**
- Percent complete
- Overdue tasks
- Blocked tasks
- Cycle time
- Planned vs actual dates
- Resource utilization and overload

**What to Build:**
- `ProjectKpiValue` table (projectId, kpiId, value, history, cadence)
- Manual KPI input fields in project overview
- Computed KPI calculation pipeline
- KPI value history for audit

**User Experience:**
- Toggle on KPI → Manual KPI appears as field, Computed KPI appears as read-only card
- No admin configuration screen
- Workspace owners can pin favorites (optional)

**Why This Beats ClickUp:**
- ClickUp: Custom fields are open-ended
- Zephix: Curated KPI catalog with strong defaults

---

### 4. Strict Hierarchy ✅ (Current)

**ClickUp Problem:**
- Workspace, Space, Folder, List is too much

**Zephix Advantage:**
- Tighter hierarchy
- Workspace is the boundary

**Current Structure:**
```
Workspace
  └── Programs
      └── Projects
          └── Phases
              └── Tasks
                  └── Subtasks
```

**Current Implementation:**
- ✅ Workspace boundary enforced
- ✅ Projects exist inside workspace only
- ✅ Templates instantiate into program or project
- ✅ Task as communication hub (comments, activity)
- ✅ Subtasks for assignments
- ⚠️ Parent task assignment (optional, not enforced)

**Recommendations:**
- Keep hierarchy strict
- Task = communication hub
- Subtasks = assignments
- Parent tasks can be assigned (optional)

---

### 5. My Work and Inbox as First-Class ✅ (My Work Done)

**ClickUp Problem:**
- Feels noisy, too many notifications

**Zephix Solution:**
- My Work: Assigned tasks with filters
- Inbox: Mentions, assignments, due dates, status changes
- Keep defaults tight, opt-in to noisy events

**Current Implementation:**
- ✅ My Work shows assigned tasks across workspace
- ✅ My Work filters: overdue, due soon, in progress, todo, done
- ✅ My Work reads from WorkTask (unified source)
- ⚠️ Inbox (not yet implemented)
- ⚠️ One-click updates (not yet implemented)
- ⚠️ Template sync notifications (not yet implemented)

**What to Build:**
- Inbox feature:
  - Mentions
  - Assignment changes
  - Due date changes
  - Status changes on followed tasks
  - Template sync notifications
- One-click updates in My Work
- Notification preferences (opt-in)

**How We Win:**
- Keep defaults tight
- Let users opt-in to noisy events

---

### 6. Governance and Resource Management as Core ⚠️ (Partial)

**ClickUp Problem:**
- Governance and resources are add-ons

**Zephix Advantage:**
- Governance and resources are core features

**Current Implementation:**
- ✅ Workspace roles: Owner, Member, Viewer
- ✅ Platform role: Admin
- ✅ Workspace access enforcement
- ✅ Project permissions follow workspace membership
- ⚠️ Resource directory (not yet implemented)
- ⚠️ Resource allocation (not yet implemented)
- ⚠️ Allocation alerts (not yet implemented)

**Minimum Governance Model for MVP:**
- Workspace roles: Owner, Member, Viewer
- Project permissions follow workspace membership
- Optional project-level overrides later

**Resource Management for MVP:**
- Resource directory per workspace
- Every member has resource profile
- Capacity per week
- Cost rate (optional)
- Allocation types: Soft (planning), Hard (committed)
- Alerts: Over-allocation, unassigned tasks, workload imbalance

**Admin Flow:**
1. Admin creates org and workspace
2. Admin assigns workspace owners
3. Workspace owners run projects
4. Resource profile exists for every user
5. Allocations work without extra setup

---

### 7. Simple Role Model ✅ (Current)

**ClickUp Problem:**
- Role model can be complex

**Zephix Solution:**
- Two layers only: Platform role + Workspace role

**Current Implementation:**
- ✅ Platform role: Admin
- ✅ Workspace role: Owner, Member, Viewer
- ✅ Admin has implicit access (or admin override)
- ✅ Admin auto-set as Workspace Owner on creation

**Key Rules:**
- Admin doesn't need to be added as member
- Admin has implicit access to every workspace
- Admin override switch for support/troubleshooting
- When Admin creates workspace, set as Owner automatically

**Matches Monday.com experience while keeping model clear**

---

### 8. Zero Config vs Easy Config ✅ (Current)

**ClickUp Problem:**
- Too much configuration or too little

**Zephix Solution:**
- Zero config path with strong defaults
- Optional quick setup (3 choices)

**Current Implementation:**
- ✅ Templates have default KPIs
- ✅ Default status flow
- ✅ Default dashboard (Phase 7.5)
- ⚠️ Optional quick setup (not yet implemented)

**MVP Approach:**
- Zero config path:
  - Templates have default KPIs
  - Default status flow
  - Default dashboard
  - Default notifications
- Optional quick setup:
  - Workspace owner picks template pack
  - Picks KPI pack
  - Picks dashboard pack
  - Three choices, then done

**Keeps promise while handling real-world variety**

---

### 9. 3D KPI Model ⚠️ (Future)

**Status:** Nice-to-have, not MVP

**What Works Better for MVP:**
- Simple KPI panel with search and categories
- Groups: Delivery, Cost, Risk, Quality, Resource
- Toggle on and see it appear instantly

**If Still Want 3D Later:**
- Treat as premium interaction layer
- Build after testers complete MVP flows without friction

---

### 10. Concrete MVP Plan ✅ (In Progress)

**Phase 1: Unblock Core Execution** ✅ (Complete)
- ✅ Templates create projects inside workspaces
- ✅ Project opens cleanly
- ✅ Tasks and phases load and update
- ✅ My Work shows assigned tasks in workspace

**Phase 2: KPI Lego System** ✅ (MVP Complete)
- ✅ KPI catalog (in templates)
- ✅ Project activeKpiIds
- ⚠️ Manual KPI values storage (next)
- ⚠️ Computed KPIs pipeline (basic exists)
- ✅ Default KPIs auto-enabled from template

**Phase 3: Auto Status and Health** ⚠️ (In Progress)
- ✅ Status engine (event-driven, needs scheduled job)
- ✅ Health snapshot (computed)
- ⚠️ Dashboard cards show computed health (Phase 7.5)
- ⚠️ Manual override with audit reason (next)

**Phase 4: Governance Plus Resources** ⚠️ (Partial)
- ✅ Workspace role enforcement everywhere
- ⚠️ Resource profiles for members (next)
- ⚠️ Allocation and overload alerts (next)

**What to Tell Testers:**
1. Create workspace
2. Apply template to create project
3. Toggle KPIs and enter manual values
4. Execute tasks, comments, and due dates
5. Watch project health update without manual changes
6. Check My Work and Inbox

---

## Feature Parity Matrix

| Feature | ClickUp | Zephix | Status |
|---------|--------|--------|--------|
| **Status Management** |
| Manual status updates | ✅ | ❌ (auto-computed) | ✅ Better |
| Status as result | ❌ | ✅ | ✅ Differentiator |
| **Templates** |
| Template library | ✅ | ✅ | ✅ Parity |
| Template as control plane | ❌ | ✅ | ✅ Differentiator |
| Template versioning | ❌ | ⚠️ | 🚧 Next |
| **KPIs** |
| Custom fields | ✅ | ⚠️ (curated) | ✅ Better |
| KPI catalog | ❌ | ✅ | ✅ Differentiator |
| Manual vs Computed | ❌ | ✅ | ✅ Differentiator |
| **Hierarchy** |
| Workspace > Space > Folder > List | ✅ | ❌ | ✅ Simpler |
| Workspace > Program > Project > Phase > Task | ❌ | ✅ | ✅ Differentiator |
| **My Work** |
| Assigned tasks view | ✅ | ✅ | ✅ Parity |
| Inbox | ✅ | ⚠️ | 🚧 Next |
| **Governance** |
| Roles | ✅ | ✅ | ✅ Parity |
| Resource management | ⚠️ (add-on) | ✅ (core) | ✅ Differentiator |
| **Configuration** |
| Zero config | ❌ | ✅ | ✅ Differentiator |
| Easy config | ✅ | ⚠️ | 🚧 Next |

---

## Build Priority

### MVP (Now)
1. ✅ Core execution (Phase 1)
2. ✅ KPI lego system (Phase 2)
3. 🚧 Auto status and health (Phase 3)
4. ⚠️ Manual KPI values (Phase 2 completion)

### Post-MVP (Next)
1. Inbox feature
2. Resource profiles and allocation
3. Template versioning
4. Manual status override
5. Optional quick setup

### Future (Premium)
1. 3D KPI model
2. Advanced resource analytics
3. Custom workflow rules

---

**Status:** Strategic mapping complete. Ready to guide MVP and post-MVP development.
