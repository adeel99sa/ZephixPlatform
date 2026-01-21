# Zephix Platform Scope Map

**Last Updated:** 2025-01-27  
**Purpose:** Single source of truth for platform scope, completion status, and done definitions

## Platform Areas

### 1. Tenancy and Identity

**User Outcomes:**
- Users can sign up, log in, and maintain secure sessions
- Multi-tenant isolation enforced at all layers
- Role-based access control (ADMIN, MEMBER, VIEWER) works correctly

**Must-Have Screens:**
- `/login` - Login page
- `/signup` - Signup page
- `/verify-email` - Email verification
- `/home` - Universal home for all roles (✅ DONE)

**Must-Have APIs:**
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`

**Must-Have Entities:**
- `User`
- `UserOrganization`
- `Organization`

**Done Definition:**
- ✅ Single home URL `/home` stable for all roles
- ✅ JWT auth with refresh tokens
- ✅ Tenant context service enforces orgId
- ✅ Role normalization and guards work

---

### 2. Workspaces and Membership

**User Outcomes:**
- Users can create, list, and switch workspaces
- Workspace membership controls access
- Workspace directory dropdown in sidebar (✅ DONE)

**Must-Have Screens:**
- Workspace dropdown in sidebar (✅ DONE)
- `/workspaces` - Workspace directory
- `/workspaces/:id/members` - Member management
- Workspace creation modal (✅ DONE)

**Must-Have APIs:**
- `GET /api/workspaces` - List workspaces (✅ DONE - tenant safe)
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id/members` - List members
- `POST /api/workspaces/:id/members` - Add member
- `GET /api/admin/workspaces/maintenance/cleanup-test/candidates` - Admin cleanup (✅ DONE)

**Must-Have Entities:**
- `Workspace`
- `WorkspaceMember`
- `WorkspaceInviteLink`

**Done Definition:**
- ✅ Workspace dropdown shows only member workspaces
- ✅ Workspace list filters by orgId and deletedAt (✅ DONE)
- ✅ Single workspace persistence key: `zephix.activeWorkspaceId` (✅ DONE)
- ✅ Admin maintenance API for cleanup (✅ DONE)
- ⚠️ Workspace creation flow end-to-end
- ⚠️ Member invitation flow end-to-end

---

### 3. Navigation and Shell

**User Outcomes:**
- Consistent navigation across all pages
- Workspace context visible and switchable
- Clear separation between org-level and workspace-level features

**Must-Have Screens:**
- Sidebar with workspace switcher (✅ DONE)
- Header with user menu
- DashboardLayout wrapper (✅ DONE)
- AdminLayout wrapper

**Must-Have APIs:**
- None (UI-only)

**Must-Have Entities:**
- None

**Done Definition:**
- ✅ Monday-style sidebar navigation (✅ DONE)
- ✅ Workspace switcher in sidebar (✅ DONE)
- ✅ Single API client with header injection (✅ DONE)
- ✅ No hard refresh navigation (✅ DONE)
- ⚠️ Page vs modal vs drawer rules documented and enforced

---

### 4. Projects

**User Outcomes:**
- Users can create, view, and manage projects
- Projects are workspace-scoped
- Project overview shows key metrics

**Must-Have Screens:**
- `/projects` - Projects list (⚠️ Placeholder exists)
- `/projects/:projectId` - Project overview
- `/work/projects/:projectId/plan` - Project plan view

**Must-Have APIs:**
- `GET /api/projects` - List projects (workspace-scoped)
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project

**Must-Have Entities:**
- `Project`
- `ProjectPhase` (if applicable)

**Done Definition:**
- ⚠️ Projects list page functional
- ⚠️ Project creation flow end-to-end
- ⚠️ Project overview shows real data
- ⚠️ Projects filtered by workspace

---

### 5. Work Management

**User Outcomes:**
- Users can create tasks/phases within projects
- Task assignment and tracking works
- My Work view shows assigned items

**Must-Have Screens:**
- `/my-work` - My Work page (exists)
- `/work/projects/:projectId/plan` - Project plan
- Task creation modal/drawer

**Must-Have APIs:**
- `GET /api/work-items` - List work items
- `POST /api/work-items` - Create work item
- `GET /api/my-work` - Get user's work items
- `PATCH /api/work-items/:id` - Update work item

**Must-Have Entities:**
- `WorkItem`
- `WorkItemActivity`
- `WorkTask`

**Done Definition:**
- ⚠️ Task creation flow end-to-end
- ⚠️ Task assignment works
- ⚠️ My Work page shows real data
- ⚠️ Work items filtered by workspace

---

### 6. Resources

**User Outcomes:**
- Users can view resource allocations
- Resource heatmap shows capacity
- Resource timeline shows assignments

**Must-Have Screens:**
- `/resources` - Resources list
- `/resources/:id/timeline` - Resource timeline
- `/workspaces/:id/heatmap` - Resource heatmap

**Must-Have APIs:**
- `GET /api/resources` - List resources
- `GET /api/resources/allocations` - Get allocations
- `GET /api/resources/:id/timeline` - Get timeline

**Must-Have Entities:**
- `Resource`
- `ResourceAllocation`

**Done Definition:**
- ⚠️ Resources list functional
- ⚠️ Resource heatmap shows real data
- ⚠️ Resource timeline works
- ⚠️ Allocations filtered by workspace

---

### 7. Templates

**User Outcomes:**
- Users can browse and apply project templates
- Template application creates projects with structure

**Must-Have Screens:**
- `/templates` - Template center
- Template application flow

**Must-Have APIs:**
- `GET /api/templates` - List templates
- `POST /api/templates/:id/apply` - Apply template

**Must-Have Entities:**
- `Template`
- `ProjectTemplate`
- `TemplateBlock`

**Done Definition:**
- ⚠️ Template center shows templates
- ⚠️ Template application flow end-to-end
- ⚠️ Applied templates create projects correctly

---

### 8. Dashboards and Reporting

**User Outcomes:**
- Users can view dashboards with project metrics
- Dashboards are workspace-scoped
- Dashboard builder allows customization

**Must-Have Screens:**
- `/dashboards` - Dashboards list
- `/dashboards/:id` - Dashboard view
- `/dashboards/:id/edit` - Dashboard builder

**Must-Have APIs:**
- `GET /api/dashboards` - List dashboards
- `GET /api/dashboards/:id` - Get dashboard
- `POST /api/dashboards` - Create dashboard
- `GET /api/analytics/*` - Analytics endpoints

**Must-Have Entities:**
- `Dashboard`
- Materialized metrics entities

**Done Definition:**
- ⚠️ Dashboards list functional
- ⚠️ Dashboard view shows real data
- ⚠️ Dashboard builder works
- ⚠️ Dashboards filtered by workspace

---

### 9. Admin and Billing

**User Outcomes:**
- Admins can manage organization settings
- Admins can view usage and billing
- Admin console is accessible and functional

**Must-Have Screens:**
- `/admin/overview` - Admin overview
- `/admin/users` - User management
- `/admin/workspaces` - Workspace management
- `/admin/billing` - Billing page
- `/admin/platform-health` - Platform health (⚠️ TO CREATE)

**Must-Have APIs:**
- `GET /api/admin/*` - Admin endpoints
- `GET /api/admin/workspaces/maintenance/*` - Maintenance APIs (✅ DONE)

**Must-Have Entities:**
- Admin-specific views and reports

**Done Definition:**
- ✅ Admin maintenance API for workspace cleanup (✅ DONE)
- ⚠️ Admin console fully functional
- ⚠️ Billing integration works
- ⚠️ Platform health page exists

---

### 10. Integrations

**User Outcomes:**
- External integrations can sync data
- Integration connections are secure

**Must-Have Screens:**
- Integration settings (if applicable)

**Must-Have APIs:**
- `GET /api/integrations/*` - Integration endpoints
- Webhook endpoints

**Must-Have Entities:**
- `IntegrationConnection`
- `ExternalTask`
- `ExternalUserMapping`

**Done Definition:**
- ⚠️ Integration framework exists
- ⚠️ Integration sync works
- ⚠️ Webhook handling works

---

### 11. Observability

**User Outcomes:**
- System health is monitorable
- Errors are logged and trackable

**Must-Have Screens:**
- Platform health page (⚠️ TO CREATE)

**Must-Have APIs:**
- `GET /api/health` - Health check
- `GET /api/version` - Version info

**Must-Have Entities:**
- None (logging/metrics)

**Done Definition:**
- ✅ Health endpoint exists
- ⚠️ Platform health page exists
- ⚠️ Error tracking works

---

### 12. Security and Compliance

**User Outcomes:**
- Data is secure and tenant-isolated
- Access control is enforced
- Audit trails exist

**Must-Have Screens:**
- `/admin/security` - Security settings
- `/settings/security` - User security settings

**Must-Have APIs:**
- Security audit endpoints
- Access control enforcement

**Must-Have Entities:**
- Audit logs (if applicable)

**Done Definition:**
- ✅ Tenant isolation enforced (✅ DONE)
- ✅ Role-based access control works
- ✅ Workspace header rules enforced (✅ DONE)
- ⚠️ Audit logging functional
- ⚠️ Security compliance checks

---

## Legend

- ✅ DONE - Completed and verified
- ⚠️ IN PROGRESS - Partially complete or needs verification
- ❌ NOT STARTED - Not yet implemented

## Notes

- **Core 6 Flows** (MVP focus):
  1. Login ✅
  2. Select workspace ✅
  3. Create workspace ⚠️
  4. Create project ⚠️
  5. Create task/phase ⚠️
  6. Resource allocation view ⚠️

- **Recently Completed:**
  - Single home URL `/home` ✅
  - Workspace directory dropdown ✅
  - Single API client ✅
  - Workspace header rules ✅
  - Workspace membership security ✅
  - Admin maintenance endpoint ✅
