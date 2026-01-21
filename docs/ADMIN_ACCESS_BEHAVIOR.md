# Admin Access Behavior

## Overview

This document describes how admin access is determined and enforced in the Zephix platform.

## Backend Role Resolution

### User Role Sources

1. **UserOrganization.role** (Primary)
   - Organization-specific role stored in `user_organizations` table
   - Values: `'owner'`, `'admin'`, `'pm'`, `'viewer'`
   - Takes precedence if available

2. **User.role** (Fallback)
   - Base user role stored in `users` table
   - Used when no UserOrganization record exists

### Role Normalization

All roles are normalized to `PlatformRole` enum:
- `ADMIN`: Full organization-level authority
- `MEMBER`: Normal user with project management capabilities
- `VIEWER`: Read-only access

### API Endpoints

#### `/auth/login`
- Returns user object with:
  - `role`: Normalized platform role
  - `platformRole`: Explicit platform role enum
  - `permissions`: Object with permission flags
    - `isAdmin`: Boolean
    - `canManageUsers`: Boolean
    - `canViewProjects`: Boolean
    - `canManageResources`: Boolean
    - `canViewAnalytics`: Boolean
  - `organizationId`: Current organization ID

#### `/auth/me`
- Uses same `buildUserResponse()` helper as login
- Returns identical structure to ensure frontend consistency
- Resolves role from UserOrganization if available

## Frontend Role Checking

### User Object Structure

```typescript
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;              // Normalized platform role
  platformRole?: string;      // Explicit enum value
  permissions?: {
    isAdmin?: boolean;
    canManageUsers?: boolean;
    canViewProjects?: boolean;
    canManageResources?: boolean;
    canViewAnalytics?: boolean;
  };
  organizationId?: string | null;
};
```

### Admin Check Helper

`isAdminUser(user)` checks admin status in this order:
1. `user.permissions.isAdmin === true` (most reliable)
2. `user.role === 'admin'` or `'owner'` (case insensitive)
3. `normalizePlatformRole(user.role) === 'ADMIN'`
4. `user.platformRole === 'ADMIN'`

### AdminRoute Guard

- Located: `src/routes/AdminRoute.tsx`
- Behavior:
  - Shows loading spinner while checking auth
  - Redirects to `/login` if not authenticated
  - Redirects to `/403` if user is not admin (NOT `/home`)
  - Renders children if user is admin

### Profile Dropdown Navigation

- "Administration" menu item navigates to `/admin`
- Only visible when `isAdminRole(user.role)` returns true
- Uses React Router `navigate()` for client-side routing

## API Client Error Handling

### 401 Unauthorized
- Redirects to `/login` (authentication required)

### 403 Forbidden
- Does NOT redirect
- Logs warning to console
- Allows component to handle error inline
- Prevents admin pages from being redirected away

## Debug Logging

In development mode, the following logs appear:

### AuthContext
```
[AuthContext] user loaded: { email, role, platformRole, permissions }
```

### AdminRoute
```
[AdminRoute] evaluating user: { email, role, platformRole, permissions }
[AdminRoute] access denied for user: { email, role, platformRole, permissions }
```

## Testing Admin Access

### As Admin User
1. Login as `admin@zephix.ai` or user with `role: 'admin'` in UserOrganization
2. Click "Administration" in profile dropdown
3. Should navigate to `/admin` (Admin Dashboard)
4. Console should show `[AdminRoute] evaluating user` with `isAdmin: true`

### As Non-Admin User
1. Login as `member@zephix.ai` or user with `role: 'pm'` or `'viewer'`
2. Click "Administration" in profile dropdown (if visible)
3. Should redirect to `/403` (Forbidden page)
4. Console should show `[AdminRoute] access denied`

## Common Issues

### User redirected to home instead of /admin
- Check console for `[AdminRoute]` logs
- Verify `user.permissions.isAdmin` is `true`
- Verify `user.role` is normalized correctly
- Check that `/auth/me` returns same structure as login

### User sees /403 but should be admin
- Verify UserOrganization record exists with `role: 'admin'` or `'owner'`
- Check that `isActive: true` on UserOrganization
- Verify `organizationId` matches current organization
- Check backend logs for role resolution

### Administration link not visible
- Verify `isAdminRole(user.role)` returns true in UserProfileDropdown
- Check that user object has `role` or `platformRole` set
- Verify permissions object is populated

## Related Files

- Backend:
  - `src/modules/auth/auth.service.ts` - `buildUserResponse()` helper
  - `src/modules/auth/auth.controller.ts` - `/auth/me` endpoint
  - `src/organizations/entities/user-organization.entity.ts` - Role source

- Frontend:
  - `src/state/AuthContext.tsx` - User state management
  - `src/routes/AdminRoute.tsx` - Admin route guard
  - `src/types/roles.ts` - `isAdminUser()` helper
  - `src/components/shell/UserProfileDropdown.tsx` - Navigation
  - `src/lib/api/client.ts` - Error handling






