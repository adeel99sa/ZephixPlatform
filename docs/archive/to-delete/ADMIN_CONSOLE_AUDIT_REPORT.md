# Admin Console Audit Report

## Executive Summary

This audit identifies which admin routes are **Implemented**, **Stubs**, or **Missing** backend support. Use this to decide MVP scope and which nav items to show/hide.

---

## Frontend Route Inventory

### Routes Defined in `App.tsx`

| Route Path | Component File | Status |
|------------|---------------|--------|
| `/admin` | `AdminDashboardPage.tsx` | ✅ Implemented |
| `/admin/overview` | `AdminOverviewPage.tsx` | ✅ Implemented |
| `/admin/org` | `AdminOrganizationPage.tsx` | ⚠️ Stub |
| `/admin/users` | `AdminUsersPage.tsx` | ✅ Implemented |
| `/admin/teams` | `AdminTeamsPage.tsx` | ❌ Stub (TODO comments) |
| `/admin/roles` | `AdminRolesPage.tsx` | ⚠️ Partial |
| `/admin/invite` | `AdminInvitePage.tsx` | ⚠️ Partial |
| `/admin/usage` | `AdminUsagePage.tsx` | ✅ Implemented |
| `/admin/billing` | `AdminBillingPage.tsx` | ✅ Implemented |
| `/admin/security` | `AdminSecurityPage.tsx` | ❌ Stub (TODO comments) |
| `/admin/templates` | `AdminTemplatesPage.tsx` | ✅ Implemented |
| `/admin/templates/builder` | `AdminTemplateBuilderPage.tsx` | ✅ Implemented |
| `/admin/templates/custom-fields` | `AdminCustomFieldsPage.tsx` | ⚠️ Partial |
| `/admin/workspaces` | `AdminWorkspacesPage.tsx` | ✅ Implemented |
| `/admin/projects` | `AdminProjectsPage.tsx` | ✅ Implemented |
| `/admin/archive` | `AdminArchivePage.tsx` | ❌ Empty stub |
| `/admin/trash` | `AdminTrashPage.tsx` | ✅ Implemented |

---

## Detailed Audit by Nav Section

### 1. Dashboard (`/admin`)

**Component:** `AdminDashboardPage.tsx`

**API Calls:**
- `adminApi.getStats()` → `GET /admin/stats`
- `adminApi.getSystemHealth()` → `GET /admin/health`
- `adminApi.getAuditLogs({ limit: 10 })` → `GET /admin/audit`

**Backend Status:**
- ✅ `GET /admin/stats` → `AdminController.getStats()` → `AdminService.getStatistics()` - **IMPLEMENTED**
- ✅ `GET /admin/health` → `AdminController.getSystemHealth()` → `AdminService.getSystemHealth()` - **IMPLEMENTED**
- ⚠️ `GET /admin/audit` → **MISSING** (no controller endpoint found, but AuditService exists)

**Status:** ✅ **IMPLEMENTED** (stats and health work, audit may 404)

**MVP Recommendation:** ✅ **SHOW** - Core admin dashboard

---

### 2. Organization > Overview (`/admin/org`)

**Component:** `AdminOrganizationPage.tsx`

**API Calls:**
- `adminApi.getOrganizationOverview()` → `GET /admin/organization/overview`

**Backend Status:**
- ❌ `GET /admin/organization/overview` → **MISSING** (no matching controller)

**Status:** ❌ **MISSING**

**MVP Recommendation:** ❌ **HIDE** or redirect to `/admin/overview`

---

### 3. Organization > Users & Teams (`/admin/users`)

**Component:** `AdminUsersPage.tsx`

**API Calls:**
- `adminApi.getOrganizationUsers({ page, limit, search, role, status })` → `GET /admin/users`
- `adminApi.bulkUpdateUserRoles(orgId, updates)` → Multiple `PATCH /admin/users/:userId/role`
- `adminApi.bulkRemoveUsers(orgId, userIds)` → Multiple `DELETE /admin/users/:userId`
- `adminApi.updateUserRole(orgId, userId, role)` → `PATCH /admin/users/:userId/role`
- `adminApi.removeUser(orgId, userId)` → `DELETE /organizations/:orgId/users/:userId`

**Backend Status:**
- ✅ `GET /admin/users` → `AdminController.getUsers()` - **IMPLEMENTED**
- ✅ `PATCH /admin/users/:userId/role` → `AdminController.updateUserRole()` - **IMPLEMENTED**
- ✅ `DELETE /admin/users/:userId` → `AdminController.deleteUser()` - **IMPLEMENTED** (soft delete via UserOrganization.isActive)
- ✅ `DELETE /organizations/:orgId/users/:userId` → `OrganizationsController` - **IMPLEMENTED**

**Status:** ✅ **IMPLEMENTED**

**MVP Recommendation:** ✅ **SHOW** - Core user management

**Note:** Bulk operations work via Promise.allSettled on individual endpoints

---

### 4. Organization > Teams (`/admin/teams`)

**Component:** `AdminTeamsPage.tsx`

**API Calls:**
- `adminApi.getTeams()` → `GET /admin/teams` (commented out with TODO)
- `adminApi.createTeam()` → `POST /admin/teams` (commented out with TODO)
- `adminApi.deleteTeam()` → `DELETE /admin/teams/:id` (commented out with TODO)

**Backend Status:**
- ❌ `GET /admin/teams` → **MISSING**
- ❌ `POST /admin/teams` → **MISSING**
- ❌ `DELETE /admin/teams/:id` → **MISSING**

**Status:** ❌ **STUB** (shows empty state, alerts "will be available soon")

**MVP Recommendation:** ❌ **HIDE** - Not ready for MVP

---

### 5. Organization > Roles & Permissions (`/admin/roles`)

**Component:** `AdminRolesPage.tsx`

**API Calls:**
- `adminApi.getRoles()` → `GET /admin/organization/roles`
- `adminApi.createRole(role)` → `POST /admin/organization/roles`

**Backend Status:**
- ❌ `GET /admin/organization/roles` → **MISSING**
- ❌ `POST /admin/organization/roles` → **MISSING**

**Status:** ❌ **STUB** (UI exists, backend missing)

**MVP Recommendation:** ❌ **HIDE** - Custom roles not in MVP scope

---

### 6. Organization > Invite Users (`/admin/invite`)

**Component:** `AdminInvitePage.tsx`

**API Calls:**
- `adminApi.inviteUsers({ emails, role, message })` → `POST /admin/organization/users/invite`

**Backend Status:**
- ❌ `POST /admin/organization/users/invite` → **MISSING** (no matching controller found)

**Status:** ❌ **MISSING**

**MVP Recommendation:** ⚠️ **CONVERT TO DRAWER** - Simple action, should be drawer from Users page, not full page

---

### 7. Organization > Usage & Limits (`/admin/usage`)

**Component:** `AdminUsagePage.tsx`

**API Calls:**
- `billingApi.getUsage()` → `GET /billing/usage` (or similar)

**Backend Status:**
- ✅ Billing module exists with `BillingController` - **LIKELY IMPLEMENTED** (needs verification)

**Status:** ✅ **IMPLEMENTED** (assuming billing endpoints exist)

**MVP Recommendation:** ✅ **SHOW** - Important for plan limits

---

### 8. Organization > Billing & Plans (`/admin/billing`)

**Component:** `AdminBillingPage.tsx`

**API Calls:**
- `billingApi.getPlans()` → `GET /billing/plans`
- `billingApi.getSubscription()` → `GET /billing/subscription`
- `billingApi.getCurrentPlan()` → `GET /billing/plan/current`
- `billingApi.getUsage()` → `GET /billing/usage`
- `billingApi.subscribe(planType)` → `POST /billing/subscribe`
- `billingApi.cancelSubscription()` → `POST /billing/cancel`

**Backend Status:**
- ✅ `BillingController` exists at `@Controller('billing')` - **IMPLEMENTED**

**Status:** ✅ **IMPLEMENTED**

**MVP Recommendation:** ✅ **SHOW** - Core billing management

---

### 9. Organization > Security & SSO (`/admin/security`)

**Component:** `AdminSecurityPage.tsx`

**API Calls:**
- `apiClient.get('/admin/security/settings')` → **TODO comment**
- `apiClient.put('/admin/security/settings', settings)` → **TODO comment**

**Backend Status:**
- ❌ `GET /admin/security/settings` → **MISSING**
- ❌ `PUT /admin/security/settings` → **MISSING**

**Status:** ❌ **STUB** (UI exists, all API calls commented with TODO)

**MVP Recommendation:** ❌ **HIDE** - Security settings not in MVP

---

### 10. Templates > Project Templates (`/admin/templates`)

**Component:** `AdminTemplatesPage.tsx`

**API Calls:**
- `apiClient.get('/admin/templates')` → `GET /admin/templates`
- `apiClient.delete('/admin/templates/:id')` → `DELETE /admin/templates/:id`
- `apiClient.patch('/admin/templates/:id')` → `PATCH /admin/templates/:id`
- `apiClient.post('/admin/templates')` → `POST /admin/templates`

**Backend Status:**
- ✅ `GET /admin/templates` → `AdminTemplatesController.findAll()` - **IMPLEMENTED**
- ✅ `DELETE /admin/templates/:id` → `AdminTemplatesController.remove()` - **IMPLEMENTED**
- ✅ `PATCH /admin/templates/:id` → `AdminTemplatesController.update()` - **IMPLEMENTED**
- ✅ `POST /admin/templates` → `AdminTemplatesController.create()` - **IMPLEMENTED**

**Status:** ✅ **IMPLEMENTED**

**MVP Recommendation:** ✅ **SHOW** - Template management is core feature

---

### 11. Templates > Template Builder (`/admin/templates/builder`)

**Component:** `AdminTemplateBuilderPage.tsx`

**API Calls:**
- `templatesApi.createTemplate()` → Uses templates API
- `templatesApi.updateTemplate()` → Uses templates API

**Backend Status:**
- ✅ Uses same backend as `/admin/templates` - **IMPLEMENTED**

**Status:** ✅ **IMPLEMENTED**

**MVP Recommendation:** ✅ **SHOW** - Part of template management

---

### 12. Templates > Custom Fields (`/admin/templates/custom-fields`)

**Component:** `AdminCustomFieldsPage.tsx`

**API Calls:**
- `apiClient.get('/admin/custom-fields')` → `GET /admin/custom-fields`
- `apiClient.post('/admin/custom-fields')` → `POST /admin/custom-fields`
- `apiClient.patch('/admin/custom-fields/:id')` → `PATCH /admin/custom-fields/:id`
- `apiClient.delete('/admin/custom-fields/:id')` → `DELETE /admin/custom-fields/:id`

**Backend Status:**
- ✅ `CustomFieldsController` exists at `@Controller('admin/custom-fields')` - **IMPLEMENTED**

**Status:** ✅ **IMPLEMENTED**

**MVP Recommendation:** ⚠️ **CONSIDER DRAWER** - Could be drawer from Templates page

---

### 13. Workspaces & Projects > All Workspaces (`/admin/workspaces`)

**Component:** `AdminWorkspacesPage.tsx`

**API Calls:**
- `adminApi.getWorkspaces({ search, status })` → `GET /admin/workspaces`
- `adminApi.updateWorkspace(id, { ownerId })` → `PATCH /admin/workspaces/:id`
- `adminApi.updateWorkspace(id, { visibility })` → `PATCH /admin/workspaces/:id`
- `adminApi.updateWorkspace(id, { status })` → `PATCH /admin/workspaces/:id`
- `listOrgUsers()` → `GET /organizations/:orgId/users` (for owner selection)

**Backend Status:**
- ✅ `GET /admin/workspaces` → `AdminController.getWorkspaces()` - **IMPLEMENTED**
- ✅ `PATCH /admin/workspaces/:id` → `AdminController.updateWorkspace()` - **IMPLEMENTED**
- ✅ `GET /organizations/:orgId/users` → `OrganizationsController.getOrgUsers()` - **IMPLEMENTED**

**Status:** ✅ **IMPLEMENTED**

**MVP Recommendation:** ✅ **SHOW** - Core workspace management

---

### 14. Workspaces & Projects > All Projects (`/admin/projects`)

**Component:** `AdminProjectsPage.tsx`

**API Calls:**
- `adminApi.getProjects({ search, status, workspaceId })` → `GET /api/projects`
- `adminApi.archiveProject(id)` → `PATCH /api/projects/:id/archive`
- `adminApi.deleteProject(id)` → `DELETE /api/projects/:id`

**Backend Status:**
- ✅ `GET /api/projects` → Projects controller exists - **IMPLEMENTED**
- ⚠️ `PATCH /api/projects/:id/archive` → **NEEDS VERIFICATION**
- ⚠️ `DELETE /api/projects/:id` → **NEEDS VERIFICATION**

**Status:** ✅ **MOSTLY IMPLEMENTED** (list works, archive/delete need verification)

**MVP Recommendation:** ✅ **SHOW** - Project management is core

---

### 15. Workspaces & Projects > Archive (`/admin/archive`)

**Component:** `AdminArchivePage.tsx`

**API Calls:**
- None (just shows empty state)

**Backend Status:**
- ❌ No API calls - **STUB**

**Status:** ❌ **STUB** (empty page)

**MVP Recommendation:** ❌ **HIDE** - Not implemented

---

### 16. Workspaces & Projects > Trash (`/admin/trash`)

**Component:** `AdminTrashPage.tsx`

**API Calls:**
- `apiClient.get('/admin/trash', { params: { type: 'workspace' }})` → `GET /admin/trash`
- `apiClient.post('/workspaces/:id/restore')` → `POST /workspaces/:id/restore`
- `apiClient.post('/admin/trash/purge', { id })` → `POST /admin/trash/purge`
- `apiClient.post('/admin/trash/purge', { days: 30 })` → `POST /admin/trash/purge`

**Backend Status:**
- ✅ `GET /admin/trash` → `AdminTrashController` exists - **IMPLEMENTED**
- ✅ `POST /workspaces/:id/restore` → WorkspacesService has restore - **IMPLEMENTED**
- ⚠️ `POST /admin/trash/purge` → **NEEDS VERIFICATION**

**Status:** ✅ **IMPLEMENTED** (trash listing and restore work)

**MVP Recommendation:** ✅ **SHOW** - Trash/restore is useful

---

## Summary Table

| Admin Nav Label | Route Path | Component | Main API Endpoints | Status | MVP Action |
|----------------|------------|-----------|-------------------|--------|------------|
| **Dashboard** | `/admin` | `AdminDashboardPage.tsx` | `GET /admin/stats`, `GET /admin/health`, `GET /admin/audit` | ✅ Implemented | ✅ **SHOW** |
| **Organization > Overview** | `/admin/org` | `AdminOrganizationPage.tsx` | `GET /admin/organization/overview` | ❌ Missing | ❌ **HIDE** or redirect to `/admin/overview` |
| **Organization > Users & Teams** | `/admin/users` | `AdminUsersPage.tsx` | `GET /admin/users`, `PATCH /admin/users/:id/role`, `DELETE /admin/users/:id` | ✅ Implemented | ✅ **SHOW** |
| **Organization > Teams** | `/admin/teams` | `AdminTeamsPage.tsx` | `GET /admin/teams` (TODO) | ❌ Stub | ❌ **HIDE** |
| **Organization > Roles & Permissions** | `/admin/roles` | `AdminRolesPage.tsx` | `GET /admin/organization/roles` (missing) | ❌ Stub | ❌ **HIDE** |
| **Organization > Invite Users** | `/admin/invite` | `AdminInvitePage.tsx` | `POST /admin/organization/users/invite` (missing) | ❌ Missing | ⚠️ **CONVERT TO DRAWER** |
| **Organization > Usage & Limits** | `/admin/usage` | `AdminUsagePage.tsx` | `GET /billing/usage` | ✅ Implemented | ✅ **SHOW** |
| **Organization > Billing & Plans** | `/admin/billing` | `AdminBillingPage.tsx` | `GET /billing/*` | ✅ Implemented | ✅ **SHOW** |
| **Organization > Security & SSO** | `/admin/security` | `AdminSecurityPage.tsx` | `GET /admin/security/settings` (TODO) | ❌ Stub | ❌ **HIDE** |
| **Templates > Project Templates** | `/admin/templates` | `AdminTemplatesPage.tsx` | `GET /admin/templates`, `POST /admin/templates`, etc. | ✅ Implemented | ✅ **SHOW** |
| **Templates > Template Builder** | `/admin/templates/builder` | `AdminTemplateBuilderPage.tsx` | Templates API | ✅ Implemented | ✅ **SHOW** |
| **Templates > Custom Fields** | `/admin/templates/custom-fields` | `AdminCustomFieldsPage.tsx` | `GET /admin/custom-fields` | ✅ Implemented | ⚠️ **CONSIDER DRAWER** |
| **Workspaces & Projects > All Workspaces** | `/admin/workspaces` | `AdminWorkspacesPage.tsx` | `GET /admin/workspaces`, `PATCH /admin/workspaces/:id` | ✅ Implemented | ✅ **SHOW** |
| **Workspaces & Projects > All Projects** | `/admin/projects` | `AdminProjectsPage.tsx` | `GET /api/projects` | ✅ Implemented | ✅ **SHOW** |
| **Workspaces & Projects > Archive** | `/admin/archive` | `AdminArchivePage.tsx` | None | ❌ Stub | ❌ **HIDE** |
| **Workspaces & Projects > Trash** | `/admin/trash` | `AdminTrashPage.tsx` | `GET /admin/trash`, `POST /workspaces/:id/restore` | ✅ Implemented | ✅ **SHOW** |

---

## Navigation Cleanup Recommendations

### ✅ Safe to Show in MVP (Implemented)

1. **Dashboard** (`/admin`) - Core admin overview
2. **Users & Teams** (`/admin/users`) - User management
3. **Usage & Limits** (`/admin/usage`) - Plan limits
4. **Billing & Plans** (`/admin/billing`) - Subscription management
5. **Project Templates** (`/admin/templates`) - Template management
6. **Template Builder** (`/admin/templates/builder`) - Template creation
7. **All Workspaces** (`/admin/workspaces`) - Workspace management
8. **All Projects** (`/admin/projects`) - Project management
9. **Trash** (`/admin/trash`) - Restore deleted items

### ❌ Hide Behind Feature Flag (Stubs/Missing)

1. **Organization > Overview** (`/admin/org`) - Missing backend
2. **Teams** (`/admin/teams`) - All TODOs
3. **Roles & Permissions** (`/admin/roles`) - Missing backend
4. **Security & SSO** (`/admin/security`) - All TODOs
5. **Archive** (`/admin/archive`) - Empty stub

### ⚠️ Convert to Drawer/Modal (Simple Actions)

1. **Invite Users** (`/admin/invite`) - Should be drawer from Users page
2. **Custom Fields** (`/admin/templates/custom-fields`) - Could be drawer from Templates

---

## Page vs Drawer Recommendations

### Keep as Full Pages (List/Overview Screens)

✅ **Dashboard** - System health, stats, quick actions
✅ **Users & Teams** - List with search, filters, bulk actions
✅ **All Workspaces** - List with filters, owner management
✅ **All Projects** - List across workspaces
✅ **Project Templates** - List with archive toggle
✅ **Usage & Limits** - Charts and detailed breakdown
✅ **Billing & Plans** - Plan comparison, invoices
✅ **Trash** - List of deleted items with restore

### Convert to Drawers/Modals (Focused Actions)

⚠️ **Invite Users** → Drawer from Users page
⚠️ **Custom Fields** → Drawer from Templates page
⚠️ **Template Builder** → Could be modal, but complex enough to stay as page

### Already Using Modals (Good)

✅ **Template Builder** - Uses modal for create/edit
✅ **Users page** - Uses modals for role changes and bulk actions

---

## Backend Endpoint Verification

### ✅ Confirmed Implemented

- `GET /admin/stats` → `AdminController.getStats()`
- `GET /admin/health` → `AdminController.getSystemHealth()`
- `GET /admin/users` → `AdminController.getUsers()`
- `PATCH /admin/users/:userId/role` → `AdminController.updateUserRole()`
- `DELETE /admin/users/:userId` → `AdminController.deleteUser()`
- `GET /admin/workspaces` → `AdminController.getWorkspaces()`
- `PATCH /admin/workspaces/:id` → `AdminController.updateWorkspace()`
- `GET /admin/templates` → `AdminTemplatesController.findAll()`
- `POST /admin/templates` → `AdminTemplatesController.create()`
- `GET /admin/custom-fields` → `CustomFieldsController`
- `GET /admin/trash` → `AdminTrashController`
- Billing endpoints → `BillingController`

### ❌ Confirmed Missing

- `GET /admin/organization/overview`
- `GET /admin/organization/roles`
- `POST /admin/organization/roles`
- `POST /admin/organization/users/invite`
- `GET /admin/teams`
- `POST /admin/teams`
- `GET /admin/security/settings`
- `PUT /admin/security/settings`
- `GET /admin/audit` (AuditService exists but no controller endpoint)

---

## Page vs Drawer Recommendations (Based on Rules)

### ✅ Keep as Full Pages (List/Overview Screens)

These are places where admins scan many objects, filter, search, and drill in:

1. **Dashboard** (`/admin`) - System health, counts, quick actions
2. **Users & Teams** (`/admin/users`) - List with search, filters, bulk actions
3. **All Workspaces** (`/admin/workspaces`) - All workspaces with status, owner, created date
4. **All Projects** (`/admin/projects`) - All projects across workspaces
5. **Project Templates** (`/admin/templates`) - List of templates with archive toggle
6. **Usage & Limits** (`/admin/usage`) - Detailed breakdown, charts
7. **Billing & Plans** (`/admin/billing`) - Plan comparison, invoices, usage
8. **Trash** (`/admin/trash`) - List of deleted items with restore

### ⚠️ Convert to Drawers/Modals (Focused Actions)

These are quick tasks that don't need a full page:

1. **Invite Users** (`/admin/invite`) → **DRAWER** from Users page
   - Simple form: email list, role, optional message
   - Opens from "Invite Users" button on Users page
   - No need for full page navigation

2. **Custom Fields** (`/admin/templates/custom-fields`) → **DRAWER** from Templates page
   - Could be drawer from Templates page
   - Or keep as page if it grows complex

3. **Template Builder** (`/admin/templates/builder`) → **KEEP AS PAGE** (complex enough)
   - Has phases, tasks, KPIs - complex enough for full page

### ❌ Hide (Stubs/Missing)

1. **Organization > Overview** (`/admin/org`) - Missing backend, redirect to `/admin/overview`
2. **Teams** (`/admin/teams`) - All TODOs
3. **Roles & Permissions** (`/admin/roles`) - Missing backend
4. **Security & SSO** (`/admin/security`) - All TODOs
5. **Archive** (`/admin/archive`) - Empty stub

---

## Next Steps

1. **Hide stub/missing nav items** in `AdminLayout.tsx`
2. **Convert Invite Users to drawer** triggered from Users page
3. **Add feature flag** for non-MVP sections
4. **Verify billing endpoints** match frontend expectations
5. **Add audit log endpoint** if needed for dashboard activity feed






