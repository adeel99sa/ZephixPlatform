# Work Management Gap Audit — Week 3 Pilot

date_utc: 2026-03-07T04:00:00Z
branch: main
commit: 67cd2b6a
audited_by: Claude (automated codebase audit)

Legend: PASS | PARTIAL | MISSING

---

## Section 1 — Core Work Domain

Module: zephix-backend/src/modules/work-management

### 1.1 Create Task

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| API endpoint exists | PASS | work-tasks.controller.ts — POST /api/work/tasks | |
| DTO validation present | PASS | dto/create-work-task.dto.ts — @IsDateString, class-validator | |
| organizationId scope | PASS | work-tasks.service.ts:174 — tenantContext.assertOrganizationId() | |
| workspaceId scope | PASS | work-tasks.service.ts:165-189 — assertWorkspaceAccess() before insert | |
| RBAC guard applied | PASS | JwtAuthGuard on controller; workspace access in service | |

### 1.2 Update Task

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Field-level updates | PASS | dto/update-work-task.dto.ts + PATCH handler | |
| Audit trail | PASS | entities/task-activity.entity.ts + services/task-activity.service.ts; changedFields tracked | |

### 1.3 Assign Owner

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| User belongs to same org | PARTIAL | Workspace access (assertWorkspaceAccess) checked for caller, but assigneeUserId not validated against org membership | Gap: can assign user from foreign org if their UUID is known |
| Workspace membership for caller | PASS | work-tasks.service.ts:566 — assertWorkspaceAccess before write | |

### 1.4 Due Date

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Date validation | PASS | create-work-task.dto.ts:85 — @IsDateString() | |
| Timezone-safe handling | PARTIAL | ISO 8601 string accepted; no UTC normalization in service; cross-timezone rendering risk | |

### 1.5 Status Transitions

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Allowed status values enforced | PASS | work-tasks.service.ts:74 — ALLOWED_STATUS_TRANSITIONS state machine | |
| Transition rules defined | PASS | Terminal states DONE/CANCELED at lines 97-98; strict validation at 263 and 870 | |

### 1.6 Comments

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Create comment | PASS | work-tasks.controller.ts:382 POST /:id/comments; task-comments.service.ts:addComment() | |
| List comments | PASS | GET /:id/comments; listComments() service method | |
| Edit comment | MISSING | task-comments.service.ts has only addComment + listComments — no update method | No PATCH /comments/:id endpoint |
| Delete comment | MISSING | No deleteComment method in service or controller | Once posted, comments cannot be removed |

### 1.7 Attachments

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Upload supported | PASS | zephix-backend/src/modules/attachments/ — full module | |
| Storage provider configured | PASS | attachments/storage/storage.service.ts — S3-compatible via @aws-sdk/client-s3 | |

### 1.8 Archive / Delete Task

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Soft delete preferred | PASS | work-task.entity.ts:184 — deletedAt: Date | null | |
| Archived tasks excluded from default queries | PASS | list-work-tasks.query.ts — includeArchived and includeDeleted both default false | |

### 1.9 Subtasks

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Parent-child relationship exists | PASS | work-task.entity.ts:51 — @Index(['parentTaskId']); @ManyToOne/subtasks: WorkTask[] at lines 194-202 | |
| Hierarchical query support | PARTIAL | Parent-child FK exists; no recursive CTE for N-level deep traversal | Deep nesting requires N+1 queries |

### 1.10 Dependencies

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Dependency table exists | PASS | entities/task-dependency.entity.ts; dto/add-dependency.dto.ts | |
| Cycle detection | PASS | services/task-dependencies.service.ts:94-281 — DFS cycle detection; "Dependency cycle detected" error at line 104; spec file present | |

---

## Section 2 — Project Management

Module: zephix-backend/src/modules/projects

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Create project — workspace scope | PASS | projects.service.ts — organizationId and workspaceId scoped | |
| Create project — RBAC | PASS | projects.controller.ts — RequireOrgRoleGuard applied | |
| Update project — name/description/status | PASS | UpdateProjectDto + PATCH handler | |
| Archive project — soft delete | PASS | project.entity.ts:173 — deletedAt: Date | null | |
| Project members — workspace membership | PASS | RequireWorkspaceRoleGuard on workspace-scoped endpoints | |
| Project members — role overrides | MISSING | No ProjectMember entity or per-project role table found | Workspace role is the effective access level |
| Activity feed — task changes logged | PASS | task-activity.entity.ts + task-activity.service.ts | |
| Activity feed — comment events logged | PASS | Comment events tracked via task-activity service | |
| Project settings — workflow statuses | PASS | workflow-config.controller.ts + workflow-config.service.ts | |
| Project settings — default assignee | MISSING | No defaultAssigneeId or rule found in project entity | |

---

## Section 3 — Program and Portfolio Integration

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Project-to-program link | PASS | project.entity.ts — programId nullable FK | |
| Portfolio governance — create path org-scoped | PASS | projects.service.ts:275-276 — where: { id, organizationId } | Fixed Week 1 |
| Portfolio governance — update path org-scoped | PASS | projects.service.ts:641 — where: { id, organizationId } | Fixed commit 67cd2b6a |
| Portfolio rollup — status aggregation | PASS | portfolio-analytics.controller.ts — getHealth(), getCriticalRisk(), getBaselineDrift() | |
| Portfolio rollup — task completion metrics | PARTIAL | Health/risk/baseline tracked at project level; direct task-completion-rate not at portfolio API | |
| Program progress — project rollup | PASS | programs/services/programs-rollup.service.ts + program-kpi-rollup.service.ts | |

---

## Section 4 — Filters and Views

| Filter | Status | Evidence | Notes |
|--------|--------|----------|-------|
| Status filter | PASS | list-work-tasks.query.ts — status, includeStatuses, excludeStatuses | |
| Assignee filter | PASS | list-work-tasks.query.ts:59 — assigneeUserId | |
| Due date filter | PASS | list-work-tasks.query.ts — dueFrom, dueTo | |
| Priority filter | MISSING | priority field exists on entity but no priority param in ListWorkTasksQueryDto | |
| Project filter | PASS | list-work-tasks.query.ts:27 — projectId | |
| Tags filter | MISSING | No tags/labels column on work-task.entity.ts; no filter | |
| Multiple conditions | PASS | All filters combinable in one request | |
| Saved filters | MISSING | No saved_filter table or endpoint | |
| Quick filters | PARTIAL | committed, backlog, hasEstimatePoints booleans exist; user-facing presets absent | |
| Sort: due date | PASS | SORT_BY_VALUES = ['dueDate','updatedAt','createdAt','rank'] | |
| Sort: priority | MISSING | priority not in SORT_BY_VALUES | |
| Sort: created date | PASS | createdAt in sort values | |
| Pagination | PASS | limit (max 200, default 50) + offset | |
| Cursor pagination | MISSING | Offset only; cursor needed at scale | |

---

## Section 5 — Frontend Work Views

| View | Status | Evidence | Notes |
|------|--------|----------|-------|
| Task list view | PASS | components/tasks/TaskList.tsx; features/projects/components/TaskListSection.tsx | |
| Board/Kanban view | PASS | components/views/BoardView.tsx; route projects/:id/board (App.tsx:179) | |
| Calendar view | MISSING | No CalendarView component; no /calendar route in App.tsx | |
| Timeline/Gantt view | PASS | components/views/TimelineView.tsx; ProjectGanttTab; route projects/:id/gantt (App.tsx:180) | |
| Assigned to me | PASS | pages/my-work/MyWorkPage.tsx — GET /my-work; overdue + due-soon items | |
| Created by me | MISSING | MyWorkPage does not expose a created-by-me filter | |
| Recently updated | MISSING | No recently-updated view | |
| All workspace tasks | PARTIAL | ProjectPlanView at workspace level; no flat all-tasks page | |
| Project tasks view | PASS | features/projects/tabs/ProjectTasksTab.tsx | |

---

## Section 6 — Task Interaction UI

| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Quick: change status | PASS | WorkItemDetailPanel.tsx + ProjectBoardTab.tsx | |
| Quick: reassign | PASS | Assignee picker in task detail panel | |
| Quick: change due date | PASS | Due date field in task detail | |
| Quick: add comment | PASS | Comment input in WorkItemDetailPanel.tsx | |
| Context: duplicate task | MISSING | No duplicate action in TaskListSection.tsx or board cards | |
| Context: move task | PARTIAL | Phase/project reassignment via edit; no drag-to-move context menu | |
| Context: archive task | PARTIAL | Delete action in TaskListSection.tsx; archive distinct from delete not surfaced | |
| Bulk: multi-select | PASS | TaskListSection.tsx:106 — bulkAction state with checkbox selection | |
| Bulk: assign | PASS | setBulkAction('assign') at line 1029 | |
| Bulk: status change | PASS | setBulkAction('status'); backend PATCH /tasks/bulk | |
| Bulk: due date | PASS | setBulkAction('dueDate') | |
| Bulk: archive/delete | PARTIAL | setBulkAction('delete') exists; bulk soft-archive not separately surfaced | |

---

## Section 7 — Notifications and Activity

| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Task-assigned event | PASS | activity-notification-projector.service.ts:49 — TASK_ASSIGNED | |
| Task-status-changed event | PASS | activity-notification-projector.service.ts:54 — TASK_STATUS_CHANGED | |
| Comment mention event | PASS | notification-dispatch.service.ts:212 — 'task.mentioned' | |
| In-app notifications | PASS | notifications.controller.ts + notifications.service.ts + frontend features/notifications/ | |
| Email notifications | PARTIAL | EmailService injected; dispatch logic present; line 171 comment: "Email sending would be handled by a background job in production" — not fully wired | Not production-ready |
| Project-level activity feed | PASS | task-activity.entity.ts scoped to workspace/project | |
| Task-level activity feed | PASS | Task activity records per task ID | |

---

## Section 8 — Permissions and RBAC

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Admin: create projects | PASS | RequireOrgRoleGuard on projects controller | |
| Admin: manage members | PASS | workspace-members.controller.ts guarded | |
| Admin: delete/archive | PASS | Delete endpoints guarded | |
| Member: create/edit tasks | PASS | MEMBER role passes assertWorkspaceAccess | |
| Member: comment | PASS | Comment endpoint available to workspace members | |
| Viewer: read-only | PASS | ui-acceptance smoke confirmed VIEWER blocked from write paths | |
| RequireOrgRoleGuard | PASS | modules/workspaces/guards/; applied to projects + members + workspaces | |
| RequireWorkspaceRoleGuard | PASS | workspaces/guards/require-workspace-role.guard.ts | |
| RequireProjectWorkspaceRoleGuard | PASS | projects/guards/require-project-workspace-role.guard.ts | |
| ZEPHIX_WS_MEMBERSHIP_V1 flag | PARTIAL | Flag gates workspace membership checks (guard:74-76); NOT enabled on staging — workspace role checks bypassed for some write ops | Do not use project-create as negative RBAC assertion |
| Frontend RBAC gating | PASS | useWorkspaceRole hook in ProjectOverviewTab, ProjectBoardTab; canWrite/isReadOnly control UI | |

---

## Section 9 — Template Center

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Create template | PASS | template-definitions.controller.ts + template-definitions.service.ts | |
| Duplicate template | PARTIAL | templates.service.ts exists; no explicit duplicate() method found | |
| Instantiate into project | PASS | templates/services/templates-instantiate.service.ts + templates-instantiate-v51.service.ts | |
| Reusable checklists | PARTIAL | lego-blocks.service.ts for task block reuse; no user-facing checklist concept | |
| Recurring tasks | MISSING | No recurring task entity or scheduler | See Section 11 |
| Template org scope | PASS | Templates module enforces organizationId | |
| Template workspace scope | PARTIAL | Org-scoped; workspace-level scoping not evident | |

---

## Section 10 — Prebuilt Templates

Location: zephix-backend/src/modules/templates/data/system-template-definitions.ts

12 prebuilt templates present:
- Scrum Software Delivery — PASS
- Scrum Product Launch — PASS
- Scrum Operations Improvement — PASS
- Kanban Service Desk Intake — PASS
- Kanban Continuous Improvement — PASS
- Kanban Risk and Compliance Tracking — PASS
- Waterfall Infrastructure Migration — PASS
- Waterfall Vendor Implementation — PASS
- Waterfall Regulatory Program — PASS
- Hybrid Program Delivery — PASS
- Hybrid Enterprise Rollout — PASS
- Hybrid M&A Integration — PASS

All templates include phases, tasks, priorities, estimated hours. PASS.
Marketing campaign / customer onboarding as standalone templates: MISSING (Scrum Product Launch covers launch).

---

## Section 11 — Automation and Recurring Work

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Recurring tasks | MISSING | No @Cron decorator for task recurrence; ScheduleModule imported but cleanup scripts only | Not MVP |
| Automation rules | MISSING | No automation rule engine; workflows/ module handles validation only | Not MVP |
| Status-change triggers notification | PASS | TASK_STATUS_CHANGED -> notification projector -> dispatch | |

---

## Section 12 — Reporting and Insights

| Metric | Status | Evidence | Notes |
|--------|--------|----------|-------|
| Project progress | PASS | analytics/entities/materialized-project-metrics.entity.ts | |
| Task completion rate | PARTIAL | Task counts in metrics entity; rate (%) not surfaced as dedicated API | |
| Overdue tasks | PASS | materialized-project-metrics.entity.ts:62 — overdueCount column | |
| Team workload | PASS | analytics/entities/materialized-resource-metrics.entity.ts | |
| Upcoming due tasks | PARTIAL | MyWorkPage.tsx shows per-user view; no team-wide upcoming-due report | |
| Portfolio analytics | PASS | portfolio-analytics.controller.ts — health, critical risk, baseline drift | |
| Program rollup | PASS | programs-rollup.service.ts + program-kpi-rollup.service.ts | |

---

## Section 13 — Search and Discovery

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Task search by text | PASS | work-tasks.service.ts:528-529 — ILIKE on task.title; search field in ListWorkTasksQueryDto | Title only; no body/description full-text |
| Project search | PARTIAL | frontend features/search/ module exists; backend search scope unclear | |
| User search | PARTIAL | User lookup in invite/member flows; no dedicated /users/search | |
| Template search | PASS | template-center/search/template-center-search.controller.ts | |
| Cross-entity search | PARTIAL | Frontend search feature exists; no unified backend search API | |

---

## Section 14 — Performance Safety

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Task queries indexed | PASS | work-task.entity.ts:18-36 — 8 @Index decorators including composite: (workspaceId+projectId+status+updatedAt), (workspaceId+assigneeUserId+status), (workspaceId+status+dueDate) | |
| Pagination required | PASS | ListWorkTasksQueryDto — limit max 200, default 50; @Max(200) enforced | |
| No unbounded joins | PASS | QueryBuilder uses .take(limit) with validated max | |
| Cursor pagination | MISSING | Offset only; deep offsets degrade at >10k tasks per workspace | Acceptable for pilot |

---

## Gap Summary by Priority

### P0 — Block pilot correctness

| # | Gap | Section |
|---|-----|---------|
| 1 | Assignee org-membership not validated — foreign-org user UUID can be set as assignee | §1.3 |
| 2 | ZEPHIX_WS_MEMBERSHIP_V1 flag off on staging — workspace role checks partially bypassed | §8 |

### P1 — Pilot experience degraded

| # | Gap | Section |
|---|-----|---------|
| 1 | Comment edit/delete not implemented | §1.6 |
| 2 | Priority filter missing from task list API | §4 |
| 3 | Calendar view missing | §5 |
| 4 | Email notifications stubbed (not wired) | §7 |

### P2 — Nice-to-have for pilot

| # | Gap | Section |
|---|-----|---------|
| 1 | Tags/labels system not implemented | §4 |
| 2 | Saved filters not implemented | §4 |
| 3 | Cursor pagination (only offset) | §4, §14 |
| 4 | "Created by me" / "Recently updated" views | §5 |
| 5 | Duplicate task context menu | §6 |
| 6 | Flat all-workspace-tasks view | §5 |
| 7 | Per-project role overrides | §2 |
| 8 | Default assignee rules for projects | §2 |
| 9 | Recurring tasks | §11 |
| 10 | Automation rules | §11 |
| 11 | Deep subtask recursive query | §1.9 |
| 12 | UTC normalization for due dates | §1.4 |
| 13 | Marketing campaign / customer onboarding prebuilt templates | §10 |

---

## Overall Readiness Assessment

| Section | Score | Verdict |
|---------|-------|---------|
| Core task CRUD | 8/10 | Ready — comments need edit/delete |
| Project management | 7/10 | Ready — no per-project roles |
| Program/Portfolio integration | 9/10 | Ready — both create/update paths org-scoped |
| Filters and views | 6/10 | Functional — missing priority, tags, saved filters |
| Frontend views | 7/10 | Ready — board/gantt/list/plan present; calendar missing |
| Task UI interactions | 8/10 | Bulk actions strong; duplicate/archive polish missing |
| Notifications | 7/10 | In-app solid; email not wired |
| RBAC | 8/10 | Core enforced; feature flag caveat on staging |
| Templates | 9/10 | 12 prebuilt, instantiation works |
| Automation | 2/10 | Not implemented |
| Reporting | 7/10 | Project/program/portfolio analytics; limited user-facing reports |
| Search | 6/10 | Task title search works; no cross-entity full-text |
| Performance safety | 9/10 | Well-indexed; offset pagination enforced |

**Pilot verdict: GO with monitoring**

Platform is ready for 3–5 org controlled pilot.
P0 gaps (assignee org-validation, RBAC flag) should be addressed in Week 3 sprint.
P1 gaps (comment edit, priority filter, email, calendar) tracked as backlog.
