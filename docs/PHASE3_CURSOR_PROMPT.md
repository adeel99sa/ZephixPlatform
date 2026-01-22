# MASTER CURSOR PROMPT FOR ZEPHIX – PHASE 3 WORKSPACE PERMISSIONS AND SETTINGS

You are working on Zephix, an enterprise project management platform.

**You are not allowed to improvise features or change the sequence in this prompt.**
**Follow the steps exactly, in order.**
**Do not skip any step.**
**Do not add extra features that are not listed.**

**If anything is unclear, stop and add a TODO comment in code instead of inventing behavior.**

**You must treat this prompt as the single source of truth for Phase 3.**
**Ignore older ideas that conflict with this document.**

---

## SECTION 0. PHASE CONTEXT

Previous phases are already implemented.

**Phase 1**
- Admin entry and AdminLayout
- **Status:** Complete

**Phase 2**
- Admin functional pages
- Admin Overview, Users, Groups structure, Workspaces list and modals
- **Status:** Complete and verified

**Current phase**
- **Phase 3**
- Workspace permissions and workspace settings
- **Goal:** Make workspaces governable with clear roles, permissions, and a proper settings experience

**You must not touch Template Center, dashboards, AI, BRD, or resource engine in this phase.**
**You must not change AdminOverview or Admin Users behavior except where needed for dropdowns or lists.**

---

## SECTION 1. PHASE 3 GOAL

**Goal for Phase 3**

1. Define and enforce workspace role model
2. Implement workspace permission resolution on backend for workspace related actions
3. Build a first class Workspace Settings page
4. Implement workspace member management and role changes
5. Implement a Permissions tab in Workspace Settings that controls behavior through a stored configuration
6. Keep everything scoped to workspaces. No global features

### Workspace role model for this phase

Use this model at workspace level:

* `workspace_owner`
* `workspace_admin`
* `workspace_member`
* `workspace_viewer`

**Organization owner and organization admin always have at least workspace_owner power for any workspace in their org.**
**Workspace roles never override org roles.**

### Permission model for this phase

Use advanced role based with a config matrix.

Workspace has a simple permissions configuration stored as JSON.

The config defines what each workspace role can do inside that workspace.

### Settings UI style

Use a **Linear style layout**:
- Left vertical sub nav with sections
- Right side content panel per section
- No heavy cards like Monday
- No copy of Monday layout

---

## SECTION 2. CORE WORKSPACE RULES

### Workspace first rule

* Every project, board, document, form, and template belongs to a workspace
* Only org owner or org admin create workspaces
* Admin assigns workspace owner
* Workspace owner or admin later manage workspace members and roles
* Project creation is still Template Center only. Do not change project creation in Phase 3

### Workspace roles

* `workspace_owner`
* `workspace_admin`
* `workspace_member`
* `workspace_viewer`

### Org roles

* `owner`
* `admin`
* `member`
* `viewer`

**Org owner and org admin are always treated as workspace_owner for all permissions.**
**Workspace roles apply only to users who are not org owner or org admin.**

### Workspace permissions to model in this phase

Configure these actions in a matrix:

* View workspace
* Edit workspace metadata (name, description, default methodology)
* Manage members
* Change member roles
* Change workspace owner
* Archive workspace
* Delete workspace
* Create projects in workspace
* Create boards in workspace
* Create documents and forms in workspace

**For Phase 3 you must:**

* Store the matrix configuration on workspace or workspace_settings
* Enforce it for:
  * Workspace Settings page access
  * Member management actions
  * Archive and delete workspace actions
  * Project creation permission check hook (but do not change Template Center flow yet)

**You can add TODO comments where full enforcement comes in later phases.**

---

## SECTION 3. BACKEND REQUIREMENTS

**You must keep all work inside workspace related modules, organizations module, and admin module only where needed.**

### 3.1 Entities and schema

**Check existing entities:**

* `workspace.entity.ts`
* `workspace_member.entity.ts`
* `organization.entity.ts`
* `user_organization.entity.ts`

**If workspace_member already has a role column, extend it to support:**

* `owner`
* `admin`
* `member`
* `viewer`

**If it does not, add a workspace_role column as enum or constrained string.**

**Add or confirm a place to store workspace permissions config**

**Option A:** Add `workspace_settings.entity.ts` if it exists, extend it with:
* `default_methodology`
* `permissions_config` jsonb

**Option B:** Add a jsonb column on `workspace.entity.ts` if that is simpler for now:
* `permissions_config` jsonb

**Do not create a new module.**
**Use existing workspace or organization settings entities.**

### 3.2 Permission resolution service

**Create a service class such as:**

* `WorkspacePermissionService`

**Location example:**

* `src/modules/workspaces/services/workspace-permission.service.ts`

**Responsibilities:**

* Given userId, organizationId, workspaceId, and an action string, decide if allowed
* Map org roles:
  * org owner and org admin always allowed for all workspace actions
* Map workspace roles to permission matrix from permissions_config

**Actions to support now:**

* `view_workspace_settings`
* `edit_workspace_settings`
* `manage_workspace_members`
* `change_workspace_owner`
* `archive_workspace`
* `delete_workspace`
* `create_project_in_workspace`
* `create_board_in_workspace`
* `create_document_in_workspace`

**Use simple string constants for actions. No magic strings in controllers.**

### 3.3 Decorators and guards

**Add decorators or helper functions:**

* `@RequireWorkspacePermission(action: WorkspacePermissionAction)`

**Or:**

* helper function `checkWorkspacePermission(user, workspaceId, action, permissionsService)`

**In Phase 3 you must enforce permission guard for:**

* `GET /workspaces/:id/settings`
* `PATCH /workspaces/:id/settings`
* `POST /workspaces/:id/members`
* `PATCH /workspaces/:id/members/:userId`
* `DELETE /workspaces/:id/members/:userId`
* `POST /workspaces/:id/archive`
* `DELETE /workspaces/:id`

**You must not refactor all controllers.**
**Focus on workspace settings and workspace membership first.**

### 3.4 API endpoints

**Confirm or add these endpoints if missing:**

* `GET    /api/workspaces/:id/settings`
* `PATCH  /api/workspaces/:id/settings`
* `GET    /api/workspaces/:id/members`
* `POST   /api/workspaces/:id/members`
* `PATCH  /api/workspaces/:id/members/:userId`
* `DELETE /api/workspaces/:id/members/:userId`
* `POST   /api/workspaces/:id/archive`
* `DELETE /api/workspaces/:id` (delete workspace)

**All of them must be protected with:**

* `JwtAuthGuard`
* Tenant or organization guard
* Workspace permission enforcement as described

**Do not change AdminController endpoints except if you need to add workspace owner choices.**

### 3.5 Validation and org scoping

* Every workspace query must filter by organizationId from JWT
* Membership operations must check that target user belongs to the same organization
* You must block changing workspace owner to a user outside the org
* You must block removing the last owner from workspace
* Deleting workspace must be allowed only for org owner, org admin, or workspace owner if the matrix allows it

**Add TODO comments for full cascading delete behavior.**

---

## SECTION 4. FRONTEND REQUIREMENTS

**You must keep frontend work inside workspace and admin areas.**
**Do not touch Template Center, dashboards, AI, or PM views.**

### 4.1 Workspace Settings route and layout

**Use route:**

* `/workspaces/:workspaceId/settings`

**It must use DashboardLayout, not AdminLayout.**

**Routes file example:**

* `src/App.tsx` or `src/router/index.tsx`

**Ensure:**

* Workspace view still works
* Workspace Settings is accessible from:
  * Workspace left nav item "Settings" if present
  * Command palette entry
  * Admin workspaces list "Edit" action

### 4.2 Workspace Settings page structure

**File example:**

* `src/features/workspaces/settings/WorkspaceSettingsPage.tsx`

**Sections in left sub nav:**

* General
* Members
* Permissions
* Activity

**Layout:**

* Left column sub nav
* Right content panel

**Use test IDs:**

* Root container: `data-testid="ws-settings-root"`
* Left nav items:
  * `data-testid="ws-settings-nav-general"`
  * `data-testid="ws-settings-nav-members"`
  * `data-testid="ws-settings-nav-permissions"`
  * `data-testid="ws-settings-nav-activity"`

**Use Zustand or existing hooks to load:**

* current workspace
* current user
* workspace members
* permissions config

### 4.3 General tab

**Fields:**

* Workspace name
* Description
* Owner (dropdown of org users)
* Visibility (public or private)
* Default methodology (waterfall, agile, scrum, kanban, hybrid)

**Behavior:**

* Only users with `edit_workspace_settings` permission can edit
* Others see the fields as read only
* Changing owner opens a confirm dialog
* Owner dropdown is populated from organization members

**Test IDs:**

* `data-testid="ws-settings-general-root"`
* `data-testid="ws-settings-name-input"`
* `data-testid="ws-settings-description-input"`
* `data-testid="ws-settings-owner-select"`
* `data-testid="ws-settings-visibility-select"`
* `data-testid="ws-settings-methodology-select"`
* `data-testid="ws-settings-general-save"`

### 4.4 Members tab

**Content:**

* Table of workspace members:
  * Name
  * Email
  * Workspace role (owner, admin, member, viewer)
  * Org role (display only)
  * Status
  * Actions

**Features:**

* Role dropdown to change workspace role where allowed
* Remove member action
* Invite member button:
  * Opens modal
  * Uses existing invite or adds simple stub that calls an admin or organization endpoint

**Rules:**

* Only users with `manage_workspace_members` permission see role dropdowns and remove buttons
* You must prevent:
  * Removing the last workspace owner
  * Downgrading the last owner to non owner

**Test IDs:**

* `data-testid="ws-settings-members-root"`
* `data-testid="ws-settings-members-table"`
* `data-testid="ws-settings-members-invite"`
* `data-testid="ws-settings-member-row"`
* `data-testid="ws-settings-member-role-select"`
* `data-testid="ws-settings-member-remove"`

### 4.5 Permissions tab

**This is the central part of Phase 3.**

**Content:**

* Permissions matrix with rows = actions, columns = roles
* Focus on these actions:
  * View workspace
  * Edit workspace settings
  * Manage members
  * Change owner
  * Archive workspace
  * Delete workspace
  * Create projects
  * Create boards
  * Create documents and forms

**Display:**

* For each action, show checkboxes or toggles under each role
* Some constraints are enforced in UI:
  * `workspace_owner` always has all permissions
  * You cannot uncheck owner for any action
* When the matrix is changed and saved, call an API to update permissions_config

**Backend:**

* Connect to `PATCH /api/workspaces/:id/settings` or a dedicated endpoint for permissions
* Save the matrix as JSON using a stable shape, for example:
```json
{
  "view_workspace": ["owner", "admin", "member", "viewer"],
  "edit_workspace_settings": ["owner", "admin"],
  "manage_workspace_members": ["owner", "admin"],
  "change_workspace_owner": ["owner"],
  ...
}
```

**Test IDs:**

* `data-testid="ws-settings-permissions-root"`
* `data-testid="ws-settings-permissions-row-view-workspace"`
* `data-testid="ws-settings-permissions-row-edit-settings"`
* `data-testid="ws-settings-permissions-row-manage-members"`
* `data-testid="ws-settings-permissions-row-change-owner"`
* `data-testid="ws-settings-permissions-row-archive"`
* `data-testid="ws-settings-permissions-row-delete"`
* `data-testid="ws-settings-permissions-row-create-projects"`
* `data-testid="ws-settings-permissions-save"`

### 4.6 Activity tab

**For Phase 3 this is a placeholder.**
**Do not implement full audit log.**

**Content:**

* Heading: Workspace activity
* Short text: Activity log will show changes to members, roles, settings
* Maybe show a small static list with TODO comment

**Test ID:**

* `data-testid="ws-settings-activity-root"`

### 4.7 Command palette and navigation

**Command palette must have a workspace settings command:**

* "Open workspace settings"
* Only visible when a workspace is active
* Navigates to `/workspaces/:id/settings`

**Add test ID:**

* `data-testid="action-workspace-settings"`

---

## SECTION 5. STEP BY STEP EXECUTION

**You must follow these steps in order.**
**Do not start later steps early.**
**Do not go beyond Step 10.**

### Step 1. Backend workspace role model

* Inspect `workspace_member` entity and related code
* Confirm role column exists
* If needed, extend enum or type to `owner`, `admin`, `member`, `viewer`
* Ensure migrations are updated or add a new migration
* Ensure existing data maps safely, for example old owner, member, viewer map into new set

### Step 2. Workspace permissions config storage

* Decide where to store `permissions_config` (workspace or workspace_settings)
* Add column to entity
* Add migration for the new column
* Add default config with a safe matrix, for example:
  * `owner`: all actions
  * `admin`: almost all actions except delete workspace
  * `member`: view workspace, create documents, maybe create tasks later
  * `viewer`: view workspace only

### Step 3. WorkspacePermissionService

* Create `WorkspacePermissionService`
* Add methods:
  * `getRoleForUserInWorkspace(userId, orgRole, workspaceId)`
  * `isAllowed(user, workspaceId, action)`
* Use these rules:
  * org owner and org admin always allowed
  * workspace_owner always allowed
  * workspace_admin uses matrix
  * workspace_member and viewer use matrix
* Add unit level tests if tests exist in project, or at least keep functions simple

### Step 4. Decorators or helper integration

* Add decorator or helper to check permissions in controllers
* Integrate into:
  * workspace settings get and patch
  * members get, add, update, delete
  * archive and delete workspace endpoints
* Add TODO comments where extended enforcement is needed later

### Step 5. Workspace Settings route wiring

* Verify `/workspaces/:id/settings` route exists
* If not, add it under DashboardLayout
* Ensure it renders `WorkspaceSettingsPage`
* Ensure `WorkspaceSettingsPage` loads current workspace, members, and permissions_config through API

### Step 6. Implement General tab

* Build General tab UI
* Hook up to backend GET and PATCH endpoints
* Implement owner change and confirm dialog
* Respect permissions from backend. Users without edit rights see disabled controls

### Step 7. Implement Members tab

* Build members table with role dropdown and remove button
* Hook up to members endpoints
* Block last owner removal and demotion, both in UI and backend
* Respect permissions from backend. Only allowed users see controls

### Step 8. Implement Permissions tab

* Build matrix UI
* Bind it to permissions_config
* Hook save action to backend
* Enforce constraints such as owner always enabled
* On save, workspace permission service should use new config for decisions

### Step 9. Activity tab placeholder

* Implement simple static content with TODO
* No backend work required beyond a simple stub if needed

### Step 10. Verification

**Frontend:**

* Run typecheck
* Run lint
* Run build

**Backend:**

* Run build
* Run migrations check or test database migration script if used

**Manual checks:**

**As org admin:**

* Open a workspace
* Open workspace settings from:
  * Left workspace nav
  * Command palette
  * Admin workspaces list edit action
* General tab:
  * Update name and description, owner, visibility, methodology
* Members tab:
  * Change member roles
  * Add and remove members
  * Try to remove last owner. It must fail
* Permissions tab:
  * Change matrix and save
  * Confirm that an org member with no workspace role cannot access settings when matrix denies it
* Activity tab:
  * Page loads

**As workspace_member only (no admin):**

* Confirm you can access workspace if allowed
* Confirm workspace settings respect the matrix. Example:
  * If matrix denies members to edit settings, fields must be read only and backend must reject PATCH

**As viewer:**

* Confirm behavior matches matrix

**Report:**

At the end you must output:

* A bullet list of files changed
* Short description of each change
* Confirmation of builds and checks
* Summary of manual checks and actual results
* Clear note that Phase 3 is complete, then stop

**Do not start Phase 4 in this run.**

---

## SECTION 6. PHASE STOP POINT

**When Steps 1 through 10 and verification are done, you must stop.**

**Do not start Template Center, methodology engine, risk engine, dashboards, or AI features.**

**Wait for next instructions.**

---

## END OF PHASE 3 CURSOR PROMPT

---

## PHASE TRACKER

**Current Phase:** 3
**Status:** Prompt ready
**Next Action:** Paste Phase 3 prompt into Cursor and execute steps 1 to 10 only


















