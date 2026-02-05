# Role-Based Access Control (RBAC)

> This is a canonical document. For the latest guidance, refer to this file.

---

## Overview

Zephix implements a multi-tenant RBAC system with organization-level and workspace-level roles.

## Platform Roles

| Role | Code | Description |
|------|------|-------------|
| ADMIN | `ADMIN` | Full platform access, can manage all workspaces |
| MEMBER | `MEMBER` | Standard user, access scoped to assigned workspaces |
| VIEWER | `VIEWER` | Read-only access (Guest role) |

**Important**: `platformRole` is the source of truth. Normalize once, reuse helpers.

---

## Organization Roles

Organization membership roles in `user_organizations`:

| Role | Permissions |
|------|------------|
| `owner` | Full org access, billing, settings |
| `admin` | Manage users, workspaces |
| `pm` | Project management privileges |
| `viewer` | Read-only access |

---

## Workspace Roles

Workspace membership roles in `workspace_members`:

| Role | Permissions |
|------|------------|
| `owner` | Full workspace control |
| `admin` | Manage workspace settings and members |
| `member` | Create/edit projects and tasks |
| `viewer` | Read-only access |

---

## Access Control Rules

### Tenancy Isolation

1. **organizationId is mandatory** for all data access
2. **MEMBER and VIEWER** responses filtered to `accessibleWorkspaceIds` for cross-workspace aggregates
3. **Prefer platformRole** over legacy role field

### Query Scoping

```typescript
// All queries must be org-scoped
findAll(organizationId: string, options?: FindOptions)

// Workspace-scoped queries add workspaceId
findByWorkspace(organizationId: string, workspaceId: string)
```

### Guard Implementation

```typescript
// Admin-only routes
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('admin/users')
async getUsers() { ... }

// Tenant-scoped routes
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('projects')
async getProjects() { ... }
```

---

## Permission Matrix

### Admin Console Access

| Route | ADMIN | MEMBER | VIEWER |
|-------|-------|--------|--------|
| `/admin/overview` | ✅ | ❌ | ❌ |
| `/admin/users` | ✅ | ❌ | ❌ |
| `/admin/workspaces` | ✅ | ❌ | ❌ |
| `/admin/audit` | ✅ | ❌ | ❌ |

### Workspace Operations

| Operation | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| View workspace | ✅ | ✅ | ✅ | ✅ |
| Edit settings | ✅ | ✅ | ❌ | ❌ |
| Add members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |

### Project Operations

| Operation | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| View project | ✅ | ✅ | ✅ | ✅ |
| Create project | ✅ | ✅ | ✅ | ❌ |
| Edit project | ✅ | ✅ | ✅ | ❌ |
| Delete project | ✅ | ✅ | ❌ | ❌ |

---

## Error Handling

### Structured Exceptions

Use structured exceptions for auth errors. No throwing raw `Error` for request validation.

```typescript
// Good
throw new ForbiddenException('User lacks workspace access');

// Bad
throw new Error('Access denied');
```

### Error Responses

| Code | Meaning |
|------|---------|
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found (or hidden due to permissions) |

---

## Session Management

- Refresh and sessions stay server-tracked
- No stateless refresh fallback
- Access tokens are short-lived (15min default)
- Refresh tokens are single-use

---

## Frontend Role Checks

```typescript
// Check admin access
const isAdmin = user?.platformRole === 'ADMIN';

// Check workspace access
const hasWorkspaceAccess = (workspaceId: string) => {
  return accessibleWorkspaceIds.includes(workspaceId);
};

// Render admin-only UI
{isAdmin && <AdminLink />}
```

---

## Auditing

All permission-sensitive operations are logged:

```typescript
// Audit log entry
{
  organizationId: string;
  userId: string;
  action: 'ROLE_CHANGE' | 'ACCESS_DENIED' | 'PERMISSION_GRANT';
  details: Record<string, any>;
  timestamp: Date;
}
```

---

## Source Notes

This document was created by merging the following sources:

- `docs/RBAC_IMPLEMENTATION_COMPLETE.md` (commit: see git log)
- `docs/RBAC_AND_WORKSPACE_BEHAVIOR.md` (commit: see git log)
- `docs/ADMIN_ACCESS_BEHAVIOR.md` (commit: see git log)
- `docs/ENTERPRISE_CONSTITUTION_SUMMARY.md` (commit: see git log)

*Merged on: 2026-02-04*
