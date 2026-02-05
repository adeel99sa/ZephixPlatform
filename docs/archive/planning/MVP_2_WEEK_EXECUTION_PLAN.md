# MVP 2-Week Execution Plan

**Date:** 2025-01-27
**Goal:** Clear 6 MVP blockers to enable external user testing
**Timeline:** 10 working days (2 weeks)
**Owner:** Product + Engineering

---

## MVP Blockers Summary

1. ✅ **Role-specific `/home`** - Already built (AdminHome, MemberHome, GuestHome exist)
2. ✅ **`/w/:slug/home` route** - Already built (route and component exist)
3. ⚠️ **Workspace health snapshot** - Backend exists, UI partially displays, needs verification
4. ❌ **Status progression enforcement** - No transition rules enforced
5. ⚠️ **Rollup proof** - Endpoints exist, need verification and refresh triggers
6. ⚠️ **Core notifications** - Activity recorded, need notification dispatch wiring

---

## Week 1: Days 1-5

### Day 1: Workspace Health Snapshot Verification

**Goal:** Verify workspace health snapshot displays correctly on workspace home

**Screens:**
- `/w/:slug/home` - Workspace home page
- Health snapshot widget block (if executionSummary exists)

**Backend Endpoints:**
- `GET /api/workspaces/slug/:slug/home` - Returns `executionSummary` with health data
- Evidence: `zephix-backend/src/modules/workspaces/services/workspace-health.service.ts:getWorkspaceHomeData()`

**Frontend Components:**
- `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx` - Already displays `executionSummary` (lines 557-591, 668-730)

**Acceptance Criteria:**
- [ ] Workspace home loads without errors
- [ ] Health snapshot widget shows: active projects, total work items, overdue count, due soon count, in progress, done last 7 days
- [ ] Overdue tasks panel displays top 10 overdue items with project names
- [ ] Recent activity panel shows last 20 activities
- [ ] All counts match actual data in database

**Demo Script:**
1. Login as admin
2. Navigate to `/w/test-workspace/home`
3. Verify health snapshot widget displays with correct counts
4. Verify overdue tasks panel shows items (if any)
5. Verify recent activity panel shows activities (if any)

**Files to Verify:**
- `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx:557-730`
- `zephix-backend/src/modules/workspaces/services/workspace-health.service.ts:getExecutionSummary()`

---

### Day 2-3: Status Progression Enforcement

**Goal:** Enforce valid task status transitions in service layer and UI

**Screens:**
- Project task list - Status dropdown should only show valid next states
- Task detail page - Status change should validate transitions

**Backend Endpoints:**
- `PATCH /api/work-management/tasks/:id` - Update task status
- Evidence: `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:updateTask()`

**Status Transition Rules:**
```
BACKLOG → TODO
TODO → IN_PROGRESS, BLOCKED, CANCELED
IN_PROGRESS → IN_REVIEW, BLOCKED, CANCELED
BLOCKED → TODO, IN_PROGRESS, CANCELED
IN_REVIEW → DONE, IN_PROGRESS, BLOCKED
DONE → (no transitions, terminal state)
CANCELED → (no transitions, terminal state)
```

**Acceptance Criteria:**
- [ ] Service layer validates status transitions and throws `BadRequestException` for invalid transitions
- [ ] UI status dropdown only shows valid next states
- [ ] Invalid transition attempts show user-friendly error message
- [ ] Status change activity is recorded correctly

**Demo Script:**
1. Create a task with status TODO
2. Try to change status to DONE (should fail - invalid transition)
3. Change status to IN_PROGRESS (should succeed)
4. Change status to IN_REVIEW (should succeed)
5. Change status to DONE (should succeed)
6. Try to change status from DONE to TODO (should fail - terminal state)

**Files to Create/Modify:**
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:updateTask()` - Add transition validation
- `zephix-backend/src/modules/work-management/services/task-status-transitions.service.ts` (new) - Transition rules
- `zephix-frontend/src/features/projects/components/TaskListSection.tsx` - Filter status dropdown options
- `zephix-frontend/src/features/work-management/components/TaskStatusSelect.tsx` (new) - Status selector with validation

---

### Day 4-5: Core Notifications Wiring

**Goal:** Wire notification dispatch for task assigned, status changed, comment added

**Screens:**
- `/inbox` - Inbox page should show notifications
- Email inbox - Should receive email notifications (if enabled)

**Backend Endpoints:**
- Activity recording already exists in:
  - `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:updateTask()` (lines 333-369)
  - `zephix-backend/src/modules/work-management/services/task-comments.service.ts:addComment()` (lines 59-66)

**Notification Events to Wire:**
1. `TASK_ASSIGNED` - When `assigneeUserId` changes
2. `TASK_STATUS_CHANGED` - When `status` changes
3. `TASK_COMMENT_ADDED` - When comment is added

**Acceptance Criteria:**
- [ ] Task assignment triggers notification to assignee
- [ ] Status change triggers notification to assignee (if assigned)
- [ ] Comment added triggers notification to assignee and reporter (if different from commenter)
- [ ] Notifications appear in `/inbox` page
- [ ] Email notifications sent (if user has email enabled in preferences)
- [ ] Guest users (VIEWER) do not receive notifications

**Demo Script:**
1. As admin, assign a task to a member
2. Check member's inbox - should see "Task assigned" notification
3. As member, change task status to IN_PROGRESS
4. Check member's inbox - should see "Task status changed" notification
5. As member, add a comment to the task
6. Check assignee's inbox - should see "Comment added" notification
7. Verify email notifications sent (check email service logs)

**Files to Modify:**
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:updateTask()` - Add `NotificationDispatchService.dispatch()` calls
- `zephix-backend/src/modules/work-management/services/task-comments.service.ts:addComment()` - Add `NotificationDispatchService.dispatch()` call
- Verify `zephix-backend/src/modules/notifications/notification-dispatch.service.ts` is injected

---

## Week 2: Days 6-10

### Day 6-7: Rollup Proof and Refresh Triggers

**Goal:** Verify portfolio/program rollups show correct totals and refresh on link/unlink

**Screens:**
- `/workspaces/:id/programs/:programId` - Program detail page
- `/workspaces/:id/portfolios/:portfolioId` - Portfolio detail page

**Backend Endpoints:**
- `GET /api/programs/:id/rollup` - Program rollup totals
- `GET /api/portfolios/:id/rollup` - Portfolio rollup totals
- `POST /api/workspaces/:workspaceId/projects/:projectId/link` - Link project to program/portfolio
- Evidence:
  - `zephix-backend/src/modules/programs/services/programs-rollup.service.ts:getRollup()`
  - `zephix-backend/src/modules/portfolios/services/portfolios-rollup.service.ts:getRollup()`
  - `zephix-backend/src/modules/projects/workspace-projects.controller.ts:linkProject()`

**Acceptance Criteria:**
- [ ] Program rollup shows correct: projects total, projects active, projects at risk, work items open, work items overdue, resource conflicts open, risks active
- [ ] Portfolio rollup shows correct: programs total, projects total (direct + via programs), projects active, projects at risk, work items open, work items overdue, resource conflicts open, risks active
- [ ] Linking a project to program updates program rollup totals immediately
- [ ] Unlinking a project from program updates program rollup totals immediately
- [ ] Linking a project to portfolio updates portfolio rollup totals immediately
- [ ] Unlinking a project from portfolio updates portfolio rollup totals immediately
- [ ] Health calculation is correct (green/yellow/red based on at-risk projects)

**Demo Script:**
1. Create a portfolio "Q1 2025 Delivery"
2. Create a program "Mobile App Launch" linked to portfolio
3. Create 3 projects (standalone)
4. Link 2 projects to program
5. Verify program rollup shows: 2 projects, correct work items count, correct health
6. Verify portfolio rollup shows: 1 program, 2 projects (via program), correct totals
7. Unlink 1 project from program
8. Verify program rollup updated: 1 project, totals decreased
9. Verify portfolio rollup updated: totals decreased
10. Link project directly to portfolio (not via program)
11. Verify portfolio rollup shows: 1 program, 1 direct project, 1 project via program

**Files to Verify/Modify:**
- `zephix-backend/src/modules/programs/services/programs-rollup.service.ts:getRollup()` - Verify calculation logic
- `zephix-backend/src/modules/portfolios/services/portfolios-rollup.service.ts:getRollup()` - Verify calculation logic
- `zephix-backend/src/modules/projects/workspace-projects.controller.ts:linkProject()` - Verify rollup refresh trigger
- `zephix-frontend/src/pages/programs/ProgramDetailPage.tsx` - Verify rollup display
- `zephix-frontend/src/pages/portfolios/PortfolioDetailPage.tsx` - Verify rollup display

---

### Day 8-9: Link/Unlink UI Polish

**Goal:** Ensure link/unlink UI works smoothly with instant tag updates

**Screens:**
- Project detail page - "Program & Portfolio" section
- Program detail page - Projects list
- Portfolio detail page - Programs and projects list

**Backend Endpoints:**
- `POST /api/workspaces/:workspaceId/projects/:projectId/link` - Link/unlink project
- Evidence: `zephix-backend/src/modules/projects/workspace-projects.controller.ts:linkProject()`

**Frontend Components:**
- Project detail page - Link/unlink controls
- Evidence: `docs/PHASE_6_TESTER_SCRIPT.md:50-52` expects link/unlink UI

**Acceptance Criteria:**
- [ ] Project detail page shows "Program & Portfolio" section
- [ ] "Link Project" button opens modal with program/portfolio selection
- [ ] Linking updates project tags immediately (no page refresh)
- [ ] Unlinking shows confirmation modal
- [ ] Unlinking updates project tags immediately (no page refresh)
- [ ] Program/portfolio detail pages show linked projects in lists
- [ ] Rollup totals refresh automatically after link/unlink

**Demo Script:**
1. Open a standalone project
2. Click "Link Project" in "Program & Portfolio" section
3. Select a program from dropdown
4. Click "Link"
5. Verify project tag updates to "Program: [Program Name]" immediately
6. Verify program detail page shows project in list
7. Click "Unlink" on project
8. Confirm in modal
9. Verify project tag updates to "Standalone" immediately
10. Verify program detail page no longer shows project

**Files to Verify/Create:**
- `zephix-frontend/src/features/projects/components/ProjectLinkSection.tsx` (verify or create)
- `zephix-frontend/src/features/projects/components/LinkProjectModal.tsx` (verify or create)
- Verify project detail page includes link/unlink controls

---

### Day 10: End-to-End MVP Flow Test

**Goal:** Run complete MVP flow and document any remaining gaps

**MVP Flow Steps:**
1. Login
2. Land on role home (`/home`)
3. Enter workspace by slug (`/w/:slug/home`)
4. Create project from template
5. Assign work and update status
6. Verify rollups and basic reporting

**Acceptance Criteria:**
- [ ] All 6 MVP flow steps complete without errors
- [ ] Role home shows correct content for admin/member/guest
- [ ] Workspace home shows health snapshot
- [ ] Project creation from template works
- [ ] Task assignment works
- [ ] Status updates respect transition rules
- [ ] Notifications appear in inbox
- [ ] Rollups show correct totals
- [ ] Link/unlink works smoothly

**Demo Script:**
1. **Login** - Login as admin
2. **Land on role home** - Verify `/home` shows AdminHome with org snapshot
3. **Enter workspace** - Navigate to `/w/test-workspace/home`, verify health snapshot displays
4. **Create project from template** - Create 2 projects from template, verify phases and tasks created
5. **Assign work** - Assign 3 tasks to different members, verify notifications sent
6. **Update status** - Members update task status (respecting transitions), verify notifications
7. **Verify rollups** - Create portfolio and program, link projects, verify rollup totals
8. **Basic reporting** - View workspace home health snapshot, verify all metrics correct

**Files to Document:**
- Create `docs/MVP_DEMO_SCRIPT.md` with step-by-step demo
- Document any remaining gaps in `docs/MVP_PARITY_MATRIX.md`

---

## Acceptance Criteria Summary

### Blocker 1: Role-specific `/home` ✅
- **Status:** Already built
- **Verification:** Test with admin, member, guest users

### Blocker 2: `/w/:slug/home` route ✅
- **Status:** Already built
- **Verification:** Navigate to `/w/:slug/home`, verify WorkspaceHome renders

### Blocker 3: Workspace health snapshot ⚠️
- **Status:** Backend exists, UI displays, needs verification
- **Acceptance:** Health snapshot widget shows all metrics correctly

### Blocker 4: Status progression enforcement ❌
- **Status:** Not built
- **Acceptance:** Service validates transitions, UI only shows valid next states

### Blocker 5: Rollup proof ⚠️
- **Status:** Endpoints exist, need verification
- **Acceptance:** Rollups show correct totals, refresh on link/unlink

### Blocker 6: Core notifications ⚠️
- **Status:** Activity recorded, notifications not dispatched
- **Acceptance:** Task assigned, status changed, comment added trigger notifications

---

## Risk Mitigation

### High Risk Items
1. **Status transition rules** - Need to define canonical rules and enforce consistently
2. **Notification wiring** - Need to ensure all event types are wired correctly
3. **Rollup refresh** - Need to ensure rollups recalculate on link/unlink

### Mitigation
- Start with status transitions (Day 2-3) to establish pattern
- Test notifications with real users (Day 4-5)
- Verify rollup calculations with test data (Day 6-7)

---

## Success Metrics

**Week 1:**
- Workspace health snapshot verified
- Status transitions enforced
- Notifications wired for 3 core events

**Week 2:**
- Rollup calculations verified
- Link/unlink UI polished
- End-to-end MVP flow passes

**Final:**
- All 6 MVP blockers cleared
- Demo script passes
- Ready for external user testing

---

**Last Updated:** 2025-01-27
**Next Review:** After Day 5 (mid-week checkpoint)
