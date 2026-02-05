# MVP Demo Scripts

**Date:** 2025-01-27
**Purpose:** Polished demo scripts for Day 5 (internal) and Day 10 (investor)
**Audience:** Day 5 = Engineering + Product team, Day 10 = Investors + Early adopters

---

## Day 5: Internal Demo Script

**Duration:** 15 minutes
**Audience:** Engineering team, Product, QA
**Goal:** Prove Week 1 blockers cleared, show technical progress

### Pre-Demo Setup (5 min)

**Test Data:**
- 1 organization with 2 workspaces
- 3 users: Admin, Member, Guest
- 1 workspace with 5 projects, 20 tasks
- Tasks in various states: TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE
- 1 project with tasks assigned to Member user

**Browser Setup:**
- Open 3 browser windows (one per user role)
- Clear browser cache
- Ensure notifications enabled in user preferences

---

### Demo Flow (10 min)

#### 1. Role-Specific Home (2 min)

**Admin Window:**
1. Login as admin
2. Navigate to `/home`
3. **Show:** AdminHome displays:
   - Organization summary (active workspaces, active projects, at-risk projects)
   - Quick actions (Create Workspace, Manage Workspaces, Invite Users)
   - Inbox preview (if unread notifications exist)

**Member Window:**
1. Login as member
2. Navigate to `/home`
3. **Show:** MemberHome displays:
   - My Work summary (work items due soon, active projects, risks I own, upcoming milestones)
   - Team signals section
   - Inbox preview

**Guest Window:**
1. Login as guest (VIEWER)
2. Navigate to `/home`
3. **Show:** GuestHome displays:
   - Read-only summary (accessible workspaces, accessible projects)
   - Access guidance message

**Checkpoint:** "All three role homes render correctly with role-appropriate data."

---

#### 2. Workspace Entry by Slug (1 min)

**Admin Window:**
1. Navigate to `/w/test-workspace/home`
2. **Show:** WorkspaceHomeBySlug loads successfully
3. **Show:** Workspace store updates with active workspace
4. **Show:** URL shows `/w/test-workspace/home` (slug-based routing)

**Checkpoint:** "Workspace slug routing works, workspace home loads."

---

#### 3. Workspace Health Snapshot (2 min)

**Admin Window:**
1. On workspace home, scroll to health snapshot widget
2. **Show:** Execution summary widget displays:
   - Active Projects: 5
   - Total Work Items: 20
   - Overdue: 3 (highlighted in red)
   - Due Soon (7 days): 5 (highlighted in yellow)
   - In Progress: 8
   - Done Last 7 Days: 4
3. **Show:** Overdue Tasks panel shows top 10 overdue items with:
   - Task title
   - Due date
   - Project name
   - Assignee name
4. **Show:** Recent Activity panel shows last 20 activities with:
   - Activity type (status changed, assigned, comment added)
   - Actor name
   - Task title
   - Project name
   - Timestamp

**Checkpoint:** "Health snapshot displays all metrics correctly, matches database counts."

---

#### 4. Status Progression Enforcement (3 min)

**Member Window:**
1. Navigate to a project with tasks
2. Open a task with status TODO
3. **Show:** Status dropdown only shows valid next states:
   - IN_PROGRESS
   - BLOCKED
   - CANCELED
   - (DONE is NOT shown - invalid transition)
4. Change status to IN_PROGRESS
5. **Show:** Status updates successfully
6. **Show:** Status dropdown now shows:
   - IN_REVIEW
   - BLOCKED
   - CANCELED
   - (TODO is NOT shown - invalid transition)
7. Try to change status to DONE directly
8. **Show:** Error message: "Invalid status transition. Valid next states: IN_REVIEW, BLOCKED, CANCELED"
9. Change status to IN_REVIEW
10. **Show:** Status updates successfully
11. Change status to DONE
12. **Show:** Status updates successfully
13. Try to change status from DONE to TODO
14. **Show:** Error message: "DONE is a terminal state. Cannot transition to other states."

**Checkpoint:** "Status transitions are enforced in both UI and backend. Invalid transitions are blocked."

---

#### 5. Core Notifications (2 min)

**Admin Window:**
1. Assign a task to Member user
2. **Show:** Console log shows notification dispatched
3. Navigate to `/inbox`
4. **Show:** Member's inbox shows "Task assigned" notification with:
   - Task title
   - Project name
   - Timestamp
   - Unread badge

**Member Window:**
1. Refresh inbox
2. **Show:** New notification appears: "Task assigned: [Task Name]"
3. Change task status to IN_PROGRESS
4. **Show:** Console log shows notification dispatched
5. Refresh inbox
6. **Show:** New notification appears: "Task status changed: [Task Name] - TODO → IN_PROGRESS"

**Admin Window:**
1. Add a comment to the task
2. **Show:** Console log shows notification dispatched
3. Navigate to Member's inbox (or check email logs)
4. **Show:** New notification appears: "Comment added: [Task Name]"

**Checkpoint:** "Three core notification events (assigned, status changed, comment added) are wired and appear in inbox."

---

### Post-Demo Q&A (5 min)

**Questions to Prepare For:**
- "What happens if a user has notifications disabled?"
- "Are status transitions configurable per workspace?"
- "How do we handle edge cases (e.g., task deleted while status is changing)?"

**Success Criteria:**
- ✅ All 5 checkpoints passed
- ✅ No errors in console
- ✅ All UI interactions smooth
- ✅ Notifications appear within 5 seconds

---

## Day 10: Investor Demo Script

**Duration:** 20 minutes
**Audience:** Investors, potential customers, early adopters
**Goal:** Prove MVP completeness, show business value, demonstrate readiness for external users

### Pre-Demo Setup (5 min)

**Test Data:**
- 1 organization: "Acme Corp"
- 1 workspace: "Q1 2025 Product Launch"
- 1 portfolio: "2025 Product Portfolio"
- 1 program: "Mobile App Launch"
- 3 projects: "iOS App", "Android App", "Backend API"
- 15 tasks across projects, various statuses
- 2 users: Admin (demo presenter), Member (collaborator)

**Browser Setup:**
- Single browser window (admin view)
- Screen share ready
- Backup: Recorded video of demo

---

### Demo Flow (15 min)

#### Opening: The Problem (1 min)

**Narrative:**
"Most project management tools force teams to choose between flexibility and structure. Zephix solves this by combining workspace-level governance with template-driven project creation, real-time health signals, and role-based access that scales from startups to enterprises."

**Visual:**
- Show landing page
- Highlight "Built for teams that ship"

---

#### 1. Login and Role-Based Orientation (2 min)

**Actions:**
1. Navigate to login page
2. Login as admin
3. **Show:** Admin home (`/home`) displays:
   - "Welcome back, [Admin Name]!"
   - Organization overview: 3 active workspaces, 12 active projects, 2 at-risk projects
   - Quick actions: Create Workspace, Manage Workspaces, Invite Users
   - Inbox preview: 3 unread notifications

**Narrative:**
"Every user lands on a role-appropriate home. Admins see organization-wide metrics and quick actions. Members see their assigned work. Guests see read-only access to shared content."

**Key Point:** "Zero configuration. Users immediately understand what they can do."

---

#### 2. Workspace Entry and Health Snapshot (3 min)

**Actions:**
1. Click "Q1 2025 Product Launch" workspace
2. **Show:** URL updates to `/w/q1-2025-product-launch/home`
3. **Show:** Workspace home displays:
   - Workspace header with owner info
   - Health snapshot widget:
     - 3 active projects
     - 15 total work items
     - 2 overdue (highlighted in red)
     - 4 due soon (highlighted in yellow)
     - 6 in progress
     - 3 done last 7 days
   - Overdue tasks panel: Top 2 overdue items with project names
   - Recent activity: Last 5 activities

**Narrative:**
"Workspace health gives you instant visibility into what needs attention. No clicking through multiple screens. The data updates in real-time as work progresses."

**Key Point:** "One click from login to actionable insights."

---

#### 3. Project Creation from Template (2 min)

**Actions:**
1. Click "New" → "Project"
2. **Show:** Template selection modal
3. Select "Mobile App Development" template
4. **Show:** Template preview with phases and tasks
5. Click "Create Project"
6. **Show:** Project created with:
   - 3 phases: Planning, Development, Testing
   - 12 tasks pre-populated
   - Tasks assigned to phases
   - Project status: DRAFT

**Narrative:**
"Templates eliminate setup time. One click creates a project with phases, tasks, and dependencies already configured. Teams can start working immediately."

**Key Point:** "From idea to execution in 30 seconds."

---

#### 4. Work Execution and Status Enforcement (3 min)

**Actions:**
1. Open "iOS App" project
2. **Show:** Task list with various statuses
3. Click on a TODO task
4. **Show:** Task detail view
5. Try to change status to DONE
6. **Show:** Error: "Invalid status transition. Valid next states: IN_PROGRESS, BLOCKED, CANCELED"
7. Change status to IN_PROGRESS
8. **Show:** Status updates successfully
9. **Show:** Activity log shows "Status changed: TODO → IN_PROGRESS"
10. Change status to IN_REVIEW
11. **Show:** Status updates successfully
12. Change status to DONE
13. **Show:** Status updates successfully, task marked complete

**Narrative:**
"Status transitions enforce workflow discipline. Teams can't skip steps or mark work done prematurely. This prevents false progress signals and keeps rollups accurate."

**Key Point:** "Workflow enforcement without micromanagement."

---

#### 5. Notifications and Collaboration (2 min)

**Actions:**
1. Assign a task to Member user
2. **Show:** Notification appears in inbox: "Task assigned: [Task Name]"
3. Add a comment to the task
4. **Show:** Notification appears: "Comment added: [Task Name]"
5. Change task status
6. **Show:** Notification appears: "Task status changed: [Task Name]"

**Narrative:**
"Notifications keep teams aligned. Every assignment, status change, and comment triggers an in-app notification. No one misses important updates."

**Key Point:** "Real-time collaboration without notification fatigue."

---

#### 6. Rollups and Hierarchy (3 min)

**Actions:**
1. Navigate to "2025 Product Portfolio"
2. **Show:** Portfolio rollup displays:
   - 1 program: "Mobile App Launch"
   - 3 projects total (2 via program, 1 direct)
   - 15 work items open
   - 2 work items overdue
   - Health: Yellow (at risk due to overdue items)
3. Navigate to "Mobile App Launch" program
4. **Show:** Program rollup displays:
   - 2 projects: "iOS App", "Android App"
   - 10 work items open
   - 1 work item overdue
   - Health: Yellow
5. Link "Backend API" project to program
6. **Show:** Program rollup updates immediately:
   - 3 projects
   - 15 work items open
   - 2 work items overdue
   - Health: Yellow (unchanged)
7. Unlink "Backend API" project
8. **Show:** Program rollup updates immediately:
   - 2 projects
   - 10 work items open
   - 1 work item overdue

**Narrative:**
"Rollups aggregate work across projects, programs, and portfolios. Link and unlink projects instantly, and rollups recalculate in real-time. No manual refresh needed."

**Key Point:** "Hierarchical visibility with instant updates."

---

#### Closing: MVP Readiness (1 min)

**Narrative:**
"Zephix MVP delivers the core workflow: workspace creation, template-driven project setup, task execution with status enforcement, real-time health signals, and role-based access. All six MVP blockers are cleared. We're ready for external user testing."

**Visual:**
- Show workspace home with all widgets populated
- Show inbox with notifications
- Show portfolio rollup with correct totals

**Key Point:** "MVP complete. Ready for early adopters."

---

### Post-Demo Q&A (5 min)

**Questions to Prepare For:**
- "How does this compare to Linear/ClickUp?"
- "What's the pricing model?"
- "When can we start using this?"
- "What's the roadmap after MVP?"

**Success Criteria:**
- ✅ All 6 MVP blockers demonstrated
- ✅ No errors or broken flows
- ✅ Smooth transitions between screens
- ✅ Business value clearly communicated

---

## Demo Checklist Template

Use this checklist before each demo:

### Technical Setup
- [ ] Test data seeded (workspaces, projects, tasks, users)
- [ ] Browser cache cleared
- [ ] Console errors checked (should be zero)
- [ ] Network tab monitored (no 500 errors)
- [ ] Screen share/recording ready

### Feature Verification
- [ ] Role-specific homes render correctly
- [ ] Workspace slug routing works
- [ ] Health snapshot displays accurate data
- [ ] Status transitions enforced
- [ ] Notifications appear in inbox
- [ ] Rollups calculate correctly
- [ ] Link/unlink updates rollups instantly

### Narrative Flow
- [ ] Opening problem statement prepared
- [ ] Key points identified for each section
- [ ] Closing statement ready
- [ ] Q&A answers prepared

### Backup Plan
- [ ] Recorded video available
- [ ] Screenshots of key screens ready
- [ ] Test data export available (if demo fails)

---

## Demo Failure Scenarios and Responses

### Scenario 1: Feature Not Working
**Response:** "This is exactly why we're doing internal demos. Let me show you what we've built so far, and we'll address this before the investor demo."

### Scenario 2: Slow Performance
**Response:** "We're running on test infrastructure. Production will be optimized. The functionality is what matters here."

### Scenario 3: Missing Data
**Response:** "Let me seed some test data quickly. This demonstrates our data model is flexible."

### Scenario 4: Unexpected Error
**Response:** "This is a known edge case we're addressing. The core flow works as demonstrated. Let me show you the working path."

---

**Last Updated:** 2025-01-27
**Next Review:** Day 4 (before Day 5 demo), Day 9 (before Day 10 demo)
