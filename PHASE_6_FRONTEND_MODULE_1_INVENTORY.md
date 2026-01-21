# Phase 6 Frontend - Module 1: Inventory and Wiring Check

## Current Frontend Structure

### Routes and Layouts ✅
- **App.tsx**: Main router with routes defined
  - `/home` → `HomeView` (role-based: AdminHome, MemberHome, GuestHome)
  - `/w/:slug/home` → `WorkspaceHomeBySlug` (workspace landing page)
  - `/workspaces/:id` → `WorkspaceView`
  - `/workspaces/:id/projects` → (not defined, needs to be added)
  - Protected routes use `DashboardLayout`
  - Admin routes use `AdminLayout`

- **DashboardLayout.tsx**: Main app shell
  - Shows `Sidebar` and `Header`
  - Shows workspace selection screen if workspace required but not ready
  - Workspace nav items show when `activeWorkspaceId` is set

- **HomeView.tsx**: Role-based home routing
  - Routes to AdminHome, MemberHome, or GuestHome based on platformRole
  - Uses `normalizePlatformRole` and `PLATFORM_ROLE` constants

- **WorkspaceHomeBySlug.tsx**: Workspace landing page
  - Fetches `/workspaces/slug/:slug/home`
  - Sets active workspace in store
  - Renders `WorkspaceHome` component

### API Client and Auth ✅
- **api.ts**: Axios client with:
  - Base URL from env
  - Token management (accessToken, refreshToken, sessionId)
  - Request interceptor adds Authorization header
  - Response interceptor unwraps `{ data: ... }` envelope
  - Auto-refresh on 401

- **AuthContext.tsx**: Auth state management
  - `user` object with `role`, `platformRole`, `permissions`
  - `login()`, `logout()` functions
  - Hydrates user from `/auth/me` on mount

### Role Helpers ✅
- **roles.ts**: Role utilities
  - `normalizePlatformRole()`: Maps to 'ADMIN' | 'MEMBER' | 'VIEWER'
  - `isAdminUser()`: Checks `permissions.isAdmin === true`
  - `isPaidUser()`: Checks if ADMIN or MEMBER (not VIEWER)
  - `PLATFORM_ROLE` constants

### Current Frontend Pages

#### Workspaces
- `/workspaces` → `WorkspacesIndexPage` (list workspaces)
- `/workspaces/:id` → `WorkspaceView` (workspace detail)
- `/workspaces/:id/members` → `WorkspaceMembersPage`
- `/w/:slug/home` → `WorkspaceHomeBySlug` → `WorkspaceHome` (workspace landing)

#### Projects
- `/projects` → `<div>Projects Page</div>` (placeholder)
- `/projects/:projectId` → `ProjectOverviewPage`
- `/work/projects/:projectId/plan` → `ProjectPlanView`

#### Dashboards
- `/dashboards` → `DashboardsIndex`
- `/dashboards/:id` → `DashboardView`
- `/dashboards/:id/edit` → `DashboardBuilder`

#### Templates
- `/templates` → `TemplateCenter`

### Sidebar Navigation

**Location**: `zephix-frontend/src/components/shell/Sidebar.tsx`

**Structure**:
- Platform brand (top)
- User profile dropdown
- Main nav items:
  - Home
  - Inbox (paid users only)
  - Workspaces (with dropdown menu)
  - SidebarWorkspaces component (workspace selector)
  - **Workspace nav** (shows when `activeWorkspaceId` is set):
    - Overview → `/workspaces/:id`
    - Projects → `/workspaces/:id/projects`
    - Members → `/workspaces/:id/members`
  - Template Center
  - Settings

**Workspace ID/Slug Storage**:
- `useWorkspaceStore` (Zustand) stores `activeWorkspaceId`
- Persisted to localStorage as 'workspace-storage'
- Workspace slug comes from workspace object when selecting

### Workspace Home Endpoint

**Current Usage**: `WorkspaceHomeBySlug.tsx` calls:
- `GET /api/workspaces/slug/:slug/home`

**Response Structure** (from interface):
```typescript
{
  workspace: { id, name, slug, description, owner },
  stats: { activeProjectsCount, membersCount },
  lists: { activeProjects: Array<{ id, name, status }> },
  topRisksCount: number
}
```

**Note**: `WorkspaceHome` component currently doesn't use this endpoint - it calls individual APIs instead. Need to update to use the endpoint data.

## Missing Endpoints (to verify)

1. **List programs in workspace**
   - Need to check if `/api/workspaces/:workspaceId/portfolios/:portfolioId/programs` exists
   - Or if we need `/api/workspaces/:workspaceId/programs`

2. **List portfolios in workspace**
   - Need to check if `/api/workspaces/:workspaceId/portfolios` exists

3. **Link project endpoint**
   - `PATCH /api/workspaces/:workspaceId/projects/:projectId/link` - exists per backend implementation

## Next Steps

1. ✅ Module 1 Complete - Inventory documented
2. Module 2: Update WorkspaceHome to use endpoint and add widgets
3. Module 3: Create Program pages
4. Module 4: Create Portfolio pages
5. Module 5: Add linking UI
6. Module 6: Update Sidebar navigation
7. Module 7: Acceptance checks
