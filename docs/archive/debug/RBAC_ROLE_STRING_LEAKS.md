# RBAC Role String Leaks - Fix Required

This document lists all places where role strings are compared directly instead of using the normalized PlatformRole enum or helper functions.

## Critical Fixes (Workspace-related)

### Backend

1. **`zephix-backend/src/modules/workspaces/workspaces.service.ts:47`**
   ```typescript
   if (!featureEnabled || userRole === 'admin' || userRole === 'owner') {
   ```
   **Fix**: Use `normalizePlatformRole(userRole) === PlatformRole.ADMIN`

2. **`zephix-backend/src/modules/workspaces/guards/require-workspace-access.guard.ts:70`**
   ```typescript
   const isAdmin = userRole === 'admin' || userRole === 'owner';
   ```
   **Fix**: Use `isAdminRole(userRole)` from platform-roles.enum

3. **`zephix-backend/src/modules/workspaces/services/workspace-permission.service.ts:50,88`**
   ```typescript
   if (orgRole === 'owner' || orgRole === 'admin') {
   if (user.role === 'owner' || user.role === 'admin') {
   ```
   **Fix**: Use `normalizePlatformRole()` and `PlatformRole.ADMIN`

4. **`zephix-backend/src/modules/workspaces/guards/require-workspace-role.guard.ts:74`**
   ```typescript
   const isAdmin = userRole === 'admin' || userRole === 'owner';
   ```
   **Fix**: Use `isAdminRole(userRole)`

### Frontend

1. **`zephix-frontend/src/features/templates/TemplateDetailPage.tsx:44`**
   ```typescript
   const canEdit = user?.role === 'admin' || user?.role === 'owner';
   ```
   **Fix**: Use `isAdminRole(user?.role)` from types/roles

2. **`zephix-frontend/src/routes/AdminRoute.tsx:24`**
   ```typescript
   const isAdmin = user.role === 'admin' || user.role === 'owner' || user.email === 'admin@zephix.ai';
   ```
   **Fix**: Use `isAdminRole(user.role)`

3. **`zephix-frontend/src/features/workspaces/components/WorkspaceSettingsModal/WorkspaceSettingsModal.tsx:43,46`**
   ```typescript
   const isAdmin = userRole === 'admin' || userRole === 'owner';
   const isWorkspaceOwner = wsRole === 'owner' || ws?.ownerId === user?.id;
   ```
   **Fix**: Use `isAdminRole(userRole)` and check for `workspace_owner` role

## Medium Priority (Other modules)

### Backend

- `zephix-backend/src/shared/guards/admin.guard.ts`
- `zephix-backend/src/modules/templates/controllers/templates.controller.ts`
- `zephix-backend/src/admin/guards/admin.guard.ts`
- `zephix-backend/src/modules/projects/guards/require-project-workspace-role.guard.ts`
- `zephix-backend/src/modules/auth/guards/admin.guard.ts`
- `zephix-backend/src/organizations/services/team-management.service.ts`

### Frontend

- `zephix-frontend/src/features/admin/users/UsersListPage.tsx`
- `zephix-frontend/src/pages/admin/AdminUsersPage.tsx`
- `zephix-frontend/src/pages/dashboard/DashboardPage.tsx`
- `zephix-frontend/src/hooks/useAuth.ts`

## Low Priority (Entity helper methods)

These are acceptable as they work with the database enum values:
- `zephix-backend/src/organizations/entities/user-organization.entity.ts` (helper methods)

## Action Plan

1. **Immediate**: Fix workspace-related guards and services (Critical section)
2. **Short-term**: Fix admin guards and template/project guards
3. **Medium-term**: Fix frontend role checks
4. **Long-term**: Consider migrating UserOrganization enum to PlatformRole values







