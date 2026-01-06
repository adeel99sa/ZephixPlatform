# Workspace Ownership and Membership

## Overview

This document describes the workspace ownership and membership model implemented in Phases 1-6. Workspaces are owned and managed at the organization level, with role-based access control at both the organization and workspace levels.

## Organization Roles vs Workspace Roles

### Organization Roles
- **owner**: Organization owner (full control)
- **admin**: Organization administrator (full control)
- **pm** / **project_manager**: Project manager (limited admin functions)
- **viewer**: Read-only access

### Workspace Roles
- **workspace_owner**: Full control over workspace, can manage members
- **workspace_member**: Can create projects and content, cannot manage members
- **workspace_viewer**: Read-only access to workspace content

## Ownership Rules

### Workspace Creation
- Only **org admin** or **org owner** can create workspaces
- Creator automatically becomes **workspace_owner** at workspace level
- Workspace creation does NOT auto-create projects, folders, or other content
- New workspace starts with a clean slate (empty state)

### Effective Workspace Role
- **Org owner** or **org admin** → Always have **workspace_owner** effective role for all workspaces in their org
- **Org members/viewers** → Effective role determined by their workspace membership
- If no workspace membership exists → No access (returns null)

### Workspace Member Management
- **Workspace owners** can manage workspace owners, members, and viewers
- **Org admins** have implicit workspace_owner access and can manage all workspaces
- Workspace members and viewers can only be existing org users (no email invites from workspace settings)
- At least one workspace_owner must always exist (cannot remove/demote last owner)

## UI Rules

### Workspace Creation Visibility
- **Create workspace** button only visible to org admin/owner
- Hidden for pm and viewer roles
- Workspace creation form stays simple (name, slug, description)
- Frontend does not attempt to manage membership (backend handles owner assignment)

### Workspace Members UI
- **Admins and workspace owners** see:
  - Add member button
  - Role change controls
  - Remove member controls
- **Members and viewers** see:
  - Member list (read-only)
  - No management controls
- Members grouped by role: Owners, Members, Viewers

### Empty Workspace State
- When workspace has zero projects:
  - Shows empty state with clear title and description
  - Action cluster with:
    - New project from template center
    - New blank project
    - New document (if applicable)
    - New folder (if applicable)
- No default projects or demo folders auto-created
- Gracefully handles 404s from endpoints that don't exist for empty workspaces

## API Summary

### Workspace Membership Endpoints

#### List Members
- **Endpoint**: `GET /api/workspaces/:id/members`
- **Allowed roles**: workspace_owner, workspace_member, workspace_viewer, or org admin
- **Returns**: List of workspace members with roles

#### Add Member
- **Endpoint**: `POST /api/workspaces/:id/members`
- **Allowed roles**: workspace_owner or org admin
- **Payload**: `{ userId: string, role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer' }`
- **Rules**:
  - User must be existing org user
  - No email invites (use `/admin/invite` for new users)

#### Update Member Role
- **Endpoint**: `PATCH /api/workspaces/:id/members/:userId`
- **Allowed roles**: workspace_owner or org admin
- **Payload**: `{ role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer' }`
- **Rules**: Cannot demote last workspace_owner

#### Remove Member
- **Endpoint**: `DELETE /api/workspaces/:id/members/:userId`
- **Allowed roles**: workspace_owner or org admin
- **Rules**: Cannot remove last workspace_owner

## Implementation Details

### Backend

#### Phase 1: Data Model
- Updated `WorkspaceRole` type to use `workspace_owner`, `workspace_member`, `workspace_viewer`
- Migration `1765000000008-UpdateWorkspaceMemberRoles.ts` updates existing data
- Workspace creation creates membership with `workspace_owner` role

#### Phase 2: Effective Role Helper
- `WorkspaceAccessService.getEffectiveWorkspaceRole()` centralizes role derivation
- Maps org roles to workspace roles
- Returns null if no access

#### Phase 3: Membership Endpoints
- All endpoints use `getEffectiveWorkspaceRole()` for permission checks
- Last owner protection in remove/change role operations
- Validates user is existing org member before adding

### Frontend

#### Phase 4: Creation Visibility
- `SidebarWorkspaces` and `Sidebar` check `isAdminRole()` before showing create button
- Uses `@/types/roles` helper functions

#### Phase 5: Members UI
- `MembersTab` groups members by role
- Permission checks based on effective role from backend
- Role dropdowns use new workspace_ prefixed role names

#### Phase 6: Empty State
- `WorkspaceHome` shows empty state when `projects.length === 0`
- Gracefully handles 404s from tasks/updates endpoints
- Action cluster links to template center and project creation

## Migration Notes

When applying the migration `1765000000008-UpdateWorkspaceMemberRoles.ts`:
1. Existing `owner` roles → `workspace_owner`
2. Existing `admin` roles → `workspace_owner`
3. Existing `member` roles → `workspace_member`
4. Existing `viewer` roles → `workspace_viewer`

The migration updates the CHECK constraint to allow new role values.

## Testing Checklist

### Backend
- [ ] Workspace creation creates workspace_owner membership
- [ ] Org admin has workspace_owner effective role for all workspaces
- [ ] Workspace owner can add/remove members
- [ ] Member cannot add members
- [ ] Last workspace_owner cannot be removed/demoted

### Frontend
- [ ] Only org admin/owner sees create workspace button
- [ ] New workspace shows empty state
- [ ] Empty state has action cluster
- [ ] Members UI shows grouped by role
- [ ] Permission checks hide/show controls correctly

## Related Documents

- `docs/PHASE_0_WORKSPACE_BASELINE.md` - Baseline architecture and requirements
- `docs/WORKSPACE_LANDING_PAGE_FIX_PLAN.md` - Original complaint and plan









