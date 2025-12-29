# ✅ MASTER CURSOR PROMPT FOR ZEPHIX

**You are working on Zephix, an enterprise project management platform.**

**You are not allowed to improvise features or change the sequence in this prompt.**
**Follow the steps exactly, in order.**
**Do not skip any step.**
**Do not add extra features that are not listed.**

**If anything is unclear, stop and add a TODO comment in code instead of inventing behavior.**

**You must treat this prompt as the single source of truth.**
**Ignore older ideas that conflict with this document.**

---

## SECTION 0. CORE BUSINESS RULES (DO NOT VIOLATE)

### 1. Workspace-first rule

* A project, board, document, form, or template must belong to a workspace.
* You cannot create a project without a workspace.
* Only admins create workspaces.
* Admin assigns a workspace owner.
* Workspace owner or admin can create projects from Template Center only.
* No global "New project" or "New workspace" actions in header or dashboard.

### 2. Roles and access model

* Organization roles: `owner`, `admin`, `member`, `viewer`.
* Only `owner` and `admin` see Administration.
* Workspace roles: workspace owner, workspace member, non-member (viewer).
* Workspace permissions are managed in Workspace Settings, not per random screen.

### 3. Creation flows

* **Workspaces:**
  * Created only by org admin or org owner.
  * From workspace kebab menu in sidebar or from Administration, not from header.

* **Projects:**
  * Created only through Template Center.
  * Never from random "+ New project" buttons.

* **Boards and other artifacts:**
  * Also created from Template Center inside a workspace context.

### 4. Navigation and IA

* **Header:**
  * Left: logo + workspace switcher (if already implemented).
  * Center: optional search later.
  * Right: Cmd+K, AI toggle, account dropdown with "Administration" for admins.
  * No global create buttons in header.

* **Left sidebar (main app, non admin):**
  * Home
  * Workspaces (with kebab) and nested workspace navigation when a workspace is active
  * Template Center
  * Resources
  * Analytics
  * Settings
  * No user profile in sidebar.

### 5. Methodologies supported

* Only support these methods in system behavior:
  * Waterfall
  * Agile
  * Scrum
  * Kanban
  * Hybrid
* You can structure definitions for these methods.
* Do not add SAFe, LeSS, XP, or other methods unless explicitly instructed later.

### 6. Risk and connectivity principle

* Risks exist at:
  * Task
  * Project
  * Program
  * Portfolio
  * Workspace
  * Operational work
* Later phases must ensure:
  * Risks roll up and connect across levels.
  * KPIs, dashboards, and status link back to these objects.
* Do not implement AI yet. Only prepare structure where it fits into this risk model.

---

## SECTION 1. CURRENT GOAL (PHASE 1 ADMIN VIEW ONLY)

**The only goal for this run is:**

Build a clean, full-page Administration area that:

* Opens from the account dropdown entry "Administration".
* Uses a dedicated AdminLayout with a left navigation panel.
* Does not break the existing workspace layout.
* Is visible only to org owners and org admins.

**Do not start work on dashboard builder, AI, or resource engine in this phase.**
**You are only allowed to touch the Administration entry and Admin layout/pages.**

**After you finish this, you must stop and output a summary of diffs and verification steps.**
**Do not move to later phases.**

---

## SECTION 2. EXPECTED ADMIN UX AND ROUTING

### 1. Where "Administration" lives

* In the account dropdown in header (right side).
* Text label: "Administration".
* When user clicks it:
  * Router navigates to "/admin/overview".
  * The entire main app switches into AdminLayout.
  * The left sidebar shows the Administration menu.

### 2. AdminLayout structure

* Full screen layout, independent from normal workspace sidebar.
* Left side: fixed panel, about 240–260px wide, white background.
* Top of left panel:
  * Title: "Administration"
  * Subtitle: "Organization management"
* Under that: vertical nav items:
  * Overview  → /admin/overview
  * Users     → /admin/users
  * Workspaces → /admin/workspaces
  * Audit log → /admin/audit
* Right side:
  * Header (reuse existing Header component).
  * Demo banner if present.
  * Main content area using `<Outlet/>`.

### 3. Access rules

* Only organization owner and organization admin can:
  * See "Administration" in dropdown.
  * Access any /admin route.
* Members and viewers:
  * Must not see the Administration entry.
  * If they hit /admin URLs directly, API and UI must deny access.

### 4. Command palette

* Admin commands may show only for admin / owner roles:
  * "Go to Administration overview" → /admin/overview
  * "Manage users" → /admin/users
  * "Manage workspaces" → /admin/workspaces
* No command palette entries for non-admin users to admin pages.

---

## SECTION 3. FILE AND CODE EXPECTATIONS

**Names here are based on the existing structure you have already used.**
**Adjust paths only if the real codebase differs, but stay consistent across files.**

### 1. AdminLayout component

* **File:** `src/components/layouts/AdminLayout.tsx` or `zephix-frontend/src/components/layouts/AdminLayout.tsx`
* **Responsibilities:**
  * Render a left navigation for Administration.
  * Render Header and DemoBanner on the right.
  * Render `<Outlet />` as main content.
  * Apply data-testids:
    * `data-testid="admin-nav-overview"`
    * `data-testid="admin-nav-users"`
    * `data-testid="admin-nav-workspaces"`
    * `data-testid="admin-nav-audit"`
    * `data-testid="admin-main-content"`

### 2. Routing

* **Route configuration (example, adjust to actual router file):**
  * File: `src/App.tsx` or `src/router/index.tsx` or similar.
  * Ensure there is a parent route:
    * `path: "/admin"`
    * `element: <AdminLayout />`
    * children:
      * `path: "overview"`
      * `path: "users"`
      * `path: "workspaces"`
      * `path: "audit"`
* No AdminLayout inside Settings.
* No "Admin" item in main left sidebar.

### 3. Header account dropdown

* **File:** `src/components/shell/UserProfileDropdown.tsx` or `src/components/shell/Header.tsx` or similar.
* In the account dropdown:
  * Show "Administration" entry only when `user.role` is `admin` or `owner`.
  * On click: navigate to "/admin/overview".
  * Add `data-testid="nav-admin-entry"` to this menu item.

### 4. Sidebar

* **File:** `src/components/shell/Sidebar.tsx`.
* Remove any "Admin" root item if it exists.
* Sidebar should not show "Admin" or "Administration" at root.
* Sidebar continues to show Settings; Administration is separate.

### 5. Admin pages

* Ensure at least these components exist:
  * `src/pages/admin/AdminOverviewPage.tsx` or `src/features/admin/pages/AdminOverviewPage.tsx`
  * `src/pages/admin/AdminUsersPage.tsx` or `src/features/admin/pages/AdminUsersPage.tsx`
  * `src/pages/admin/AdminWorkspacesPage.tsx` or `src/features/admin/pages/AdminWorkspacesPage.tsx`
  * `src/pages/admin/AdminAuditPage.tsx` or `src/features/admin/pages/AdminAuditPage.tsx` (can be simple stub for now)
* For Phase 1, they can render simple headings and minimal content.
  * Do not design complex tables in this phase.
  * The requirement is layout, routing, and visibility, not full features.

### 6. AdminGuard and backend

* Backend must already have an AdminGuard or equivalent.
* Update AdminGuard logic so that:
  * Org owner and org admin pass.
  * Member and viewer fail.
* All `/api/admin/*` endpoints must use:
  * `JwtAuthGuard`
  * `AdminGuard`
* Do not implement new admin APIs in this phase unless they are required to render the existing overview page or to keep type checks passing.
  * If something is missing, add a simple stub handler that returns minimal dummy data and a TODO comment.

### 7. Command palette

* **File:** `src/components/command/CommandPalette.tsx`.
* Add admin actions only for admin/owner users.
* Ensure:
  * Each action has a stable id:
    * `"admin.overview"`
    * `"admin.users"`
    * `"admin.workspaces"`
  * Each action has data-testid:
    * `data-testid="action-admin-overview"`
    * `data-testid="action-admin-users"`
    * `data-testid="action-admin-workspaces"`

---

## SECTION 4. STEP-BY-STEP EXECUTION

**You must follow these steps in order, and stop after Step 8.**

**Do not start work on Members, Viewers, methodology, AI, or dashboards in this run.**

### Step 1. Remove Admin from Sidebar

* Open Sidebar component.
* Remove any "Admin" or "Administration" item from main sidebar.
* Keep Settings as a root item.
* Ensure no route in the sidebar points to /admin.

### Step 2. Verify Administration in account dropdown

* Open Header component or UserProfileDropdown component.
* Ensure account dropdown has exactly one "Administration" menu entry.
* This entry:
  * Only renders when `user.role` is `"admin"` or `"owner"`.
  * Navigates to `"/admin/overview"` on click.
  * Has `data-testid="nav-admin-entry"`.

### Step 3. Wire /admin routes to AdminLayout

* Open router configuration.
* Ensure /admin parent route exists:
  * `element: <AdminLayout />`
  * children: `/admin/overview`, `/admin/users`, `/admin/workspaces`, `/admin/audit`.
* Do not nest /admin under Settings routes. It is its own top-level branch.

### Step 4. Implement or fix AdminLayout

* Use the AdminLayout code the user pasted as base (or create if missing).
* Make sure it:
  * Shows the left navigation with the four items.
  * Highlights the active item based on `location.pathname`.
  * Uses `<Header />`, DemoBanner, and `<Outlet />` on the right.
  * Has all data-testids set as described.

### Step 5. Minimal Admin pages

* Ensure each admin page component renders a simple shell:
  * Overview: simple summary or "Admin overview" text.
  * Users: heading "Users" and placeholder content.
  * Workspaces: heading "Workspaces" and placeholder content.
  * Audit log: heading "Audit log" and placeholder content.
* Add data-testids:
  * `data-testid="admin-overview-root"`
  * `data-testid="admin-users-root"`
  * `data-testid="admin-workspaces-root"`
  * `data-testid="admin-audit-root"`

### Step 6. AdminGuard and backend protection

* Verify AdminGuard allows owner and admin, denies others.
* Verify all `/api/admin` routes use AdminGuard.
* Add TODO comments where we will later harden organization scoping.
* Do not add new complex queries in this phase.

### Step 7. Command palette admin commands

* Add admin commands for overview, users, workspaces.
* Only show them when `user.role` is admin or owner.
* Commands must navigate to:
  * `"/admin/overview"`
  * `"/admin/users"`
  * `"/admin/workspaces"`

### Step 8. Verification

**Run these commands:**

```bash
# Frontend
cd zephix-frontend && npm run typecheck
cd zephix-frontend && npm run lint
cd zephix-frontend && npm run build

# Backend (if needed)
cd zephix-backend && npm run build
```

**Manual checks:**

1. **As admin or owner:**
   * You see "Administration" in account dropdown.
   * Clicking it sends you to `/admin/overview`.
   * You see AdminLayout: left admin menu and header on top, content on right.
   * Left panel highlights the active admin section.
   * Command palette shows admin actions.

2. **As member or viewer:**
   * You do not see "Administration" in account dropdown.
   * You cannot reach `/admin/*` pages.
   * API returns 403 for `/api/admin/*`.

**Report:**

At the end of this run you must output:

* A bullet list of files changed.
* A short description of each change.
* Confirmation of typecheck, lint, and build.
* A short manual verification summary for admin and non-admin users.

**Stop here.**
**Do not start Phase 2 until the user explicitly approves.**

---

## SECTION 5. FUTURE PHASE PLACEHOLDER

**Do not execute this now.**
**This is only a note for future prompts.**

Later phases will include:

* Phase 2: Admin Users and Admin Workspaces full UI.
* Phase 3: Workspace permissions and Workspace Settings behavior.
* Phase 4: Template Center as the only project creation path.
* Phase 5: Methodology support (Waterfall, Agile, Scrum, Kanban, Hybrid) for projects.
* Phase 6: Risk model and roll-up across tasks, projects, programs, portfolios, workspaces.
* Phase 7: Dashboards wired to risks and KPIs.
* Phase 8: AI assistance on top of that risk model.

**For this run, only execute Section 4 Steps 1–8.**

---

## END OF MASTER PROMPT

















