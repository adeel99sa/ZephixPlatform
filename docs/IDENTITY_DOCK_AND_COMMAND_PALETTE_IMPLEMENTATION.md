# Identity Dock and Command Palette Implementation

**Date:** 2025-01-27
**Status:** ✅ Complete

## Summary

Implemented a left Identity Dock with Profile Panel and a global Command Palette, replacing the existing UserProfileDropdown. All components are role-aware and respect UAT mode gating.

## Components Created

### 1. IdentityDock (`src/components/shell/IdentityDock.tsx`)
- **Purpose**: Left rail identity section showing user avatar, name, platform role badge, and active workspace
- **Features**:
  - Avatar with user initials
  - User name display
  - Platform role badge (Admin/Member/Guest)
  - Active workspace name (fetched from API)
  - Opens Profile Panel on click
- **Position**: Replaces UserProfileDropdown in Sidebar

### 2. ProfilePanel (`src/components/shell/ProfilePanel.tsx`)
- **Purpose**: Side sheet anchored to left rail showing user profile and settings
- **Features**:
  - **Identity Header**: Avatar, full name, email, platform role badge, org name
  - **Personal Section** (non-Guest only):
    - My profile → `/profile`
    - Notifications → `/settings/notifications` (if exists, else disabled with "Coming soon")
    - Security → `/settings/security` (if exists, else disabled with "Coming soon")
    - Theme selector (light/dark/system) using existing `useUIStore`
  - **Work Section** (non-Guest only):
    - My workspaces → `/workspaces`
    - Create workspace → `/workspaces` (Admin only)
  - **Organization Section** (Admin only):
    - Invite members → `/admin/users` or workspace invite flow
    - Manage workspaces → `/admin/workspaces`
  - **System Section** (Admin only, UAT mode off):
    - Administration → `/admin`
  - **Exit Section**:
    - Log out → Calls backend logout, clears client auth, redirects to login
- **Behavior**:
  - Closes on Esc key
  - Closes on click outside
  - Closes on route change
  - Anchored to left rail (positioned at `left-72` to match sidebar width)

### 3. CommandPalette (`src/components/shell/CommandPalette.tsx`)
- **Purpose**: Global searchable command overlay
- **Features**:
  - Opens with `Cmd+K` / `Ctrl+K` (fallback: `Cmd+Shift+K` / `Ctrl+Shift+K`)
  - Searchable command list
  - Keyboard navigation (Arrow keys, Enter)
  - Role-aware commands:
    - Switch workspace → `/workspaces`
    - Create workspace → `/workspaces` (Admin only)
    - Go to My profile → `/profile` (non-Guest)
    - Go to Inbox → `/inbox` (if exists, else disabled)
    - Go to Notifications settings → `/settings/notifications` (if exists, else disabled)
    - Go to Security settings → `/settings/security` (if exists, else disabled)
    - Go to Manage workspaces → `/admin/workspaces` (Admin only)
- **Position**: Rendered in `DashboardLayout` for global availability

## Role Gating

### ADMIN
- Sees all sections in Profile Panel
- Can create workspaces
- Can manage workspaces
- Sees Administration (when UAT mode is off)
- Can invite members

### MEMBER
- Sees Personal and Work sections
- Cannot see Organization section
- Cannot see admin items
- Cannot create workspaces (via UI, but can via Admin if assigned)

### GUEST (VIEWER)
- Sees only:
  - Identity header (read-only)
  - Theme selector
  - Log out
- All edit controls hidden/disabled

## UAT Mode Behavior

- **UAT Mode ON** (`PHASE_5_1_UAT_MODE = true`):
  - Administration item hidden in Profile Panel
  - Manage workspaces still routes to `/admin/workspaces` (Admin can still access)

- **UAT Mode OFF** (`PHASE_5_1_UAT_MODE = false`):
  - Administration item visible in Profile Panel (Admin only)
  - All admin features available

## Integration Points

### Replaced Components
- `UserProfileDropdown` → `IdentityDock` + `ProfilePanel`

### Modified Files
- `src/components/shell/Sidebar.tsx`: Replaced UserProfileDropdown with IdentityDock
- `src/components/layouts/DashboardLayout.tsx`: Added CommandPalette for global availability

### Dependencies
- Uses existing `useAuth` for user data
- Uses existing `useWorkspaceStore` for active workspace
- Uses existing `useOrganizationStore` for org data
- Uses existing `useUIStore` for theme management
- Uses existing `normalizePlatformRole` and `isAdminUser` for role checks
- Uses existing `PHASE_5_1_UAT_MODE` config flag

## Route Existence Checks

Currently using hardcoded `false` for route existence checks:
- `/settings/notifications` → `hasNotificationsRoute = false`
- `/settings/security` → `hasSecurityRoute = false`
- `/inbox` → `hasInboxRoute = false`

**TODO**: Implement actual route existence checking when these routes are created.

## Keyboard Shortcuts

- **Cmd+K** / **Ctrl+K**: Open Command Palette
- **Cmd+Shift+K** / **Ctrl+Shift+K**: Fallback if Ctrl+K is blocked
- **Esc**: Close Profile Panel or Command Palette
- **Arrow Up/Down**: Navigate commands in palette
- **Enter**: Execute selected command

## Testing Checklist

- [x] Identity Dock shows user info and role badge
- [x] Profile Panel opens on Identity Dock click
- [x] Profile Panel closes on Esc, click outside, route change
- [x] Command Palette opens with Cmd+K / Ctrl+K
- [x] Role gating works (Admin sees all, Member sees limited, Guest sees minimal)
- [x] UAT mode hides Administration item
- [x] Logout calls backend and clears client auth
- [x] Theme selector works
- [x] All navigation routes work
- [x] No TypeScript errors
- [x] No lint errors

## Manual Verification Steps

1. **Admin in UAT mode**:
   - Login as Admin
   - Verify Identity Dock shows Admin badge
   - Click Identity Dock → Profile Panel opens
   - Verify no "Administration" item
   - Verify "Manage workspaces" routes to `/admin/workspaces`
   - Press Cmd+K → Command Palette opens
   - Verify all commands visible

2. **Admin in non-UAT mode**:
   - Set `PHASE_5_1_UAT_MODE = false`
   - Verify "Administration" item appears
   - Verify routes to `/admin`

3. **Member**:
   - Login as Member
   - Verify no Organization section
   - Verify no admin items
   - Verify can access Personal and Work sections

4. **Guest**:
   - Login as Guest
   - Verify only Identity header, Theme, Log out visible
   - Verify no create/invite/admin actions

5. **Logout**:
   - Click Log out in Profile Panel
   - Verify backend logout called
   - Verify redirects to `/login`
   - Verify auth cleared

## Files Changed

### New Files
- `src/components/shell/IdentityDock.tsx`
- `src/components/shell/ProfilePanel.tsx`
- `src/components/shell/CommandPalette.tsx`

### Modified Files
- `src/components/shell/Sidebar.tsx`: Replaced UserProfileDropdown with IdentityDock
- `src/components/layouts/DashboardLayout.tsx`: Added CommandPalette

### Unused (Can be removed later)
- `src/components/shell/UserProfileDropdown.tsx` (replaced by IdentityDock + ProfilePanel)

## Next Steps

1. When `/settings/notifications` route is created, update `hasNotificationsRoute` check
2. When `/settings/security` route is created, update `hasSecurityRoute` check
3. When `/inbox` route is created, update `hasInboxRoute` check
4. Consider removing `UserProfileDropdown.tsx` if no longer needed elsewhere
