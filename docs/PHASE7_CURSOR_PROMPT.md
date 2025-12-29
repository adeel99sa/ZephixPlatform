# PHASE 7 CURSOR PROMPT

Phase 7 focuses on **Projects**. Your admin, workspaces, templates, and template builder are done. Now you connect everything into real project pages and real boards.

---

## SECTION 0: Core Rules

- **Workspace first**: Projects must always belong to a workspace.
- **Project pages must use DashboardLayout**.
- **No global create**: Only Template Center creates projects.
- **Permissions must block member and viewer** if workspace permission is missing.
- **All routes must be typed**.
- **All new pages must include test IDs**.

---

## SECTION 1: Goal

Deliver complete MVP project experience.

You will build:
- Project list
- Project overview
- Project board
- Tasks list
- Risks view
- KPIs view
- Project settings
- Project menu integration
- Board integration
- Permissions enforcement
- Data loading and caching layer

---

## SECTION 2: Backend Requirements

You will implement or update these endpoints:

- `GET /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/projects/:id/tasks`
- `GET /api/projects/:id/risks`
- `GET /api/projects/:id/kpis`
- `PATCH /api/projects/:id/settings`
- `POST /api/projects/:id/archive`

### Rules

- Always filter by `organizationId`
- Always filter by `workspaceId`
- Use workspace permission guard for:
  - `view_workspace`
  - `edit_workspace_settings`
  - `manage_workspace_members`
  - `create_projects_in_workspace`
  - `delete_project_in_workspace`
  - `change_project_owner`
  - `update_project_details`

### Return Structure

Project summary must include:
- `id`
- `name`
- `workspaceId`
- `methodology`
- `status`
- `ownerId`
- `phases count`
- `tasks count`
- `risks count`
- `kpis count`
- `dates`
- `progress number`
- `riskScore number`

---

## SECTION 3: Frontend Requirements

Create folders under `features/projects`:
- `overview`
- `board`
- `tasks`
- `risks`
- `kpis`
- `settings`

Create all pages with test IDs.

Each page must:
- Fetch backend data
- Show loading state
- Block user if permission is missing

### You will build these pages:

**ProjectOverviewPage**
- Details: Name, Owner, Dates, Progress
- Phases summary
- Tasks summary
- Risk summary
- KPI summary
- Navigation buttons

**ProjectBoardPage**
- Simple board
- Columns: To Do, In Progress, Done
- List tasks under each
- Drag disabled for now
- Actions disabled except view
- Tasks loaded from tasks endpoint

**ProjectTasksPage**
- List view
- Columns: Task name, Phase, Assignee, Status, Due date, Risk flag
- Permission check for editing

**ProjectRisksPage**
- List risks
- Title, Severity, Probability, Phase, Owner, Source
- No editing in MVP

**ProjectKpisPage**
- List KPIs
- Name, Type, Unit, Target, Current, Direction
- No editing in MVP

**ProjectSettingsPage**
- Editable: Name, Owner, Description, Dates
- Permission enforcement

---

## SECTION 4: Routing

Add routes:
- `/projects`
- `/projects/:id`
- `/projects/:id/overview`
- `/projects/:id/board`
- `/projects/:id/tasks`
- `/projects/:id/risks`
- `/projects/:id/kpis`
- `/projects/:id/settings`

Each must be wrapped in: `<ProtectedRoute> <DashboardLayout>`

---

## SECTION 5: Navigation Updates

Add project menu to left sidebar under workspace section.

Clicking workspace shows its projects.

Entry point for projects list:
- `/workspaces/:id/projects`

---

## SECTION 6: Step by Step Execution

You must follow this exact sequence.

### Step 1: Create backend endpoints
- Implement project summary and detail response
- Permission guard on each route
- Return correct structure

### Step 2: Create frontend API clients
- Typed responses
- Error handling
- Permission errors surfaced

### Step 3: Create ProjectOverviewPage
- Load project, risks, tasks, kpis
- Show all summaries

### Step 4: Create ProjectBoardPage
- Render columns and tasks
- No editing

### Step 5: Create ProjectTasksPage
- Render table
- No edit actions yet

### Step 6: Create ProjectRisksPage
- Render list

### Step 7: Create ProjectKpisPage
- Render list

### Step 8: Create ProjectSettingsPage
- Name, Owner, Dates, Description
- Permission enforcement

### Step 9: Update WorkspaceProjectsList
- Link to new pages
- Remove any legacy boards
- Block create unless Template Center

### Step 10: Perform verification
- Build must pass
- Routes must work
- All test IDs must exist

---

## SECTION 7: Stop Point

Stop after Step 10.

**Do not build:**
- Editing
- Drag and drop
- Advanced layouts

Wait for instruction before Phase 8.

---

**End of Phase 7 prompt.**

















