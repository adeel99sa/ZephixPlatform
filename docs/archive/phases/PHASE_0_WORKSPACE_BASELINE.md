# Phase 0: Workspace Ownership & Membership - Baseline

**Date**: 2025-12-02
**Purpose**: Document current state before implementing new workspace ownership model

---

## Backend Recon

### 1. Workspace Entity
**File**: `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts`

**Current Structure**:
- `id` (uuid, PK)
- `organizationId` (uuid, FK to organizations)
- `name` (varchar 100)
- `slug` (varchar 50, nullable)
- `description` (text, nullable)
- `isPrivate` (boolean, default false)
- `createdBy` (uuid, FK to users)
- `ownerId` (uuid, nullable, FK to users) - **Legacy field, may be redundant with membership**
- `deletedAt` (timestamp, nullable) - Soft delete
- `deletedBy` (uuid, nullable)
- `permissionsConfig` (jsonb, nullable)
- `defaultMethodology` (varchar 50, nullable)

**Relations**:
- `@OneToMany(() => WorkspaceMember)` - `members` array

**WorkspaceRole Type**:
```typescript
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
```
- Note: Current roles include `'admin'` but target model uses `'workspace_owner'`, `'workspace_member'`, `'workspace_viewer'`

---

### 2. WorkspaceMember Entity
**File**: `zephix-backend/src/modules/workspaces/entities/workspace-member.entity.ts`

**Current Structure**:
- `id` (uuid, PK)
- `workspaceId` (uuid, FK to workspaces)
- `userId` (uuid, FK to users)
- `role` (text) - Uses `WorkspaceRole` type: `'owner' | 'admin' | 'member' | 'viewer'`
- `createdBy` (uuid, nullable)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `updatedBy` (uuid, nullable)

**Missing Fields** (per target model):
- ❌ `organizationId` - Not stored in membership table (derived from workspace)
- ✅ All other required fields exist

**Indexes**:
- Unique: `(workspaceId, userId)`
- Indexes on: `workspaceId`, `userId`, `role`

**Migration**: `1765000000002-CreateWorkspaceMembers.ts` - Table exists

---

### 3. Workspace Creation Flow

**File**: `zephix-backend/src/modules/workspaces/workspaces.service.ts`

**Method**: `createWithOwner()` (lines 152-235)

**Current Behavior**:
1. Validates owner user exists
2. Validates owner is active member of organization (via `user_organizations`)
3. Creates workspace entity
4. Creates `WorkspaceMember` row with:
   - `workspaceId` = new workspace id
   - `userId` = `input.ownerId`
   - `role` = `'owner'` ✅ **Correct**
   - `createdBy` = `input.createdBy` ✅ **Correct**

**Controller**: `workspaces.controller.ts:83-144`
- `POST /api/workspaces`
- Guarded by: `@RequireOrgRole('admin')` ✅ **Correct**
- Uses `createWithOwner()` method

**Issues**:
- ✅ Creates membership row correctly
- ⚠️ Role is `'owner'` but target model wants `'workspace_owner'`
- ⚠️ No auto-content creation (good, but need to verify)

---

### 4. Workspace Membership Service

**File**: `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts`

**Current Methods**:
- `list()` - Lists members for a workspace
- `addExisting()` - Adds existing org user to workspace
- `changeRole()` - Changes member role
- `remove()` - Removes member
- `changeOwner()` - Changes workspace owner

**Current Permission Logic**:
- Uses `canManageWsMembers()` from `rbac.ts`
- Checks `actor.orgRole` and `actor.wsRole`
- Validates user belongs to org before adding

**Issues**:
- ⚠️ Role values use `'owner'`, `'member'`, `'viewer'` (not `'workspace_owner'`, etc.)
- ✅ Validates user is in org before adding
- ✅ No email invites (correct)

---

### 5. Workspace Access Service

**File**: `zephix-backend/src/modules/workspaces/services/workspace-access.service.ts`

**Current Methods**:
- `getAccessibleWorkspaceIds()` - Returns workspace IDs user can access
- `canAccessWorkspace()` - Checks if user can access specific workspace

**Current Logic**:
- If feature flag disabled OR user is admin/owner → can access all workspaces
- Otherwise → filters by workspace membership

**Issues**:
- ⚠️ No "effective workspace role" helper that maps org role + membership to workspace role
- ⚠️ Admin access is implicit but not explicitly modeled as `workspace_owner` role

---

### 6. Guards

**Location**: `zephix-backend/src/modules/workspaces/guards/`

**Existing Guards**:
1. `RequireOrgRoleGuard` - Checks org role (admin, owner, pm, viewer)
2. `WorkspaceMembershipFeatureGuard` - Feature flag check
3. `RequireWorkspaceAccessGuard` - Checks workspace access
4. `RequireWorkspaceRoleGuard` - Checks workspace role
5. `RequireWorkspacePermissionGuard` - Checks workspace permissions

**Current Usage**:
- Workspace creation: `@RequireOrgRole('admin')` ✅
- Workspace updates: `@RequireWorkspacePermission('edit_workspace_settings')`
- Membership endpoints: Various guards

---

### 7. Org Roles

**File**: `zephix-backend/src/organizations/entities/user-organization.entity.ts`

**Org Role Enum**:
```typescript
role: 'owner' | 'admin' | 'pm' | 'viewer'
```

**Current Org Roles**:
- `owner` - Organization owner
- `admin` - Organization admin
- `pm` - Project manager
- `viewer` - Viewer

**Target Model Mapping**:
- Org `admin` → Workspace `workspace_owner` (implicit)
- Org `owner` → Workspace `workspace_owner` (implicit)
- Workspace membership → Explicit `workspace_owner`, `workspace_member`, `workspace_viewer`

---

## Frontend Recon

### 1. Workspace Creation

**File**: `zephix-frontend/src/features/workspaces/WorkspaceCreateModal.tsx`

**Current Behavior**:
- Simple form: name, slug (optional)
- Sends `ownerId: user.id` ✅
- No membership management in UI ✅
- **Issue**: No check for org admin role before showing button

**File**: `zephix-frontend/src/features/admin/workspaces/CreateWorkspaceModal.tsx`
- More complex form with owner selection
- Allows selecting members at creation time
- **Issue**: This may conflict with target model (members should be added after creation)

---

### 2. Workspace List

**File**: `zephix-frontend/src/features/workspaces/SidebarWorkspaces.tsx`

**Current Behavior**:
- Calls `listWorkspaces()` → `GET /api/workspaces`
- Displays all returned workspaces
- Shows "Add new workspace" button for admins
- **Issue**: No filtering for system workspaces

---

### 3. Workspace Settings

**File**: `zephix-frontend/src/features/workspaces/settings/WorkspaceSettingsPage.tsx`

**Current Structure**:
- Tabs: General, Members, Permissions, Activity
- Members tab exists: `tabs/MembersTab.tsx`

**File**: `zephix-frontend/src/features/workspaces/components/WorkspaceSettingsModal/WorkspaceSettingsModal.tsx`

**Current Behavior**:
- Shows members list
- Has "Add member" functionality
- Uses `listOrgUsers()` to show org users
- Role selection: `'member' | 'viewer'` (no `'owner'` option in UI)
- **Issues**:
  - Role values don't match target model (`workspace_owner`, `workspace_member`, `workspace_viewer`)
  - May allow adding members at creation (needs verification)

---

## API Routes

### Current Workspace Membership Endpoints

**File**: `zephix-backend/src/modules/workspaces/workspaces.controller.ts`

**Existing Endpoints**:
- `GET /api/workspaces/:id/members` - List members (line 210)
- `POST /api/workspaces/:id/members` - Add member (line 218)
- `PATCH /api/workspaces/:id/members/:userId` - Update role (line 235)
- `DELETE /api/workspaces/:id/members/:userId` - Remove member (line 254)
- `POST /api/workspaces/:id/change-owner` - Change owner (line 268)

**Guards**:
- All use `@RequireWorkspacePermissionGuard`
- Various permission checks

**Issues**:
- ⚠️ Role values in DTOs may not match target model
- ✅ Endpoints exist and are guarded

---

## Current State Summary

### ✅ What Works
1. Workspace entity exists with all required fields
2. WorkspaceMember entity exists with required fields (except `organizationId` which is derived)
3. Workspace creation creates membership row with `role='owner'`
4. Only org admins can create workspaces (guarded)
5. Membership service validates user is in org before adding
6. No email invites in workspace membership flow
7. Frontend has workspace settings and members UI

### ⚠️ What Needs Change

1. **Role Naming**:
   - Current: `'owner'`, `'member'`, `'viewer'`
   - Target: `'workspace_owner'`, `'workspace_member'`, `'workspace_viewer'`
   - Migration needed to update existing data

2. **Effective Workspace Role Helper**:
   - Missing: Helper that maps org role + membership → effective workspace role
   - Needed: `getEffectiveWorkspaceRole(userId, orgRole, workspaceId)`

3. **Implicit Admin Access**:
   - Current: Admins see all workspaces but don't have explicit membership
   - Target: Admins should have implicit `workspace_owner` role (via helper)

4. **Workspace Creation**:
   - Current: Creates membership with `role='owner'`
   - Target: Should create with `role='workspace_owner'`

5. **Frontend Role Checks**:
   - Current: May not check org admin role before showing workspace creation
   - Target: Only org admins see workspace creation button

6. **Empty State**:
   - Current: `WorkspaceHome.tsx` shows empty modules with 404s
   - Target: Clean empty state with CTAs to Template Center

---

## Migration Path

### Database Changes Needed

1. **Update WorkspaceRole enum**:
   - Add migration to update `workspace_members.role` values:
     - `'owner'` → `'workspace_owner'`
     - `'member'` → `'workspace_member'`
     - `'viewer'` → `'workspace_viewer'`
     - `'admin'` → `'workspace_owner'` (if exists)

2. **Update TypeScript types**:
   - Change `WorkspaceRole` type definition
   - Update all references in code

3. **No schema changes needed**:
   - `workspace_members` table structure is correct
   - `workspaces` table structure is correct

---

## Files to Modify (Phase 1+)

### Backend
1. `workspace.entity.ts` - Update `WorkspaceRole` type
2. `workspace-member.entity.ts` - Update role references
3. `workspaces.service.ts` - Update `createWithOwner()` to use `'workspace_owner'`
4. `workspace-members.service.ts` - Update role handling
5. `workspace-access.service.ts` - Add `getEffectiveWorkspaceRole()` helper
6. Migration: Update existing role values

### Frontend
1. `WorkspaceCreateModal.tsx` - Add org admin role check
2. `SidebarWorkspaces.tsx` - Filter system workspaces (if needed)
3. `WorkspaceSettingsModal.tsx` - Update role values
4. `MembersTab.tsx` - Update role values and UI
5. `WorkspaceHome.tsx` - Implement empty state

---

## Next Steps

**Phase 1**: Backend data model and membership write path
- Update role enum to use `workspace_owner`, `workspace_member`, `workspace_viewer`
- Ensure workspace creation assigns creator as `workspace_owner`
- Create migration to update existing data

**Phase 2**: Backend permission model and helpers
- Create `getEffectiveWorkspaceRole()` helper
- Map org admin/owner → `workspace_owner` implicitly

**Phase 3**: Backend workspace membership endpoints and guards
- Update endpoints to use new role names
- Enforce permissions correctly

**Phase 4-8**: Frontend and testing (as specified in plan)

---

**Status**: ✅ Baseline Complete - Ready for Phase 1

---

## Phase 1 Implementation Notes

**Date**: 2025-12-02

### Changes Made

1. **Updated WorkspaceRole Type** (`workspace.entity.ts`):
   - Changed from: `'owner' | 'admin' | 'member' | 'viewer'`
   - Changed to: `'workspace_owner' | 'workspace_member' | 'workspace_viewer'`

2. **Created Migration** (`1765000000008-UpdateWorkspaceMemberRoles.ts`):
   - Updates existing `workspace_members.role` values:
     - `'owner'` → `'workspace_owner'`
     - `'admin'` → `'workspace_owner'` (if exists)
     - `'member'` → `'workspace_member'`
     - `'viewer'` → `'workspace_viewer'`
   - Updates CHECK constraint to allow new role values

3. **Updated Workspace Creation** (`workspaces.service.ts`):
   - Changed `role: 'owner'` to `role: 'workspace_owner'` in `createWithOwner()`

4. **Updated Workspace Module Files**:
   - `dto/add-member.dto.ts` - Updated enum values
   - `dto/change-role.dto.ts` - Updated enum values
   - `services/workspace-members.service.ts` - Updated role comparisons
   - `services/workspace-access.service.ts` - Updated role returns
   - `services/workspace-permission.service.ts` - Updated role checks and defaults
   - `services/workspace-backfill.service.ts` - Updated role assignments
   - `rbac.ts` - Updated role comparisons
   - `guards/require-workspace-access.guard.ts` - Updated role checks
   - `projects/projects.controller.ts` - Updated `@RequireWorkspaceRole` decorators

### Safety Checks

- ✅ Backend build passes (no workspace-related TypeScript errors)
- ✅ Migration compiles
- ✅ Workspace creation creates membership with `workspace_owner` role
- ⚠️ Note: Some cross-module references may need updates in Phase 2 when effective role helper is created

### Next Steps

- Phase 2: Create `getEffectiveWorkspaceRole()` helper that properly maps org roles to workspace roles

