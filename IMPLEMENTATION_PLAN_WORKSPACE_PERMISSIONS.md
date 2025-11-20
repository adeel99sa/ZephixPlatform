# Workspace Permissions - Step-by-Step Implementation

## Phase 1: Database Schema Changes

### 1.1 Add `ownerId` to Workspace Entity
- Update `workspace.entity.ts` to include `ownerId` column
- Create migration to add `owner_id` column to `workspaces` table
- Add foreign key constraint to `users` table

### 1.2 Create WorkspaceMember Entity
- Create new entity `workspace-member.entity.ts`
- Fields: `id`, `workspaceId`, `userId`, `role`, `invitedBy`, `createdAt`, `updatedAt`
- Role enum: `'workspace_owner' | 'workspace_member' | 'workspace_viewer'`
- Unique constraint on `(workspaceId, userId)`
- Create migration for `workspace_members` table

### 1.3 Make Project workspaceId Required
- Update `project.entity.ts` to make `workspaceId` NOT NULL
- Create migration to:
  - Set existing NULL workspaceIds to a default workspace (or handle migration)
  - Add NOT NULL constraint

## Phase 2: Backend Guards & Services

### 2.1 Create Workspace Guards
- `WorkspaceOwnerGuard` - allows workspace owner or admin
- `WorkspaceMemberGuard` - allows workspace owner, member, or admin
- `WorkspaceViewerGuard` - allows all roles (for read operations)

### 2.2 Update WorkspacesService
- Add `assignOwner()` method (admin only)
- Add `addMember()` method (workspace owner or admin, existing users only)
- Add `removeMember()` method (workspace owner or admin)
- Add `changeMemberRole()` method (workspace owner or admin)
- Add `getMembers()` method
- Add `getOrgUsers()` helper (for member selection)

### 2.3 Update WorkspacesController
- Update `create()` to require `ownerId` in DTO and enforce admin-only
- Add `PATCH /workspaces/:id/owner` endpoint (admin only)
- Add `POST /workspaces/:id/members` endpoint (workspace owner or admin)
- Add `PATCH /workspaces/:id/members/:userId` endpoint (workspace owner or admin)
- Add `DELETE /workspaces/:id/members/:userId` endpoint (workspace owner or admin)
- Add `GET /workspaces/:id/members` endpoint
- Update `delete()` to allow workspace owner or admin

### 2.4 Update WorkspacePolicy
- Update `enforceDelete()` to allow workspace owner or admin
- Add methods for member management permissions

## Phase 3: Frontend Updates

### 3.1 Admin Panel - Workspace Management
- Update `AdminWorkspacesPage.tsx`:
  - Add "Create Workspace" modal with owner selection
  - Show workspace owner in list
  - Add workspace detail page with owner management
- Create `WorkspaceDetailPage.tsx`:
  - Display current owner with "Change Owner" button (admin only)
  - Members table with add/remove/role change
  - "Add Member" button (admin or workspace owner)

### 3.2 Workspace Settings Modal
- Update Members tab:
  - Show "Add Member" button (workspace owner or admin)
  - Use filtered org user list (not email invite)
  - Show "Invite new user" link to `/admin/invite` (admin only)
  - Role change dropdown (workspace owner or admin)
  - Remove member button (workspace owner or admin)

### 3.3 Project Creation
- Update project creation modal:
  - Require workspace selection (cannot be null)
  - Filter workspaces by user's membership
  - Show error if no workspace selected

## Phase 4: Telemetry & Testing

### 4.1 Telemetry Events
- `workspace.member.added`
- `workspace.member.removed`
- `workspace.role.changed`
- `workspace.owner.changed`

### 4.2 Testing
- Test all permission scenarios
- Test admin-only actions
- Test workspace owner actions
- Test member/viewer restrictions

