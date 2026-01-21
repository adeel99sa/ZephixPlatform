# Root Cause Analysis: Post-Login Routing Issue

## Evidence Collected

### A. Current File Contents

All relevant files have been read and are documented below.

### B. Backend API Response Shapes

**GET /api/auth/me** (auth.controller.ts:210-246)
- Returns: `buildUserResponse(user, orgRole, organization)`
- Shape: `{ id, email, firstName, lastName, role: PlatformRole, platformRole: PlatformRole, permissions: { isAdmin, ... }, organizationId, organization: { id, name, slug, features } }`
- PlatformRole: 'ADMIN' | 'MEMBER' | 'VIEWER'
- permissions.isAdmin: true only if orgRole is 'admin' or 'owner'

**GET /api/workspaces** (workspaces.controller.ts:145-169)
- Returns: `formatArrayResponse(workspaces)`
- Shape: `{ data: Workspace[] }`
- Workspace: `{ id, name, slug?, description? }`

**GET /api/workspaces/:workspaceId/role** (workspaces.controller.ts:546-571)
- Returns: `formatResponse(roleData)`
- Shape: `{ data: { role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST', canWrite: boolean, isReadOnly: boolean } }`

### C. Root Cause Identified

**Primary Issue: DashboardLayout Intercepts /home Route**

1. **Location**: `zephix-frontend/src/components/layouts/DashboardLayout.tsx:14`
   - `WORKSPACE_REQUIRED_ROUTES = ['/home', '/templates', '/projects']`
   - Line 33: `if (requiresWorkspace && (!workspaceReady || isHydrating)) { return <WorkspaceSelectionScreen />; }`
   - **Problem**: When user navigates to `/home`, DashboardLayout checks `workspaceReady` BEFORE HomeRouterPage can render and resolve workspace

2. **Secondary Issue: HomeRouterPage Routing Targets**
   - Line 22-26: Routes to `/admin/home`, `/my-work`, `/guest/home`
   - These routes exist in App.tsx, but the logic has issues:
     - Admin route: `/admin/home` exists (line 161)
     - Member route: `/my-work` exists (line 146) but is under PaidRoute
     - Guest route: `/guest/home` exists (line 113)

3. **Tertiary Issue: localStorage Key Mismatch**
   - AuthContext uses: `localStorage.getItem("activeWorkspaceId")` (AuthContext.tsx:51)
   - WorkspaceStore persists: `activeWorkspaceId` in key `workspace-storage` (workspace.store.ts:121-125)
   - HomeRouterPage reads: `localStorage.getItem("zephix.lastWorkspaceId")` (HomeRouterPage.tsx:48)
   - **Mismatch**: Three different keys for workspace persistence

4. **Logic Issue in HomeRouterPage**
   - Line 88: `if (activeWorkspaceId) return;` - Returns early without checking if role is loaded
   - Line 111: Navigates to `/select-workspace` but DashboardLayout already shows WorkspaceSelectionScreen
   - Line 128: Uses `normalizeRole(workspaceRole)` but workspaceRole comes from `useWorkspaceRole` which returns 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST', not workspace roles

### D. Why /home Shows Workspace Selection

1. User logs in → redirects to `/home`
2. App.tsx routes `/home` to `<DashboardLayout><HomeRouterPage /></DashboardLayout>`
3. DashboardLayout renders first, checks `requiresWorkspace` (true for `/home`)
4. DashboardLayout checks `workspaceReady` (false on first load)
5. DashboardLayout returns `<WorkspaceSelectionScreen />` immediately
6. HomeRouterPage never renders, so workspace resolution never runs

### E. Conditions That Should Trigger Workspace Selection

- User has 0 workspaces → redirect to `/onboarding`
- User has 2+ workspaces AND no `activeWorkspaceId` in store AND no valid `zephix.lastWorkspaceId` in localStorage → show `/select-workspace`
- User has 1 workspace → auto-select and persist
- User has 2+ workspaces AND valid `zephix.lastWorkspaceId` exists in workspace list → restore it

### F. Current Role and Workspace State During Failure

- **Platform Role**: Available from `user.permissions.isAdmin` or `user.platformRole` from `/api/auth/me`
- **Workspace Role**: Fetched from `/api/workspaces/:id/role` after workspace is selected
- **Workspace State**: `activeWorkspaceId` is null on first load, `workspaceReady` is false

### G. localStorage Keys Present

- `zephix.at` - Access token
- `zephix.rt` - Refresh token
- `zephix.sid` - Session ID
- `activeWorkspaceId` - Used by AuthContext (legacy?)
- `workspace-storage` - Zustand persisted state containing `activeWorkspaceId`
- `zephix.lastWorkspaceId` - Used by HomeRouterPage (should be the source of truth)

## Target Behavior

1. Login → `/home` (always)
2. `/home` → HomeRouterPage resolves workspace → routes to role home
3. Role homes:
   - Admin → `/admin/home`
   - Member → `/my-work`
   - Guest → `/guest/home`
4. `/select-workspace` only appears when HomeRouterPage cannot resolve workspace safely

## Implementation Plan

### Phase 1: Fix Guards and Routing Order
- Remove `/home` from `WORKSPACE_REQUIRED_ROUTES` in DashboardLayout
- Ensure `/select-workspace` is not blocked by workspace checks
- Keep workspace guards on workspace-scoped routes only

### Phase 2: Fix HomeRouterPage Workspace Resolution
- Implement priority algorithm (store → localStorage → auto-select → redirect)
- Persist `zephix.lastWorkspaceId` on auto-select
- Validate persisted ID exists in workspace list
- Add debug logging (behind flag)

### Phase 3: Fix Role-Based Routing
- Use platform role from `user.permissions.isAdmin` or `user.platformRole`
- Map to correct routes: `/admin/home`, `/my-work`, `/guest/home`
- Ensure routes exist in App.tsx

### Phase 4: Fix SelectWorkspacePage
- Set store and localStorage on selection
- Navigate to `/home` after selection (let HomeRouterPage handle role routing)

### Phase 5: Verify and Test
- Run verification script
- Capture screenshots
- Confirm all flows work
