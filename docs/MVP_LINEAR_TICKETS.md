# MVP Linear Tickets Export

**Date:** 2025-01-27
**Purpose:** Import-ready Linear tickets for Days 1-10 execution
**Format:** Copy-paste into Linear import or create manually

---

## Epic: MVP Blocker Clearance (2 Weeks)

**Description:**
Clear 6 MVP blockers to enable external user testing. All work must pass acceptance criteria and demo checkpoints.

**Timeline:** 10 working days
**Owner:** Product + Engineering

---

## Week 1 Tickets

### Ticket 1: Day 1 - Workspace Health Snapshot Verification

**Title:** `[MVP] Day 1: Verify workspace health snapshot displays correctly`

**Description:**
Verify workspace health snapshot displays correctly on workspace home. Backend exists, UI partially displays. This is verification work, not new build.

**Acceptance Criteria:**
- [ ] Workspace home loads without errors at `/w/:slug/home`
- [ ] Health snapshot widget shows: active projects, total work items, overdue count, due soon count, in progress, done last 7 days
- [ ] Overdue tasks panel displays top 10 overdue items with project names
- [ ] Recent activity panel shows last 20 activities
- [ ] All counts match actual data in database (run SQL query to verify)

**Demo Checkpoint:**
- [ ] Day 1 demo script passes (workspace home loads, health snapshot displays, counts match DB)

**Files to Verify:**
- `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx:557-730`
- `zephix-backend/src/modules/workspaces/services/workspace-health.service.ts:getExecutionSummary()`

**Labels:** `mvp`, `week-1`, `verification`, `day-1`

**Priority:** High

**Estimate:** 4 hours

---

### Ticket 2: Day 2 - Status Transition Rules Service

**Title:** `[MVP] Day 2: Implement status transition validation in service layer`

**Description:**
Create status transition rules service and enforce valid transitions in `updateTask()` method. Invalid transitions must throw `BadRequestException`.

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
- [ ] `TaskStatusTransitionsService` created with `isValidTransition(from, to)` method
- [ ] `updateTask()` validates status transitions before updating
- [ ] Invalid transition throws `BadRequestException` with message: "Invalid status transition. Valid next states: [list]"
- [ ] Terminal states (DONE, CANCELED) cannot transition to any other state
- [ ] Unit test: All valid transitions pass
- [ ] Unit test: All invalid transitions throw exception

**Demo Checkpoint:**
- [ ] API test: Try invalid transition (TODO → DONE), verify 400 error
- [ ] API test: Try valid transition (TODO → IN_PROGRESS), verify 200 success

**Files to Create/Modify:**
- `zephix-backend/src/modules/work-management/services/task-status-transitions.service.ts` (new)
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:updateTask()` (modify)
- `zephix-backend/src/modules/work-management/services/task-status-transitions.service.spec.ts` (new)

**Labels:** `mvp`, `week-1`, `backend`, `day-2`

**Priority:** High

**Estimate:** 6 hours

---

### Ticket 3: Day 3 - Status Transition UI Guardrails

**Title:** `[MVP] Day 3: Filter status dropdown to show only valid next states`

**Description:**
Update UI to filter status dropdown options based on current task status. Only show valid next states per transition rules.

**Acceptance Criteria:**
- [ ] `TaskStatusSelect` component filters options based on current status
- [ ] Status dropdown only shows valid next states (per transition rules)
- [ ] Invalid states are not shown in dropdown
- [ ] Terminal states (DONE, CANCELED) show empty dropdown or disabled state
- [ ] Error message displays if user somehow attempts invalid transition: "Invalid status transition. Valid next states: [list]"

**Demo Checkpoint:**
- [ ] UI test: Task with TODO status shows only: IN_PROGRESS, BLOCKED, CANCELED
- [ ] UI test: Task with DONE status shows empty/disabled dropdown
- [ ] UI test: Try invalid transition via API, verify error message displays

**Files to Create/Modify:**
- `zephix-frontend/src/features/work-management/components/TaskStatusSelect.tsx` (new or modify)
- `zephix-frontend/src/features/projects/components/TaskListSection.tsx` (modify to use TaskStatusSelect)

**Labels:** `mvp`, `week-1`, `frontend`, `day-3`

**Priority:** High

**Estimate:** 4 hours

---

### Ticket 4: Day 4 - Wire Task Assigned Notification

**Title:** `[MVP] Day 4: Wire notification dispatch for task assignment`

**Description:**
Wire `NotificationDispatchService.dispatch()` when task is assigned (assigneeUserId changes). Notification must appear in inbox.

**Acceptance Criteria:**
- [ ] `updateTask()` calls `NotificationDispatchService.dispatch()` when `assigneeUserId` changes
- [ ] Notification event type: `TASK_ASSIGNED`
- [ ] Notification title: "Task assigned: [Task Title]"
- [ ] Notification body: "You have been assigned to [Task Title] in [Project Name]"
- [ ] Notification sent to assignee user (not assigner)
- [ ] Notification appears in `/inbox` page within 5 seconds
- [ ] Guest users (VIEWER) do not receive notifications

**Demo Checkpoint:**
- [ ] Assign task to member user, verify notification appears in member's inbox
- [ ] Check console logs, verify notification dispatched
- [ ] Verify notification does not appear for guest user

**Files to Modify:**
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:updateTask()` (add notification dispatch)

**Labels:** `mvp`, `week-1`, `backend`, `day-4`

**Priority:** High

**Estimate:** 3 hours

---

### Ticket 5: Day 5 - Wire Status Changed and Comment Notifications

**Title:** `[MVP] Day 5: Wire notifications for status changed and comment added`

**Description:**
Wire notification dispatch for task status changed and comment added events. Complete Week 1 notification wiring.

**Acceptance Criteria:**
- [ ] `updateTask()` calls `NotificationDispatchService.dispatch()` when `status` changes
- [ ] Notification event type: `TASK_STATUS_CHANGED`
- [ ] Notification title: "Task status changed: [Task Title]"
- [ ] Notification body: "[Task Title] status changed from [Old Status] to [New Status]"
- [ ] Notification sent to assignee (if assigned), otherwise to reporter
- [ ] `addComment()` calls `NotificationDispatchService.dispatch()` when comment is added
- [ ] Notification event type: `TASK_COMMENT_ADDED`
- [ ] Notification title: "Comment added: [Task Title]"
- [ ] Notification body: "[Actor Name] commented on [Task Title]"
- [ ] Notification sent to assignee and reporter (if different from commenter)
- [ ] All notifications appear in `/inbox` page

**Demo Checkpoint:**
- [ ] Change task status, verify notification appears in assignee's inbox
- [ ] Add comment to task, verify notification appears in assignee's inbox
- [ ] Run Day 5 internal demo script, all checkpoints pass

**Files to Modify:**
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts:updateTask()` (add status changed notification)
- `zephix-backend/src/modules/work-management/services/task-comments.service.ts:addComment()` (add notification dispatch)

**Labels:** `mvp`, `week-1`, `backend`, `day-5`, `demo-gate`

**Priority:** High

**Estimate:** 4 hours

**Blocked By:** Ticket 4

---

## Week 2 Tickets

### Ticket 6: Day 6 - Verify Program Rollup Calculations

**Title:** `[MVP] Day 6: Verify program rollup totals and health calculation`

**Description:**
Verify program rollup endpoint calculates correct totals and health. Test with real data.

**Acceptance Criteria:**
- [ ] `GET /api/programs/:id/rollup` returns correct totals:
  - [ ] Projects total matches count of projects in program
  - [ ] Projects active matches count of ACTIVE projects
  - [ ] Projects at risk matches count of AT_RISK or BLOCKED projects
  - [ ] Work items open matches count of non-DONE work items
  - [ ] Work items overdue matches count of overdue non-DONE work items
  - [ ] Resource conflicts open matches count of unresolved conflicts
  - [ ] Risks active matches count of active risks
- [ ] Health calculation is correct:
  - [ ] BLOCKED if any project is BLOCKED or overdue items > 0
  - [ ] AT_RISK if projects at risk > 0 or resource conflicts > 0
  - [ ] HEALTHY otherwise
- [ ] Rollup includes project summaries (limit 50)

**Demo Checkpoint:**
- [ ] Create program with 3 projects, verify rollup totals match manual count
- [ ] Add overdue work item, verify health changes to AT_RISK
- [ ] Resolve overdue item, verify health changes to HEALTHY

**Files to Verify:**
- `zephix-backend/src/modules/programs/services/programs-rollup.service.ts:getRollup()`
- `zephix-backend/src/modules/programs/services/programs-rollup.service.ts:computeTotals()`

**Labels:** `mvp`, `week-2`, `verification`, `day-6`

**Priority:** High

**Estimate:** 4 hours

---

### Ticket 7: Day 7 - Verify Portfolio Rollup and Refresh Triggers

**Title:** `[MVP] Day 7: Verify portfolio rollup and link/unlink refresh triggers`

**Description:**
Verify portfolio rollup calculates correctly and refreshes when projects are linked/unlinked. Test refresh triggers.

**Acceptance Criteria:**
- [ ] `GET /api/portfolios/:id/rollup` returns correct totals:
  - [ ] Programs total matches count of programs in portfolio
  - [ ] Projects total matches count of direct projects + projects via programs
  - [ ] Projects active, at risk, work items counts are correct
  - [ ] Health calculation is correct
- [ ] Linking project to program updates program rollup immediately (no page refresh needed)
- [ ] Unlinking project from program updates program rollup immediately
- [ ] Linking project to portfolio updates portfolio rollup immediately
- [ ] Unlinking project from portfolio updates portfolio rollup immediately
- [ ] Rollup refresh happens automatically (no manual refresh button needed)

**Demo Checkpoint:**
- [ ] Create portfolio with program and projects
- [ ] Link project to program, verify program rollup updates instantly
- [ ] Unlink project, verify program rollup updates instantly
- [ ] Link project directly to portfolio, verify portfolio rollup updates instantly

**Files to Verify:**
- `zephix-backend/src/modules/portfolios/services/portfolios-rollup.service.ts:getRollup()`
- `zephix-backend/src/modules/projects/workspace-projects.controller.ts:linkProject()` (verify triggers rollup refresh)

**Labels:** `mvp`, `week-2`, `verification`, `day-7`

**Priority:** High

**Estimate:** 5 hours

---

### Ticket 8: Day 8 - Link/Unlink UI Polish

**Title:** `[MVP] Day 8: Polish link/unlink UI with instant tag updates`

**Description:**
Ensure link/unlink UI works smoothly with instant tag updates. No page refresh needed.

**Acceptance Criteria:**
- [ ] Project detail page shows "Program & Portfolio" section
- [ ] "Link Project" button opens modal with program/portfolio selection
- [ ] Linking updates project tags immediately (no page refresh)
- [ ] Project tag shows: "Program: [Program Name]" or "Portfolio: [Portfolio Name]" or "Standalone"
- [ ] Unlinking shows confirmation modal
- [ ] Unlinking updates project tags immediately (no page refresh)
- [ ] Program/portfolio detail pages show linked projects in lists
- [ ] Rollup totals refresh automatically after link/unlink (from Ticket 7)

**Demo Checkpoint:**
- [ ] Link project to program, verify tag updates instantly
- [ ] Unlink project, verify tag updates to "Standalone" instantly
- [ ] Verify program detail page shows project in list
- [ ] Verify rollup totals updated (from Ticket 7)

**Files to Verify/Create:**
- `zephix-frontend/src/features/projects/components/ProjectLinkSection.tsx` (verify or create)
- `zephix-frontend/src/features/projects/components/LinkProjectModal.tsx` (verify or create)

**Labels:** `mvp`, `week-2`, `frontend`, `day-8`

**Priority:** High

**Estimate:** 5 hours

**Blocked By:** Ticket 7

---

### Ticket 9: Day 9 - End-to-End Flow Verification

**Title:** `[MVP] Day 9: Verify complete MVP flow end-to-end`

**Description:**
Run complete MVP flow and verify all 6 blockers are cleared. Document any remaining gaps.

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

**Demo Checkpoint:**
- [ ] Run complete MVP flow, all steps pass
- [ ] No errors in console
- [ ] All UI interactions smooth
- [ ] All acceptance criteria met

**Files to Document:**
- Create `docs/MVP_DEMO_SCRIPT.md` with step-by-step demo (if not exists)
- Document any remaining gaps in `docs/MVP_PARITY_MATRIX.md`

**Labels:** `mvp`, `week-2`, `verification`, `day-9`

**Priority:** High

**Estimate:** 4 hours

**Blocked By:** Tickets 1-8

---

### Ticket 10: Day 10 - Investor Demo Preparation

**Title:** `[MVP] Day 10: Prepare and run investor demo`

**Description:**
Prepare test data, run Day 10 investor demo script, and verify all checkpoints pass.

**Acceptance Criteria:**
- [ ] Test data seeded: organization, workspace, portfolio, program, projects, tasks, users
- [ ] Day 10 investor demo script runs without errors
- [ ] All 6 MVP blockers demonstrated
- [ ] No errors or broken flows
- [ ] Smooth transitions between screens
- [ ] Business value clearly communicated
- [ ] Post-demo Q&A answers prepared

**Demo Checkpoint:**
- [ ] Day 10 investor demo script passes
- [ ] All checkpoints met
- [ ] Ready for external user testing

**Files to Use:**
- `docs/MVP_DEMO_SCRIPTS.md` (Day 10 script)

**Labels:** `mvp`, `week-2`, `demo`, `day-10`, `demo-gate`

**Priority:** High

**Estimate:** 6 hours

**Blocked By:** Ticket 9

---

## Tracking Board Template

Use this format for daily standup:

| Day | Ticket | Status | Acceptance Criteria | Demo Pass/Fail | Blocker |
|-----|--------|--------|---------------------|----------------|---------|
| 1 | Day 1 - Health Snapshot | ⏳ In Progress | 0/5 | - | - |
| 2 | Day 2 - Status Rules Service | ⏳ Pending | - | - | - |
| 3 | Day 3 - Status UI Guardrails | ⏳ Pending | - | - | - |
| 4 | Day 4 - Task Assigned Notification | ⏳ Pending | - | - | - |
| 5 | Day 5 - Status/Comment Notifications | ⏳ Pending | - | - | **DEMO GATE** |
| 6 | Day 6 - Program Rollup Verify | ⏳ Pending | - | - | - |
| 7 | Day 7 - Portfolio Rollup Verify | ⏳ Pending | - | - | - |
| 8 | Day 8 - Link/Unlink UI Polish | ⏳ Pending | - | - | - |
| 9 | Day 9 - E2E Flow Verify | ⏳ Pending | - | - | - |
| 10 | Day 10 - Investor Demo | ⏳ Pending | - | - | **DEMO GATE** |

**Status Values:**
- ⏳ Pending
- 🔄 In Progress
- ✅ Done
- ❌ Blocked
- ⚠️ At Risk

**Demo Pass/Fail Values:**
- ✅ Pass
- ❌ Fail
- ⏸️ Not Run

---

## Import Instructions

### For Linear Import:
1. Copy ticket titles and descriptions
2. Create Epic: "MVP Blocker Clearance (2 Weeks)"
3. Create tickets under Epic
4. Add labels: `mvp`, `week-1`, `week-2`, `day-1` through `day-10`
5. Set priorities: All High
6. Set estimates: As specified
7. Add blocked by relationships: Ticket 5 blocked by 4, Ticket 8 blocked by 7, Ticket 9 blocked by 1-8, Ticket 10 blocked by 9

### For Manual Creation:
1. Create Epic first
2. Create tickets in order (Day 1-10)
3. Link tickets to Epic
4. Add acceptance criteria as checklist items
5. Add demo checkpoint as separate checklist
6. Set blocked by relationships

---

## Daily Execution Rules

1. **No new features** - Only work specified in ticket
2. **No refactors** - Unless blocking acceptance criteria
3. **No scope expansion** - Stick to acceptance criteria exactly
4. **Every day ends with demo** - Run demo script, mark pass/fail
5. **If demo fails, stop** - Fix only what broke, do not move forward

---

**Last Updated:** 2025-01-27
**Next Review:** Daily standup
