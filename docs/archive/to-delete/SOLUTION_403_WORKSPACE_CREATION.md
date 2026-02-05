# ARCHIVED
# Reason: Historical artifact

# Solution: Fix 403 Forbidden on Workspace Creation

## Problem Summary
Role mismatch between JWT user roles (`'member'`, `'guest'`) and organization roles expected by the guard (`'admin'`, `'project_manager'`, `'viewer'`).

## Role System Analysis

There are **three different role naming conventions** in the codebase:

1. **JWT/User roles** (from User entity): `'admin' | 'member' | 'guest'`
2. **UserOrganization roles** (from user_organizations table): `'owner' | 'admin' | 'pm' | 'viewer'`
3. **Guard expected roles**: `'admin' | 'project_manager' | 'viewer'`

## Solution Options

### Option 1: Add Role Mapping in Guard (Recommended - Simplest)

**File**: `zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts`

**Change**: Add role mapping logic to convert JWT/UserOrganization roles to guard's expected roles.

**Mapping**:
- `'member'` → `'project_manager'`
- `'guest'` → `'viewer'`
- `'pm'` → `'project_manager'`
- `'owner'` → `'admin'`
- `'admin'` → `'admin'` (no change)

**Pros**:
- Minimal code change
- Works with existing JWT structure
- No database queries needed
- Fast (synchronous)

**Cons**:
- Doesn't use UserOrganization role (which might be more accurate)

---

### Option 2: Use UserOrganization Role from Database (More Accurate)

**File**: `zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts`

**Change**: Make guard async, inject UserOrganization repository, query the database for the user's organization role.

**Pros**:
- Uses the actual organization role from database
- More accurate (reflects current org membership)
- Handles role changes without re-login

**Cons**:
- Requires database query (slower)
- More complex (async guard)
- Requires dependency injection

---

### Option 3: Fix JWT to Include Organization Role (Long-term)

**Files**:
- `zephix-backend/src/modules/auth/auth.service.ts` (generateToken method)
- `zephix-backend/src/modules/auth/strategies/jwt.strategy.ts` (validate method)

**Change**: Include UserOrganization role in JWT payload instead of User entity role.

**Pros**:
- Single source of truth
- No guard changes needed
- More accurate role representation

**Cons**:
- Requires JWT regeneration for all users
- More complex (need to query UserOrganization during login)
- Breaking change if JWT structure changes

---

## Recommended Solution: Option 1 (Role Mapping)

### Implementation

Update `require-org-role.guard.ts`:

```typescript
canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const user = request.user;

  if (!user) {
    throw new ForbiddenException('Authentication required');
  }

  const requiredRole = this.reflector.get<string>(
    'requiredOrgRole',
    context.getHandler(),
  );

  if (!requiredRole) {
    return true; // No role requirement
  }

  // Map JWT/User roles to organization roles
  const userRole = user.role || 'viewer';

  // Role mapping: JWT roles → Organization roles
  const roleMapping: Record<string, string> = {
    'owner': 'admin',
    'admin': 'admin',
    'member': 'project_manager',  // ← ADD THIS
    'pm': 'project_manager',      // ← ADD THIS
    'guest': 'viewer',            // ← ADD THIS
    'viewer': 'viewer',
  };

  const orgRole = roleMapping[userRole] || 'viewer';

  // Role hierarchy: admin > project_manager > viewer
  const roleHierarchy = {
    admin: 3,
    project_manager: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[orgRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  if (userLevel < requiredLevel) {
    throw new ForbiddenException(
      `Required role: ${requiredRole}, current role: ${orgRole}`,
    );
  }

  return true;
}
```

### What This Fixes

1. **`'member'` → `'project_manager'`**: Users with `'member'` role can now access `project_manager` level endpoints
2. **`'guest'` → `'viewer'`**: Users with `'guest'` role can now access `viewer` level endpoints
3. **`'pm'` → `'project_manager'`**: Handles UserOrganization `'pm'` role if it appears in JWT
4. **`'owner'` → `'admin'`**: Already handled, but explicit in mapping

### Testing After Fix

1. User with role `'member'` should be able to access `project_manager` level endpoints
2. User with role `'admin'` should be able to access `admin` level endpoints (workspace creation)
3. User with role `'guest'` should only access `viewer` level endpoints

---

## Alternative: Quick Dev Bypass (Temporary)

If you need an immediate workaround for development, you can bypass the role check in dev mode:

```typescript
canActivate(context: ExecutionContext): boolean {
  // Bypass in development
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  // ... rest of guard logic
}
```

**⚠️ Warning**: This removes ALL role checks in development. Only use for quick testing, not production.

---

## Recommended Action

**Implement Option 1** (Role Mapping) - it's the cleanest, fastest solution that maintains security while fixing the role mismatch.










