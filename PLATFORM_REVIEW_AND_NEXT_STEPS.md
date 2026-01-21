# Zephix Platform Review and Next Steps Map

**Date:** 2025-01-27
**Reviewer:** Senior Solution Architect
**Scope:** Frontend and Backend Codebase Analysis

---

## 1. PLATFORM MAP

### Auth and Roles

**Built:**
- ✅ PlatformRole enum (ADMIN, MEMBER, VIEWER)
- ✅ WorkspaceRole type (workspace_owner, workspace_member, workspace_viewer)
- ✅ normalizePlatformRole helper
- ✅ getEffectiveWorkspaceRole service
- ✅ RequireOrgRoleGuard and RequireWorkspaceAccessGuard
- ✅ JWT with platformRole in payload
- ✅ AuthSession entity and session management
- ✅ Refresh token rotation with session tracking
- ✅ Session revocation endpoints

**Partially Built:**
- ⚠️ Role enforcement inconsistent (some guards use legacy strings)
- ⚠️ Frontend role checks mix helpers and string comparisons

**Not Built:**
- ❌ Role Home page per platform role (Phase 5.3 requirement)
- ❌ Admin Home with organization snapshot
- ❌ Member Home with "My work" section
- ❌ Guest Home with read-only overview

**Files:**
- `zephix-backend/src/shared/enums/platform-roles.enum.ts`
- `zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts`
- `zephix-backend/src/modules/auth/entities/auth-session.entity.ts`
- `zephix-frontend/src/views/HomeView.tsx` (basic, not role-specific)

---

### Workspace Governance

**Built:**
- ✅ Workspace entity with slug support
- ✅ WorkspaceMember entity with roles
- ✅ Workspace creation (ADMIN only)
- ✅ Workspace slug resolution endpoint
- ✅ Workspace switching and routing
- ✅ Last owner protection
- ✅ Member suspend/reinstate
- ✅ Workspace invite system

**Partially Built:**
- ⚠️ Workspace Home exists but route is `/workspaces/:id` not `/w/:slug/home`
- ⚠️ WorkspaceHome component exists but not wired to `/w/:slug/home` route

**Not Built:**
- ❌ `/w/:slug/home` route (Phase 5.3 requirement)
- ❌ Workspace Home health snapshot
- ❌ Workspace Home teams/project types display

**Files:**
- `zephix-backend/src/modules/workspaces/workspaces.controller.ts`
- `zephix-frontend/src/views/workspaces/WorkspaceView.tsx`
- `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx`
- `zephix-frontend/src/App.tsx` (missing `/w/:slug/home` route)

---

### Role Home and Workspace Home Status

**Built:**
- ✅ Basic `/home` route exists
- ✅ WorkspaceHome component exists
- ✅ Workspace slug redirect (`/w/:slug`)

**Partially Built:**
- ⚠️ `/home` shows generic content, not role-specific
- ⚠️ WorkspaceHome shows projects/members but missing health snapshot

**Not Built:**
- ❌ `/home` route with role-specific content (Phase 5.3)
  - ❌ Admin Home: Organization snapshot, admin actions, quick links, inbox preview
  - ❌ Member Home: My work, team signals, inbox preview
  - ❌ Guest Home: Read-only overview, shared workspaces/projects
- ❌ `/w/:slug/home` route (currently `/workspaces/:id` renders WorkspaceHome)
- ❌ Workspace Home: Purpose statement, teams/project types, health snapshot

**Files:**
- `zephix-frontend/src/views/HomeView.tsx` (needs role-specific content)
- `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx` (needs enhancements)

---

### Work Management

**Built:**
- ✅ WorkItem entity (workspace-scoped)
- ✅ WorkTask entity (workspace-scoped, with phases)
- ✅ WorkPhase entity
- ✅ Task dependencies
- ✅ Task comments and activity
- ✅ WorkTasksService with CRUD
- ✅ WorkTasksController with endpoints

**Partially Built:**
- ⚠️ Multiple task entities exist (Task, WorkTask, WorkItem) - consolidation needed
- ⚠️ Status flow enforcement not fully implemented
- ⚠️ Bulk actions not implemented
- ⚠️ Filters incomplete

**Not Built:**
- ❌ End-to-end work item flow (create → assign → status → complete)
- ❌ Activity history aggregation
- ❌ Bulk status updates
- ❌ Advanced filters (assignee, date range, priority)

**Files:**
- `zephix-backend/src/modules/work-management/entities/work-task.entity.ts`
- `zephix-backend/src/modules/work-items/entities/work-item.entity.ts`
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts`

---

### Template Center

**Built:**
- ✅ Template entity with categories, kind, metadata
- ✅ ProjectTemplate entity
- ✅ Template apply service (creates project with phases/tasks)
- ✅ TemplateController with CRUD
- ✅ TemplateCenter UI component
- ✅ Template instantiation flow

**Partially Built:**
- ⚠️ Template builder UI exists but needs hardening
- ⚠️ Template blocks/lego blocks exist but not fully integrated

**Not Built:**
- ❌ Workflow templates
- ❌ Risk templates
- ❌ Resource templates
- ❌ Dashboard templates
- ❌ Template versioning
- ❌ Template sharing across organizations

**Files:**
- `zephix-backend/src/modules/templates/entities/template.entity.ts`
- `zephix-backend/src/modules/templates/services/templates.service.ts`
- `zephix-frontend/src/views/templates/TemplateCenter.tsx`

---

### Dashboards

**Built:**
- ✅ Dashboard entity (workspace-scoped)
- ✅ DashboardWidget entity
- ✅ DashboardTemplate entity
- ✅ Widget registry with allowlist
- ✅ Dashboard builder UI (drag-and-drop)
- ✅ Dashboard view page
- ✅ Analytics widgets (project-health, resource-utilization, conflict-trends)
- ✅ Template activation system
- ✅ Share link with token

**Partially Built:**
- ⚠️ Widget include mode (auto/manual/hybrid) not fully implemented
- ⚠️ Role-aware metrics partially implemented
- ⚠️ Admin dashboard builder exists but needs hardening

**Not Built:**
- ❌ Natural language to SQL pipeline
- ❌ Semantic layer for dashboard queries
- ❌ Generative chart rendering from natural language
- ❌ Cmd+K interface for dashboard creation
- ❌ Dashboard templates for PMO and Exec

**Files:**
- `zephix-backend/src/modules/dashboards/entities/dashboard.entity.ts`
- `zephix-frontend/src/views/dashboards/Builder.tsx`
- `docs/DASHBOARD_MASTER_PLAN.md`

---

### Admin Section

**Built:**
- ✅ AdminLayout and AdminRoute guard
- ✅ AdminDashboardPage with stats
- ✅ AdminUsersPage (user management)
- ✅ AdminWorkspacesPage (workspace management)
- ✅ AdminProjectsPage (project management)
- ✅ AdminTemplatesPage (template management)
- ✅ AdminBillingPage (billing)
- ✅ AdminUsagePage (usage limits)
- ✅ AdminTrashPage (restore deleted items)

**Partially Built:**
- ⚠️ AdminOrganizationPage (stub, missing backend)
- ⚠️ AdminTeamsPage (stub, all TODOs)
- ⚠️ AdminRolesPage (partial, missing backend)
- ⚠️ AdminSecurityPage (stub, all TODOs)
- ⚠️ AdminArchivePage (empty stub)

**Not Built:**
- ❌ Full admin control for all areas
- ❌ Preview before apply for admin changes
- ❌ Reversible changes system
- ❌ Comprehensive audit logs UI
- ❌ Integrations management UI
- ❌ Notification policy management

**Files:**
- `zephix-frontend/src/layouts/AdminLayout.tsx`
- `zephix-frontend/src/pages/admin/AdminDashboardPage.tsx`
- `ADMIN_CONSOLE_AUDIT_REPORT.md`

---

### Resource Management

**Built:**
- ✅ Resource entity (organization-scoped)
- ✅ ResourceAllocation entity (percentage-based)
- ✅ ResourceConflict entity
- ✅ Conflict detection service
- ✅ Capacity rollups
- ✅ ResourceRiskScoreService
- ✅ ResourceHeatmapPage UI
- ✅ ResourceTimelinePage UI

**Partially Built:**
- ⚠️ Allocation model uses both percentage and hours (needs standardization)
- ⚠️ Soft and hard bookings exist but not fully enforced
- ⚠️ Import and bulk edit not implemented

**Not Built:**
- ❌ Resource directory UI (full CRUD)
- ❌ Bulk allocation import
- ❌ Capacity rollup UI
- ❌ Resource conflict resolution workflow

**Files:**
- `zephix-backend/src/modules/resources/entities/resource.entity.ts`
- `zephix-backend/src/modules/resources/resources.service.ts`
- `zephix-backend/src/modules/resources/resource-allocation.service.ts`

---

### Documents

**Built:**
- ✅ Document upload controller
- ✅ Document parser service
- ✅ Embedding service
- ✅ Vector database service
- ✅ FileUpload component
- ✅ Document intelligence service

**Partially Built:**
- ⚠️ Document attachments linked to projects but not work items
- ⚠️ Inline preview exists but needs hardening
- ⚠️ Permission inheritance not fully tested

**Not Built:**
- ❌ Document attachments to work items
- ❌ Document attachments to risks
- ❌ Drag and drop UI
- ❌ Document audit logs
- ❌ Document versioning

**Files:**
- `zephix-backend/src/ai/document-upload.controller.ts`
- `zephix-frontend/src/components/FileUpload.tsx`
- `zephix-backend/src/pm/services/document-intelligence.service.ts`

---

### Notifications and Inbox

**Built:**
- ✅ Notification entity
- ✅ NotificationRead entity
- ✅ NotificationDispatchService
- ✅ NotificationPreferencesService
- ✅ NotificationsController with endpoints
- ✅ InboxPage UI
- ✅ Notification preferences UI

**Partially Built:**
- ⚠️ Email templates exist but not all events wired
- ⚠️ Slack/Teams notifications not implemented

**Not Built:**
- ❌ Real-time notifications (WebSocket)
- ❌ Notification batching
- ❌ Notification preferences per workspace
- ❌ Notification history export

**Files:**
- `zephix-backend/src/modules/notifications/entities/notification.entity.ts`
- `zephix-backend/src/modules/notifications/notification-dispatch.service.ts`
- `zephix-frontend/src/pages/InboxPage.tsx`

---

### Security Sessions

**Built:**
- ✅ AuthSession entity
- ✅ Session creation on login
- ✅ Session tracking (lastSeenAt)
- ✅ Session revocation (single and all)
- ✅ Refresh token rotation
- ✅ SessionsController with endpoints
- ✅ SecuritySettingsPage UI

**Partially Built:**
- ⚠️ Session listing UI exists but needs polish

**Not Built:**
- ❌ Session device fingerprinting
- ❌ Session anomaly detection
- ❌ Session geolocation tracking

**Files:**
- `zephix-backend/src/modules/auth/entities/auth-session.entity.ts`
- `zephix-backend/src/modules/auth/controllers/sessions.controller.ts`
- `zephix-frontend/src/pages/settings/SecuritySettingsPage.tsx`

---

### AI Readiness

**Built:**
- ✅ AI chat service (demo mode)
- ✅ AI form generator service
- ✅ Document intelligence service
- ✅ Vector database service
- ✅ Embedding service
- ✅ RAG infrastructure (rag_index table)
- ✅ KnowledgeIndexService

**Partially Built:**
- ⚠️ AI demo mode gated (ZEPHIX_AI_DEMO_MODE env var)
- ⚠️ AI services exist but not fully integrated

**Not Built:**
- ❌ Read-only AI (as per Phase 13 plan)
- ❌ Role-scoped AI responses
- ❌ Project to portfolio reasoning
- ❌ Natural language query interface
- ❌ Daily snapshots for AI analysis
- ❌ AI autonomous actions (correctly not built per plan)

**Files:**
- `zephix-backend/src/pm/services/ai-chat.service.ts`
- `zephix-backend/src/pm/services/ai-form-generator.service.ts`
- `zephix-backend/src/ai/services/ai-analysis.service.ts`

---

## 2. CRITICAL GAPS

### Blockers for End-to-End Project Flow

1. **Role Home Missing**
   - Users land on generic `/home` instead of role-specific content
   - No organization snapshot for admins
   - No "My work" section for members
   - Blocks user orientation and quick access

2. **Workspace Home Route Missing**
   - WorkspaceHome component exists but route is `/workspaces/:id` not `/w/:slug/home`
   - Phase 5.3 requires `/w/:slug/home` route
   - Blocks workspace orientation

3. **Work Management Incomplete**
   - Multiple task entities (consolidation needed)
   - Status flow enforcement incomplete
   - Bulk actions missing
   - Blocks efficient work item management

### Blockers for End-to-End Dashboard Flow

1. **Natural Language Interface Missing**
   - No natural language to SQL pipeline
   - No semantic layer for queries
   - No generative chart rendering
   - Blocks "created by anyone" vision

2. **Widget Include Mode Incomplete**
   - Auto/manual/hybrid modes not fully implemented
   - Blocks flexible dashboard configuration

### Blockers for Admin Full Control

1. **Admin Pages Stubs**
   - AdminOrganizationPage (missing backend)
   - AdminTeamsPage (all TODOs)
   - AdminSecurityPage (all TODOs)
   - Blocks full admin functionality

2. **Audit Logs UI Missing**
   - Audit logs exist but no UI
   - Blocks compliance and security monitoring

### Blockers for Enterprise Readiness

1. **Portfolio/Program Rollups Incomplete**
   - Entities exist but rollup endpoints incomplete
   - Permission inheritance from workspace not fully tested
   - Blocks portfolio management

2. **Resource Management UI Incomplete**
   - Resource directory UI missing
   - Bulk import missing
   - Blocks efficient resource management

3. **Document Attachments Incomplete**
   - Not linked to work items/risks
   - Drag and drop missing
   - Blocks document-centric workflows

---

## 3. BROKEN OR RISKY AREAS

### Role Enforcement Gaps

1. **Inconsistent Role Checks**
   - Some guards use legacy role strings instead of PlatformRole enum
   - Frontend mixes helpers and string comparisons
   - **Risk:** Security vulnerabilities, inconsistent behavior
   - **Files:**
     - `zephix-backend/src/organizations/guards/roles.guard.ts` (uses legacy hierarchy)
     - `packages/user-auth-service/src/api/middleware/auth.middleware.ts` (uses string roles)

2. **Missing Role Home Enforcement**
   - `/home` route doesn't check platform role
   - Generic content shown to all roles
   - **Risk:** Poor UX, confusion

### Routing Inconsistencies

1. **Workspace Home Route Mismatch**
   - WorkspaceHome component exists but route is `/workspaces/:id`
   - Phase 5.3 requires `/w/:slug/home`
   - **Risk:** Confusion, broken deep links

2. **Login Redirect Logic**
   - Login redirects to `/workspaces` but should go to `/home` (role-specific)
   - **Risk:** Users miss role-specific content

### Duplicate Logic

1. **Multiple Task Entities**
   - `Task`, `WorkTask`, `WorkItem` entities exist
   - Different services for each
   - **Risk:** Data inconsistency, maintenance burden
   - **Files:**
     - `zephix-backend/src/modules/tasks/entities/task.entity.ts`
     - `zephix-backend/src/modules/work-management/entities/work-task.entity.ts`
     - `zephix-backend/src/modules/work-items/entities/work-item.entity.ts`

2. **Template Entities Overlap**
   - `Template` and `ProjectTemplate` entities
   - Some duplication in structure
   - **Risk:** Confusion, data sync issues

### Missing Guards

1. **Workspace Home Route Guard**
   - `/w/:slug/home` route doesn't exist (should check workspace access)
   - **Risk:** Security if route added without guard

2. **Role Home Route Guard**
   - `/home` route doesn't enforce role-specific content
   - **Risk:** Wrong content shown to wrong roles

### Data Leakage Risks

1. **Workspace Slug Resolution**
   - Slug resolution endpoint exists but may leak workspace existence
   - **Risk:** Information disclosure

2. **Admin Pages Without Backend**
   - AdminOrganizationPage, AdminTeamsPage show UI but no backend
   - **Risk:** User confusion, broken functionality

---

## 4. NEXT BUILD ORDER

### Phase 5.3: Role Home and Workspace Home (IMMEDIATE)

**Why First:**
- Users need meaningful landing pages
- Blocks user orientation and quick access
- Required for Phase 6 (Delivery Hierarchy)

**What to Build:**
1. **Role Home (`/home`)**
   - Admin Home: Organization snapshot, admin actions, quick links, inbox preview
   - Member Home: My work, team signals, inbox preview
   - Guest Home: Read-only overview, shared workspaces/projects
   - Backend endpoints for role-specific data

2. **Workspace Home (`/w/:slug/home`)**
   - Add route `/w/:slug/home` that renders WorkspaceHome
   - Enhance WorkspaceHome with:
     - Purpose statement
     - Teams and project types
     - Health snapshot
   - Backend endpoints for workspace health

**What Must Not Be Touched:**
- Existing workspace routing (`/workspaces/:id`)
- Auth and role system (already stable)
- Template center (already functional)

---

### Phase 6: Delivery Hierarchy (AFTER 5.3)

**Why Second:**
- Portfolio/Program entities exist but rollups incomplete
- Needed for portfolio management
- Depends on workspace home for context

**What to Build:**
1. **Portfolio Rollup Endpoints**
   - Portfolio → Program → Project aggregation
   - Health calculation at each level
   - Permission inheritance from workspace

2. **Program Rollup Endpoints**
   - Program → Project aggregation
   - Health calculation

**What Must Not Be Touched:**
- Existing portfolio/program entities
- Project entity structure

---

### Phase 7: Work Management Hardening (AFTER 6)

**Why Third:**
- Work management exists but needs consolidation
- Multiple task entities need unification
- Status flow needs enforcement

**What to Build:**
1. **Task Entity Consolidation**
   - Choose one entity (WorkTask recommended)
   - Migrate data from others
   - Update all references

2. **Status Flow Enforcement**
   - Define valid transitions
   - Enforce in service layer
   - Add UI validation

3. **Bulk Actions**
   - Bulk status updates
   - Bulk assignment
   - Bulk deletion

**What Must Not Be Touched:**
- Existing work item data
- Task dependencies (already working)

---

### Phase 8: Template Center Expansion (AFTER 7)

**Why Fourth:**
- Project templates work
- Need workflow, risk, resource, dashboard templates
- Drives everything (as per plan)

**What to Build:**
1. **Workflow Templates**
   - Template entity extension
   - Workflow instantiation

2. **Risk Templates**
   - Risk template entity
   - Risk template application

3. **Resource Templates**
   - Resource template entity
   - Resource template application

4. **Dashboard Templates**
   - Dashboard template entity (exists)
   - Dashboard template application (exists, needs expansion)

**What Must Not Be Touched:**
- Existing project template system
- Template apply service (already working)

---

### Phase 9: Dashboard System Completion (AFTER 8)

**Why Fifth:**
- Dashboard builder exists
- Need natural language interface
- Need widget include modes

**What to Build:**
1. **Natural Language Interface**
   - Natural language to SQL pipeline
   - Semantic layer for queries
   - Generative chart rendering

2. **Widget Include Modes**
   - Auto mode (automatic inclusion)
   - Manual mode (user selection)
   - Hybrid mode (suggestions + manual)

**What Must Not Be Touched:**
- Existing dashboard builder
- Widget registry (already working)

---

### Phase 10: Admin Section Completion (AFTER 9)

**Why Sixth:**
- Admin pages exist but some are stubs
- Need full admin control
- Need audit logs UI

**What to Build:**
1. **Admin Backend Endpoints**
   - Organization management endpoints
   - Teams management endpoints
   - Security settings endpoints

2. **Audit Logs UI**
   - Audit log viewer
   - Filtering and search
   - Export functionality

3. **Preview Before Apply**
   - Change preview system
   - Reversible changes
   - Change confirmation

**What Must Not Be Touched:**
- Existing admin pages (already working)
- Admin layout (already stable)

---

## 5. READINESS VERDICT

### Is the Platform Stable for Phase 6?

**Answer: NO**

**Why:**
1. **Phase 5.3 Not Complete**
   - Role Home missing (blocks user orientation)
   - Workspace Home route missing (blocks workspace orientation)
   - Must complete Phase 5.3 before Phase 6

2. **Portfolio/Program Rollups Incomplete**
   - Entities exist but rollup endpoints incomplete
   - Permission inheritance not fully tested
   - Blocks portfolio management

### What Must Be Fixed First

1. **Phase 5.3: Role Home and Workspace Home (CRITICAL)**
   - Implement role-specific `/home` route
   - Implement `/w/:slug/home` route
   - Add backend endpoints for role-specific data
   - Add workspace health snapshot

2. **Role Enforcement Consistency (HIGH)**
   - Standardize all guards to use PlatformRole enum
   - Remove legacy role string comparisons
   - Update frontend to use role helpers only

3. **Task Entity Consolidation (MEDIUM)**
   - Choose one task entity
   - Migrate data
   - Update references

---

## 6. WHAT TO DO NEXT WEEK

### Week 1: Phase 5.3 Implementation

**Monday-Tuesday: Role Home Backend**
- [ ] Create backend endpoints for admin home data (org snapshot, active projects, programs at risk, resource conflicts)
- [ ] Create backend endpoints for member home data (assigned items, projects I'm on, risks I own, upcoming milestones)
- [ ] Create backend endpoints for guest home data (shared workspaces, shared projects)
- [ ] Add role-based data aggregation services

**Wednesday-Thursday: Role Home Frontend**
- [ ] Update `/home` route to check platform role
- [ ] Create AdminHome component (organization snapshot, admin actions, quick links, inbox preview)
- [ ] Create MemberHome component (my work, team signals, inbox preview)
- [ ] Create GuestHome component (read-only overview, shared workspaces/projects)
- [ ] Wire up backend endpoints

**Friday: Workspace Home Route**
- [ ] Add `/w/:slug/home` route to App.tsx
- [ ] Update WorkspaceSlugRedirect to support `/w/:slug/home`
- [ ] Enhance WorkspaceHome component with:
  - Purpose statement display
  - Teams and project types display
  - Health snapshot (backend endpoint needed)
- [ ] Test workspace switching and routing

**Weekend: Testing and Polish**
- [ ] Test role-specific home pages with different roles
- [ ] Test workspace home route with different slugs
- [ ] Fix any routing issues
- [ ] Update documentation

---

### Files to Create/Modify

**Backend:**
- `zephix-backend/src/modules/home/services/admin-home.service.ts` (new)
- `zephix-backend/src/modules/home/services/member-home.service.ts` (new)
- `zephix-backend/src/modules/home/controllers/home.controller.ts` (new)
- `zephix-backend/src/modules/workspaces/services/workspace-health.service.ts` (new)

**Frontend:**
- `zephix-frontend/src/views/home/AdminHome.tsx` (new)
- `zephix-frontend/src/views/home/MemberHome.tsx` (new)
- `zephix-frontend/src/views/home/GuestHome.tsx` (new)
- `zephix-frontend/src/views/HomeView.tsx` (modify - add role routing)
- `zephix-frontend/src/App.tsx` (modify - add `/w/:slug/home` route)
- `zephix-frontend/src/views/workspaces/WorkspaceSlugRedirect.tsx` (modify - support home route)
- `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx` (modify - add health snapshot)

---

**END OF REVIEW**
