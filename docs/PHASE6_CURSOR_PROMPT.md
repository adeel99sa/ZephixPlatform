# PHASE 6 CURSOR PROMPT

Admin IA, navigation, and naming cleanup

----------------------------------------

## 0. CONTEXT AND HARD RULES

This project is Zephix, a multi tenant project management platform.

Phases 1 to 5 are complete:

1. Admin entry and AdminLayout
2. Admin overview, users, groups skeleton, workspaces management
3. Workspace settings and permissions model
4. Template Center as the single project creation path
5. Template Builder with risk and KPI presets

Admin routes exist under /admin/* with AdminLayout and AdminRoute guards.
Workspace settings live under /workspaces/:id/settings.
Template Center lives under /templates and /templates/:id.

### Hard rules for this phase:

1. Do not touch authentication, sign up, sign in, or org creation.
2. Do not change backend permission semantics. Only use existing AdminGuard, RequireOrgRole, and workspace permission guards.
3. Do not remove Template Center or Template detail behavior.
4. Do not introduce new dependencies.
5. Keep all new frontend admin work inside the existing admin layout and routes.
6. No design overhaul. Only light styling adjustments where needed for clarity.
7. Do not add new business logic in the backend except where listed in this prompt.
8. Follow existing test id patterns.

If anything is unclear, prefer a minimal placeholder component that follows the navigation structure rather than guessing complex behavior.

---

## 1. PHASE 6 GOAL

Clean up the Admin information architecture so it feels more like Monday.com, without copying all their functions.

### Goal:

1. Introduce a clear, grouped admin left navigation with better naming.
2. Wire existing pages into the new groups.
3. Add thin placeholder pages for future areas so the admin tree feels complete.
4. Keep all routes and permissions consistent with Phases 1 to 5.

After Phase 6, the Admin area should expose a full looking but MVP scoped menu, with working links for all existing features and safe placeholders for future ones.

---

## 2. TARGET ADMIN STRUCTURE AND NAMING

Replace the current flat admin nav with this grouped structure.

**Top level label:** "Administration"

### Section A: Organization

**A1) Organization profile**
- Route: `/admin/organization/profile`
- Purpose: org name, URL, data region

**A2) Directory**
- Route: `/admin/organization/directory`
- Purpose: users and groups entry point, links into Users and Groups

**A3) Notifications (placeholder)**
- Route: `/admin/organization/notifications`
- Purpose: basic description and TODO

### Section B: People and access

**B1) Users**
- Route: `/admin/users`
- Existing page, reuse UsersListPage

**B2) Groups**
- Route: `/admin/groups`
- Existing page, reuse GroupsListPage

**B3) Roles and permissions**
- Route: `/admin/permissions`
- Purpose: show global roles (Owner, Admin, Member, Viewer) and a read only matrix explaining capabilities. Placeholder view, no editing yet.

### Section C: Workspaces

**C1) Workspaces**
- Route: `/admin/workspaces`
- Existing page, reuse WorkspacesListPage

**C2) Workspace defaults (placeholder)**
- Route: `/admin/workspaces/defaults`
- Purpose: explain how workspace permissions and methodologies work, no editing yet.

### Section D: Templates and AI

**D1) Template Center**
- Route: `/admin/templates`
- Purpose: admin level entry that links to `/templates`
- This page can be a light wrapper that explains Template Center and provides a "Open Template Center" button.

**D2) AI settings (placeholder)**
- Route: `/admin/ai`
- Purpose: show a single toggle style UI that explains AI usage is managed later.

### Section E: Security and compliance

**E1) Authentication (placeholder)**
- Route: `/admin/security/authentication`
- Purpose: describe current auth model and show TODOs.

**E2) Audit log**
- Route: `/admin/audit`
- Existing or placeholder page for audit events.

**E3) Compliance (placeholder)**
- Route: `/admin/security/compliance`
- Purpose: show data region and SOC2 style checklist, read only for now.

### Section F: Billing and usage

**F1) Billing overview (placeholder)**
- Route: `/admin/billing`
- Purpose: show plan name, seats used, and a "Contact sales" button. Data can be static for now.

**F2) Usage stats (placeholder)**
- Route: `/admin/usage`
- Purpose: simple counters for users, workspaces, projects using existing summary endpoints.

This IA is the source of truth for naming and routes in this phase.

---

## 3. BACKEND REQUIREMENTS

Backend work for Phase 6 stays minimal.

### Requirements:

1. Do not add new entities or migrations.
2. Reuse existing organization summary, users summary, and workspaces summary endpoints where helpful.
3. If a placeholder page needs backend data that does not exist, show stub data in the frontend instead.
4. Ensure existing admin endpoints remain protected by JwtAuthGuard and AdminGuard.
5. Confirm that no new admin routes bypass existing guards.

If a new endpoint feels required, leave a clear TODO in the controller and do not implement it in this phase.

---

## 4. FRONTEND REQUIREMENTS

### 4.1 Navigation and layout

1. Update AdminLayout to support grouped navigation.
   Use a small config structure like:
   - Section key
   - Section label
   - Items: label, route, icon, test id

2. All admin nav items should have test ids in the form:
   - `admin-nav-organization-profile`
   - `admin-nav-organization-directory`
   - `admin-nav-organization-notifications`
   - `admin-nav-users`
   - `admin-nav-groups`
   - `admin-nav-permissions`
   - `admin-nav-workspaces`
   - `admin-nav-workspaces-defaults`
   - `admin-nav-templates`
   - `admin-nav-ai`
   - `admin-nav-security-authentication`
   - `admin-nav-security-compliance`
   - `admin-nav-audit`
   - `admin-nav-billing`
   - `admin-nav-usage`

3. AdminLayout should render section labels with subtle styling and items under each label.

4. Keep the existing AdminRoute protection for all `/admin/*` routes.

### 4.2 Page components

Create or reuse page components under `features/admin/*` so the structure stays consistent.

#### Required pages:

1. **Organization profile page**
   - Path: `features/admin/organization/OrganizationProfilePage.tsx`
   - Uses existing org summary endpoint if available. Otherwise shows static org name "Organization" and URL from current org.
   - Test id: `admin-org-profile-root`

2. **Directory page**
   - Path: `features/admin/organization/DirectoryPage.tsx`
   - Contains two simple cards or links: "Manage users" and "Manage groups" that route to `/admin/users` and `/admin/groups`.
   - Test id: `admin-directory-root`

3. **Notifications page (placeholder)**
   - Path: `features/admin/organization/NotificationsPage.tsx`
   - Shows description text and a TODO.
   - Test id: `admin-notifications-root`

4. **Roles and permissions page**
   - Path: `features/admin/permissions/RolesPermissionsPage.tsx`
   - Shows a static matrix of roles (Owner, Admin, Member, Viewer) and capabilities such as: manage users, manage workspaces, create projects, view templates, manage templates.
   - Reads from existing role definitions but does not edit anything.
   - Test id: `admin-roles-permissions-root`

5. **Workspace defaults page (placeholder)**
   - Path: `features/admin/workspaces/WorkspaceDefaultsPage.tsx`
   - Explains in text how workspace roles and the workspace permission matrix work.
   - Test id: `admin-workspace-defaults-root`

6. **Template Center admin wrapper page**
   - Path: `features/admin/templates/AdminTemplatesPage.tsx`
   - Displays a short explanation and a primary button "Open Template Center" that navigates to `/templates`.
   - Test id: `admin-templates-root`

7. **AI settings page (placeholder)**
   - Path: `features/admin/ai/AiSettingsPage.tsx`
   - Shows a single "AI features" toggle UI bound to local state only, with a note that this is a placeholder.
   - Test id: `admin-ai-settings-root`

8. **Authentication settings page (placeholder)**
   - Path: `features/admin/security/AuthenticationSettingsPage.tsx`
   - Describes current auth model: email, password, JWT, 2FA planned. No real settings yet.
   - Test id: `admin-security-auth-root`

9. **Compliance page (placeholder)**
   - Path: `features/admin/security/CompliancePage.tsx`
   - Shows data region and a checklist style view of compliance goals such as SOC2 readiness.
   - Test id: `admin-security-compliance-root`

10. **Billing overview page (placeholder)**
    - Path: `features/admin/billing/BillingOverviewPage.tsx`
    - Shows plan name "Starter", seats used as 0, and a "Contact sales" or "Upgrade" button that is non functional.
    - Test id: `admin-billing-root`

11. **Usage stats page**
    - Path: `features/admin/usage/UsageStatsPage.tsx`
    - Uses existing organization summary endpoints where possible to show counts for users, workspaces, projects. If project count is not available, show TODO.
    - Test id: `admin-usage-root`

### 4.3 Routing

Update `App.tsx` (or the main router) so that:

1. All new routes under `/admin/*` use AdminLayout and AdminRoute.
2. Existing admin routes for overview, users, groups, workspaces, audit keep working.
3. The "Administration" entry from the top level still lands on `/admin/overview`.
4. New routes match the paths defined in Section 2.

### 4.4 Icons

Reuse existing Lucide or icon set already used in AdminLayout.

Map icons roughly as:

- Organization profile and Directory: `Building`
- Notifications: `Bell`
- Users: `User`
- Groups: `Users`
- Roles and permissions: `Shield`
- Workspaces: `LayoutGrid`
- Workspace defaults: `Sliders`
- Template Center: `FileStack` or similar
- AI settings: `Sparkles` or similar
- Authentication: `Lock`
- Compliance: `BadgeCheck`
- Audit: `FileText` or `History`
- Billing: `CreditCard`
- Usage stats: `BarChart`

If a requested icon does not exist in the current icon set, pick the closest existing one.

### 4.5 Test ids

Each page root should have a single test id on the outermost container as listed above.

Navigation entries must use the `admin-nav-*` test ids listed in 4.1.

Do not remove existing test ids on previously implemented pages.

---

## 5. STEP BY STEP EXECUTION PLAN

Follow these steps in order, without skipping.

### Step 1. Inventory and cleanup

1. Inspect AdminLayout and current admin nav configuration.
2. List existing admin nav items and note which components they load.
3. Do not refactor yet. Only collect information.

### Step 2. Introduce a typed nav config model

1. Create a small TypeScript type for admin nav sections and items.
2. Move hard coded nav items into a single config constant.
3. Add test ids into the nav config values.

### Step 3. Replace nav rendering with grouped rendering

1. Update AdminLayout to render sections and items from the config.
2. Keep styling consistent with current layout.
3. Verify existing items like Overview, Users, Workspaces still navigate correctly.

### Step 4. Align existing routes with new structure

1. Ensure `/admin/users`, `/admin/groups`, `/admin/workspaces`, `/admin/audit` still work.
2. Update labels in the nav to match the new naming from Section 2.
3. Add new nav entries for upcoming pages, wired to placeholder components if the page does not exist yet.

### Step 5. Create new admin pages

1. Create all new page components listed in 4.2 with minimal but correct content and test ids.
2. Each page should have a clear heading and short explanatory text.
3. No complex logic. Use static or stubbed data where needed.

### Step 6. Wire new routes

1. Add routes for all new pages under the `/admin` path.
2. Wrap them with AdminRoute and AdminLayout.
3. Confirm that direct navigation by URL works for each new route.

### Step 7. Light content enhancements

1. For Organization profile and Usage stats, use existing backend summary APIs if integration is straightforward.
2. If data is not easily available, use static explanatory content and leave a TODO.

### Step 8. Verification

1. Run frontend typecheck and build.
2. Confirm that all admin nav links render and route correctly.
3. Confirm that all test ids exist and are unique.
4. Confirm that AdminRoute still blocks member and viewer roles.
5. Update or create `docs/PHASE6_IMPLEMENTATION_REPORT.md` summarizing work.

---

## 6. EXCLUDED WORK

The following items are explicitly out of scope for Phase 6.

1. No changes to project views, boards, dashboards, or analytics.
2. No implementation of advanced directory features such as departments, SSO, SCIM.
3. No real billing integration, payments, or invoices retrieval. Placeholders only.
4. No AI prompt or model configuration. Only a simple placeholder settings page.
5. No new backend security features such as 2FA, IP allowlists, or password policy.
6. No modification of Template Center logic. Only an admin level wrapper page that links into the existing Template Center routes.
7. No redesign of the overall application shell.

If an excluded item is required to make a page feel complete, surface it as a TODO in comments and keep the implementation minimal.

---

## 7. PHASE TRACKER

**Current phase:** 6
**Phase name:** Admin IA, navigation, and naming cleanup

### Entry state:

- Phase 1: Admin entry and layout – complete
- Phase 2: Admin overview, users, groups skeleton, workspaces management – complete
- Phase 3: Workspace permissions and settings – complete
- Phase 4: Template Center and project creation from templates – complete
- Phase 5: Template Builder risk and KPI presets – complete

### Exit criteria for Phase 6:

1. AdminLayout uses grouped nav configuration that matches Section 2.
2. All new admin routes exist and render a page with the correct heading and test id.
3. Existing admin features remain reachable and function as before.
4. Navigation works for admin users and is blocked for non admin roles.
5. `docs/PHASE6_IMPLEMENTATION_REPORT.md` created with a summary of changes and any TODOs.

When these five exit criteria are true, Phase 6 is complete.

















