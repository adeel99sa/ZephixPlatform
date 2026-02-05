# Frontend Route Map

**File:** `zephix-frontend/src/App.tsx`
**Last Updated:** 2025-01-27

## Route Structure

### Public Routes (No Auth Required)
| Path | Component | File Path |
|------|-----------|-----------|
| `/` | `LandingPage` | `@/pages/LandingPage` |
| `/login` | `LoginPage` | `@/pages/auth/LoginPage` |
| `/signup` | `SignupPage` | `@/pages/auth/SignupPage` |
| `/verify-email` | `VerifyEmailPage` | `@/pages/auth/VerifyEmailPage` |
| `/invites/accept` | `InviteAcceptPage` | `@/pages/auth/InviteAcceptPage` |
| `/invite` | `InvitePage` | `@/pages/auth/InvitePage` |
| `/join/workspace` | `JoinWorkspacePage` | `@/views/workspaces/JoinWorkspacePage` |
| `/w/:slug` | `WorkspaceSlugRedirect` | `@/views/workspaces/WorkspaceSlugRedirect` |

### Protected Routes (Auth Required)

#### Onboarding (No Layout)
| Path | Component | File Path |
|------|-----------|-----------|
| `/onboarding` | `OnboardingPage` | `@/pages/onboarding/OnboardingPage` |

#### Main App Routes (DashboardLayout)
| Path | Component | File Path |
|------|-----------|-----------|
| `/home` | `HomeView` | `@/views/HomeView` |
| `/dashboards` | `DashboardsIndex` | `@/views/dashboards/Index` |
| `/dashboards/:id` | `DashboardView` | `@/views/dashboards/View` |
| `/dashboards/:id/edit` | `DashboardBuilder` | `@/views/dashboards/Builder` |
| `/projects` | `<div>Projects Page</div>` | **Placeholder** |
| `/projects/:projectId` | `ProjectOverviewPage` | `@/features/projects/overview/ProjectOverviewPage` |
| `/work/projects/:projectId/plan` | `ProjectPlanView` | `@/views/work-management/ProjectPlanView` |
| `/workspaces` | `WorkspacesIndexPage` | `@/views/workspaces/WorkspacesIndexPage` |
| `/workspaces/:id` | `WorkspaceView` | `@/views/workspaces/WorkspaceView` |
| `/workspaces/:id/members` | `WorkspaceMembersPage` | `@/features/workspaces/pages/WorkspaceMembersPage` |
| `/workspaces/:id/settings` | `<div>Workspace Settings</div>` | **Placeholder** |
| `/workspaces/:id/heatmap` | `ResourceHeatmapPage` | `@/pages/resources/ResourceHeatmapPage` |
| `/templates` | `TemplateCenter` | `@/views/templates/TemplateCenter` |
| `/resources` | `ResourcesPage` | `@/pages/ResourcesPage` |
| `/resources/:id/timeline` | `ResourceTimelinePage` | `@/pages/resources/ResourceTimelinePage` |
| `/analytics` | `AnalyticsPage` | `@/pages/AnalyticsPage` |
| `/settings` | `SettingsPage` | `@/pages/settings/SettingsPage` |
| `/billing` | `BillingPage` | `@/pages/billing/BillingPage` |
| `/403` | `Forbidden` | `@/pages/system/Forbidden` |
| `/404` | `NotFound` | `@/pages/system/NotFound` |

#### Admin Routes (AdminLayout + AdminRoute Guard)
| Path | Component | File Path |
|------|-----------|-----------|
| `/admin` | `AdminDashboardPage` | `@/pages/admin/AdminDashboardPage` |
| `/admin/overview` | `AdminOverviewPage` | `@/pages/admin/AdminOverviewPage` |
| `/admin/org` | `AdminOrganizationPage` | `@/pages/admin/AdminOrganizationPage` |
| `/admin/users` | `AdminUsersPage` | `@/pages/admin/AdminUsersPage` |
| `/admin/teams` | `AdminTeamsPage` | `@/pages/admin/AdminTeamsPage` |
| `/admin/roles` | `AdminRolesPage` | `@/pages/admin/AdminRolesPage` |
| `/admin/invite` | `AdminInvitePage` | `@/pages/admin/AdminInvitePage` |
| `/admin/usage` | `AdminUsagePage` | `@/pages/admin/AdminUsagePage` |
| `/admin/billing` | `AdminBillingPage` | `@/pages/admin/AdminBillingPage` |
| `/admin/security` | `AdminSecurityPage` | `@/pages/admin/AdminSecurityPage` |
| `/admin/templates` | `AdminTemplatesPage` | `@/pages/admin/AdminTemplatesPage` |
| `/admin/templates/builder` | `AdminTemplateBuilderPage` | `@/pages/admin/AdminTemplateBuilderPage` |
| `/admin/templates/custom-fields` | `AdminCustomFieldsPage` | `@/pages/admin/AdminCustomFieldsPage` |
| `/admin/workspaces` | `AdminWorkspacesPage` | `@/pages/admin/AdminWorkspacesPage` |
| `/admin/projects` | `AdminProjectsPage` | `@/pages/admin/AdminProjectsPage` |
| `/admin/archive` | `AdminArchivePage` | `@/pages/admin/AdminArchivePage` |
| `/admin/trash` | `AdminTrashPage` | `@/pages/admin/AdminTrashPage` |

### Redirects
| Path | Redirects To |
|------|--------------|
| `/dashboard` | `/dashboards` (replace) |
| `*` (catch-all) | `/404` (replace) |

## Route Guards

### ProtectedRoute
- **File:** `zephix-frontend/src/routes/ProtectedRoute.tsx`
- **Purpose:** Requires authentication
- **Behavior:** Redirects to `/login` if not authenticated

### AdminRoute
- **File:** `zephix-frontend/src/routes/AdminRoute.tsx`
- **Purpose:** Requires platform Admin role
- **Behavior:**
  - If `PHASE_5_1_UAT_MODE = true`: Only allows `/admin/workspaces`, redirects other admin routes to `/home`
  - If `PHASE_5_1_UAT_MODE = false`: Allows all admin routes for Admins, redirects non-Admins to `/home`

## Layouts

### DashboardLayout
- **File:** `zephix-frontend/src/components/layouts/DashboardLayout.tsx`
- **Contains:** Sidebar, Header, DemoBanner, Main content area, AiAssistantPanel
- **Used by:** All main app routes (lines 86-111 in App.tsx)

### AdminLayout
- **File:** `zephix-frontend/src/layouts/AdminLayout.tsx`
- **Contains:** Admin-specific navigation and layout
- **Used by:** All admin routes (lines 115-143 in App.tsx)

## Missing Routes (Placeholders)

1. **`/settings/notifications`** - Not yet implemented
2. **`/settings/security`** - Not yet implemented
3. **`/inbox`** - Not yet implemented

## File Organization Patterns

- **Pages:** `src/pages/{category}/{PageName}.tsx`
- **Views:** `src/views/{feature}/{ViewName}.tsx`
- **Features:** `src/features/{feature}/pages/{PageName}.tsx`
- **Admin Pages:** `src/pages/admin/{AdminPageName}.tsx`
- **Route Guards:** `src/routes/{GuardName}.tsx`
- **Layouts:** `src/components/layouts/{LayoutName}.tsx` or `src/layouts/{LayoutName}.tsx`

## Notes

- All routes are defined in a single file: `src/App.tsx`
- Route guards wrap route groups, not individual routes
- Layouts are applied via nested `<Route element={...}>` structure
- Admin routes are separate from main app routes (different layout)
