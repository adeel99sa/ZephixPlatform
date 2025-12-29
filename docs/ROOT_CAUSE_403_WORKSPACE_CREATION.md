# Root Cause Analysis: 403 Forbidden on Workspace Creation

## Error Details
- **Status Code**: 403 Forbidden
- **Endpoint**: `POST /api/workspaces`
- **Request ID**: `dd681948-b5d7-449d-97ed-d942e52b1efd`
- **User ID**: `543f652f-9cb9-4b19-a1d3-d976baaa6802`
- **Response Time**: 174ms

## Guard Execution Flow

The request is blocked by **`RequireOrgRoleGuard`** BEFORE reaching the controller method.

### Guards Applied (in order):
1. `JwtAuthGuard` - ✅ Passes (user is authenticated)
2. `WorkspaceMembershipFeatureGuard` - ✅ Passes (bypasses in dev mode)
3. `RequireOrgRoleGuard` - ❌ **FAILS HERE**

## Root Cause: Role Mismatch

### The Problem

**`RequireOrgRoleGuard`** expects roles: `'admin' | 'project_manager' | 'viewer'`

But the **JWT payload** contains roles: `'admin' | 'member' | 'guest'`

### Code Evidence

**1. RequireOrgRoleGuard role hierarchy** (`require-org-role.guard.ts:39-43`):
```typescript
const roleHierarchy = {
  admin: 3,
  project_manager: 2,
  viewer: 1,
};
```

**2. UserJwt type definition** (`workspaces.controller.ts:42-47`):
```typescript
type UserJwt = {
  id: string;
  organizationId: string;
  role: 'admin' | 'member' | 'guest';  // ← Different role names!
  email?: string;
};
```

**3. Guard logic** (`require-org-role.guard.ts:34-51`):
```typescript
// Map user role to org role
const userRole = user.role || 'viewer';
const orgRole = userRole === 'owner' ? 'admin' : userRole;  // ← 'member' stays 'member'

// Role hierarchy: admin > project_manager > viewer
const roleHierarchy = {
  admin: 3,
  project_manager: 2,
  viewer: 1,
};

const userLevel = roleHierarchy[orgRole] || 0;  // ← 'member' → undefined → 0
const requiredLevel = roleHierarchy[requiredRole] || 0;  // ← 'admin' → 3

if (userLevel < requiredLevel) {  // ← 0 < 3 → TRUE → 403!
  throw new ForbiddenException(
    `Required role: ${requiredRole}, current role: ${orgRole}`,
  );
}
```

### What Happens

1. User has role: `'member'` (from JWT)
2. Guard maps: `orgRole = 'member'` (not 'owner', so stays 'member')
3. Guard looks up: `roleHierarchy['member']` → `undefined`
4. Guard sets: `userLevel = undefined || 0` → `0`
5. Required level: `roleHierarchy['admin']` → `3`
6. Check: `0 < 3` → `true` → **403 Forbidden**

## Additional Findings

### Environment Variables
- `NODE_ENV`: **NOT SET** (empty/undefined)
- `ZEPHIX_WS_MEMBERSHIP_V1`: `1` (set correctly)

### Transaction Behavior
The logs show a transaction starting and then **ROLLBACK**, which indicates:
- Guards run BEFORE the controller method
- The guard blocks the request, so the transaction never commits
- This is expected behavior - guards should block before business logic

### User Authentication
- User is authenticated (JWT valid)
- `GET /api/auth/me` returns 200
- `GET /api/workspaces` returns 200
- Only `POST /api/workspaces` fails with 403

## Why This Happens

The role system has **two different role naming conventions**:

1. **JWT/User roles**: `'admin' | 'member' | 'guest'`
2. **Organization roles**: `'admin' | 'project_manager' | 'viewer'`

The guard expects organization roles but receives JWT roles. When a user has role `'member'`, it doesn't map to any organization role, so `userLevel` becomes `0` and fails the check.

## Expected vs Actual Behavior

**Expected**: User with role `'admin'` should be able to create workspaces.

**Actual**:
- If user role is `'member'` → Guard fails (role not in hierarchy)
- If user role is `'guest'` → Guard fails (role not in hierarchy)
- If user role is `'admin'` → Guard should pass, but may fail if JWT doesn't have correct role

## Missing Information

To fully diagnose, we need to know:
1. What role is in the JWT token for user `543f652f-9cb9-4b19-a1d3-d976baaa6802`?
2. What role is in the database for this user?
3. What role is in the `user_organizations` table for this user?

The transaction queries show:
- User lookup: `SELECT ... FROM "users" WHERE "User"."id" = $1`
- UserOrganization lookup: `SELECT ... FROM "user_organizations" WHERE ...`

But we can't see the actual role values from the logs.

## Summary

**Root Cause**: Role mismatch between JWT user roles (`'member'`, `'guest'`) and organization roles expected by the guard (`'admin'`, `'project_manager'`, `'viewer'`). The guard's role hierarchy doesn't include `'member'` or `'guest'`, so users with those roles get `userLevel = 0` and fail the admin requirement check.









