# PHASE 4 CURSOR PROMPT FOR ZEPHIX – TEMPLATE CENTER

You are working on Zephix, an enterprise project management platform.

**You are not allowed to improvise features or change the sequence in this prompt.**
**Follow the steps exactly, in order.**
**Do not skip any step.**
**Do not add extra features that are not listed.**

**If anything is unclear, stop and add a TODO comment in code instead of inventing behavior.**

**You must treat this prompt as the single source of truth for Phase 4.**
**Ignore older ideas that conflict with this document.**

---

## SECTION 0. CONTEXT AND HARD RULES

### Phase history

* **Phase 1**: Admin entry and AdminLayout – complete
* **Phase 2**: Admin Overview, Users, Groups skeleton, Workspaces management – complete
* **Phase 3**: Workspace permissions and Workspace Settings – complete and cleaned up

### Core business rules

* **Workspace first**
  * A project, board, document, form, or template belongs to a workspace
  * You do not create a project without a workspace
  * Only org owner and org admin create workspaces
  * Workspace owner or admin create projects from Template Center only
  * No global "New Project" or "New Workspace" buttons in header or dashboard

* **Roles**
  * Organization roles: owner, admin, member, viewer
  * Workspace roles: owner, admin, member, viewer
  * Org owner and org admin see Administration
  * Workspace permissions are controlled through Workspace Settings permissionsConfig

* **Template Center principles for this phase**
  * Template Center is the only project creation path
  * Every project created from a template belongs to a workspace
  * PermissionsConfig controls who is allowed to create projects in a workspace
    * Action key: `create_projects_in_workspace`
  * Template Center is visible to users with access to at least one workspace

### Scope limit for Phase 4

* Focus on Template Center and project creation from templates
* Do not change Admin module beyond what is required for Template Center visibility
* Do not change Workspace Settings beyond what is required for project creation permissions
* Do not touch AI modules, AI dashboards, or AI document ingestion
* Do not touch resource engine, resource dashboards, or allocation logic
* Do not build the full Template Builder for complex phases and KPIs in this phase
  * Only build a simple metadata editor and project structure outline

---

## SECTION 1. PHASE 4 GOAL

**The goal for Phase 4 is:**

* Turn Template Center into the single path for project creation
* Provide a usable Template Library and simple Template Editor
* Implement a Create From Template flow that respects workspace permissions

**In this phase you will:**

* Define backend template entities and APIs needed for Template Center v1
* Build the Template Center Library page
* Build a basic Template Editor page for editing template metadata and simple structure
* Wire the Create From Template flow so admins and allowed workspace roles create projects from templates only
* Remove or disable all other project creation paths

**You must stop after all Phase 4 steps are complete and report what changed.**

**Do not start Excel ingestion.**
**Do not start advanced template features like risk bundles or KPI bundles.**

---

## SECTION 2. BACKEND REQUIREMENTS

### General rules

* All Template Center APIs are organization scoped
* All project creation flows pass through a permission check on `create_projects_in_workspace`
* All new APIs must use `JwtAuthGuard` and Tenant or organization guard as already used in other modules
* If `AdminGuard` is not required, do not add it

**You should work under existing modules if possible.**
**If names differ in the codebase, adjust but stay consistent.**

### Backend modules and files

* **Module**: templates module that already exists
  * Example: `src/modules/templates` or similar
* **Entities**:
  * Template
  * ProjectTemplate
  * TemplateLegoBlock or similar, if already present
* **Controllers**:
  * TemplateController
  * ProjectsController (for instantiate endpoint) or dedicated TemplateProjectsController if already present
* **Services**:
  * TemplateService
  * ProjectService

### Required entities and fields

**If entities already exist, extend them.**
**If they do not exist, add them in the templates module.**

#### Template entity

* `id`
* `organizationId`
* `name`
* `description`
* `category`
* `kind` (project, board, mixed)
* `icon` or `color` key (string)
* `isSystem` (boolean)
* `isActive` (boolean)
* `metadata` (jsonb)

#### ProjectTemplate entity

* `id`
* `templateId`
* `methodology` (waterfall, agile, scrum, kanban, hybrid)
* `defaultWorkspaceVisibility` (optional)
* `structure` (jsonb)
  * Simple structure for now
  * Phases and default tasks representation

**You must not introduce complex structures in this phase.**
**Use a simple repeatable JSON shape for project structure.**

### Key backend endpoints

**All paths are under `/api` unless the codebase uses a different root.**

#### Template library

* `GET /api/templates`
  * List templates for current organization
  * Query params:
    * `category` (optional)
    * `kind` (optional)
    * `search` (optional, name or description)
    * `isActive` (optional)
  * Response: paginated list

* `GET /api/templates/:id`
  * Get single template with its projectTemplate structure

* `POST /api/templates`
  * Create template for the organization

* `PATCH /api/templates/:id`
  * Update template metadata and projectTemplate structure

* `DELETE /api/templates/:id`
  * Soft delete or archive template
  * Do not physically delete rows in this phase
  * Use `isActive` or `status`

#### Create from template

* `POST /api/templates/:id/instantiate`
  * Body:
    * `workspaceId`
    * `projectName`
    * `startDate` (optional)
    * `endDate` (optional)
    * `ownerId` (optional, defaults to caller or workspace owner)
  * Behavior:
    * Check workspace belongs to same organization
    * Check caller has permission `create_projects_in_workspace` for that workspace
    * Create project in projects table
    * Create default tasks from template structure
    * Return created project with id and basic info

### Permissions

* `WorkspacePermissionService` will provide a function that checks `create_projects_in_workspace` for given user and workspace
* New template instantiation endpoint must call this function
* If permission is missing, respond 403

**Do not add project budget, KPIs, or risk bundles in this endpoint in Phase 4.**
**Add TODO comments where future enrichment plugs in.**

---

## SECTION 3. FRONTEND REQUIREMENTS

### Frontend module placement

**Use the existing feature based layout.**

**Expected paths:**

* `src/features/templates` or `src/features/template-center`
  * Library view
  * Template detail and editing
  * Create from template flows
* `src/services` or `src/features/templates/api`
  * Template API client

### Routing

* Template Center lives under the main DashboardLayout
* Route path is already present as `/templates`
  * Reuse it for Template Center
* Nested routes under `/templates`:
  * `/templates`
    * Template Library page
  * `/templates/:id`
    * Template detail and edit page

### Template Center entry in sidebar

* Sidebar already includes Template Center entry
* You must verify it routes to `/templates`
* You must not add project create buttons in header or other places

### Template Center library page

**File example:**

* `src/features/templates/TemplateCenterPage.tsx`

**Requirements:**

* Grid or table of templates:
  * Name
  * Category
  * Kind
  * Methodology
  * System vs Org badge
* Filters:
  * Search by name or description
  * Filter by category
  * Filter by methodology
* Actions:
  * Click template row or card:
    * Navigate to `/templates/:id`
  * Button on template:
    * "Use in workspace"
      * Opens workspace selection modal

### Workspace selection modal

* Show list of workspaces where user can create projects
  * In Phase 4 you can show all workspaces in org and rely on backend checks
  * Add TODO to filter by permission later
* Fields:
  * Workspace dropdown
  * Project name input (pre filled from template name)
* On submit:
  * Call `POST /api/templates/:id/instantiate`
  * On success navigate to new project page

### Template detail and edit page

**File example:**

* `src/features/templates/TemplateDetailPage.tsx`

**Requirements:**

* Basic sections:
  * Header with template name, category, methodology
  * Editable fields:
    * Name
    * Description
    * Category
    * Methodology
  * Structure section:
    * Simple list of phases and tasks from structure json
    * Ability to add, rename, delete phases and tasks
* Actions:
  * Save template
  * "Use in workspace" (same as Library)
* Role:
  * Only org owner, org admin, or org member with permission to manage templates should see Edit controls
  * For now you can gate editing with org role (owner or admin) and add a TODO for a richer permission model

### Project creation UI cleanup

* Remove or disable any "Create Project" buttons that are not Template Center:
  * Projects sidebars
  * Dashboards
  * Workspace home
* If you cannot safely remove a button without breaking layout, disable it and show text that project creation moves to Template Center

### Test IDs

**Add test IDs on key elements so you can test later.**

#### Library page

* `data-testid="templates-center-root"`
* `data-testid="templates-list"`
* `data-testid="templates-filter-methodology"`
* `data-testid="templates-filter-category"`
* `data-testid="templates-search-input"`
* `data-testid="template-card"` on each card or row

#### Workspace selection modal

* `data-testid="template-use-modal"`
* `data-testid="template-use-workspace-select"`
* `data-testid="template-use-name-input"`
* `data-testid="template-use-submit"`

#### Template detail page

* `data-testid="template-detail-root"`
* `data-testid="template-name-input"`
* `data-testid="template-description-input"`
* `data-testid="template-category-select"`
* `data-testid="template-methodology-select"`
* `data-testid="template-structure-section"`
* `data-testid="template-structure-phase-row"`
* `data-testid="template-structure-task-row"`

---

## SECTION 4. STEP BY STEP EXECUTION

**You must follow these steps in order and stop after Step 8.**

**Do not add AI.**
**Do not add Excel ingestion.**
**Do not add dashboards.**

### Step 1. Backend template entities and migration

* Locate the templates module and its entities
* If Template and ProjectTemplate entities already exist:
  * Extend them to match the fields listed earlier
  * Add missing columns through migrations
* If they do not exist:
  * Create them in the templates module
  * Add migrations to create tables

**Constraints:**

* All template tables must include `organizationId` field
* No direct cross organization references

### Step 2. Template library backend endpoints

* Implement or extend controller for templates
* Add these endpoints with `JwtAuthGuard` and organization scoping:
  * `GET /api/templates`
  * `GET /api/templates/:id`
  * `POST /api/templates`
  * `PATCH /api/templates/:id`
  * `DELETE /api/templates/:id`
* Use TemplateService methods and ensure they filter by `organizationId`
* Add TODO comments where future filters or pagination improvements go

### Step 3. Instantiate from template backend endpoint

* Implement `POST /api/templates/:id/instantiate`
* Flow:
  * Load template for current organization
  * Validate `workspaceId` belongs to same organization
  * Call `WorkspacePermissionService` to check `create_projects_in_workspace` for current user and workspace
  * If not allowed, return 403
  * Create project
  * Create tasks from template structure
  * Return created project id and route friendly data
* Add TODO comment where KPIs, risks, and extra configuration will be attached in later phases

### Step 4. Frontend Template Center routing and API client

* Create or update Template API client in frontend:
  * Methods for all template endpoints and instantiate endpoint
* Wire `/templates` route to `TemplateCenterPage`
* Wire `/templates/:id` route to `TemplateDetailPage`
* Ensure Template Center entry in sidebar goes to `/templates`

### Step 5. Template Center Library page

* Implement `TemplateCenterPage`
* Show list of templates with filters
* Implement "Use in workspace" action:
  * Opens Workspace selection modal
  * Calls instantiate endpoint
  * Navigates to new project

### Step 6. Template detail and basic editor

* Implement `TemplateDetailPage`
* Bind to `GET /api/templates/:id` and `PATCH /api/templates/:id`
* Editable fields:
  * Name, description, category, methodology
  * Simple structure:
    * Phases with a list of tasks
* Save updates to backend
* "Use in workspace" action identical to Library page

### Step 7. Remove legacy project creation paths

* Search the frontend for any "New Project" buttons, quick actions, or routes
* For each:
  * If it can be replaced with a navigation link to Template Center with workspace context, do it
  * Otherwise hide or disable it
* Ensure the only project creation flow calls `POST /api/templates/:id/instantiate`

### Step 8. Verification

**Backend commands:**

* `cd zephix-backend`
* `npm run build`

**Frontend commands:**

* `cd zephix-frontend`
* `npm run typecheck`
* `npm run lint`
* `npm run build`

**Manual checks:**

**As org admin or owner:**

* You see Template Center in sidebar
* `/templates` loads a list of templates
* Clicking a template opens detail page
* "Use in workspace" lets you select a workspace and name, then creates a project
* New project page loads and belongs to the selected workspace
* No other "New Project" entry point exists

**As member with no `create_projects_in_workspace` permission:**

* Template Center is visible if your role should see it
* "Use in workspace" fails with a clear error when backend returns 403
* You do not see random "New Project" buttons outside Template Center

**Report:**

At the end of this run you must output:

* A bullet list of files changed
* A short description of each change
* Confirmation of backend build
* Confirmation of frontend typecheck, lint, and build
* Manual verification summary for admin and member

**Stop here.**
**Do not start Excel ingestion or complex template builder steps.**

---

## SECTION 5. EXCLUDED WORK FOR THIS PHASE

**Do not do these in Phase 4:**

* No Excel template ingestion
* No advanced template builder with risk libraries and KPI libraries
* No AI in Template Center
* No changes to Admin module except what routing needs
* No workspace delete semantics beyond what is already planned
* No dashboards or reporting changes

**These belong to later phases.**

---

## PHASE TRACKER

**Phase 1**
- Admin entry and AdminLayout
- **Status:** Complete

**Phase 2**
- Admin Overview, Users, Groups skeleton, Workspaces management
- **Status:** Complete

**Phase 3**
- Workspace permissions and Workspace Settings
- **Status:** Complete with cleanup

**Phase 4**
- Template Center as single project creation path
- **Status:** This prompt ready. Awaiting Cursor execution.

---

## END OF PHASE 4 CURSOR PROMPT

















