# Phase 2.2 Inspection Findings

## Summary

This document contains the inspection results for admin pages, soft delete support, custom fields, organization endpoints, role enums, and module patterns. All findings are read-only; no files were modified.

---

## 1. Admin Module Structure

### Files in `src/modules/admin`
**Status:** ❌ NO - No `src/modules/admin` directory exists

### Files in `src/admin/`
**Status:** ✅ YES - Admin module exists at `src/admin/`

**Structure:**
```
src/admin/
├── admin.controller.ts          # @Controller('admin')
├── admin.module.ts
├── admin.service.ts
├── guards/
│   └── admin.guard.ts
├── dto/
│   ├── admin-stats.dto.ts
│   ├── create-audit-log.dto.ts
│   └── pagination.dto.ts
└── modules/
    └── organization/
        └── organization.controller.ts  # @Controller('admin/organization')
```

### Admin Controllers and Routes

| Controller | Path | Routes |
|------------|------|--------|
| `AdminController` | `/admin` | `GET /admin/stats`, `GET /admin/health` |
| `AdminTrashController` | `/admin/trash` | `GET /admin/trash`, `GET /admin/trash/test`, `POST /admin/trash/purge` |
| `OrganizationAdminController` | `/admin/organization` | `GET /admin/organization/overview`, `GET /admin/organization/roles`, `POST /admin/organization/roles` |

### Route Pattern
**Pattern:** `/admin/*` (no `/api` prefix in controller decorator, but API prefix is added by interceptor)

**Note:** The `AdminTrashController` is located in `src/modules/workspaces/` but uses route `/admin/trash`.

---

## 2. Soft Delete Support

### Workspaces Entity
**File:** `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts`

**Soft Delete Support:** ✅ YES

```typescript
@DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
deletedAt?: Date | null;

@Column('uuid', { name: 'deleted_by', nullable: true })
deletedBy?: string | null;
```

**Methods:**
- `softDelete(id, userId)` - Sets `deleted_at` and `deleted_by`
- `restore(id)` - Clears `deleted_at` and `deleted_by`
- `listTrash(organizationId, type)` - Lists soft-deleted items with `.withDeleted()`
- `purge(id)` - Hard delete
- `purgeOldTrash(retentionDays)` - Purge old trash

### Projects Entity
**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

**Soft Delete Support:** ❌ NO

**Findings:**
- No `@DeleteDateColumn` decorator
- No `deletedAt` field in entity
- No `deletedBy` field
- However, `ProjectResponseDto` has `deleted_at` field (line 19-21), suggesting it may exist in DB but not in entity

**Note:** Projects do NOT have soft delete support in the entity definition.

### Existing Soft Delete Endpoints

| Endpoint | Method | Controller | Purpose |
|----------|--------|------------|---------|
| `/admin/trash` | GET | `AdminTrashController` | List trash items (workspaces only currently) |
| `/admin/trash/purge` | POST | `AdminTrashController` | Purge trash (hard delete) |
| `/workspaces/:id` | DELETE | `WorkspacesController` | Soft delete workspace |
| `/workspaces/:id/restore` | POST | `WorkspacesController` | Restore workspace |

**Pattern:**
- Trash listing: `GET /admin/trash?type=workspace`
- Uses `organizationId` from tenant context (not `:orgId` in path)
- Query: `WHERE organization_id = :orgId AND deleted_at IS NOT NULL`

---

## 3. Custom Fields Module

### Custom Fields Module Existence
**Status:** ❌ NO

**Search Results:**
- No `src/modules/custom-fields` directory
- No custom fields entity found
- No custom fields controller found
- No custom fields service found

**Frontend Reference:**
- `zephix-frontend/src/pages/admin/AdminCustomFieldsPage.tsx` exists
- Currently has TODO comments for API integration
- Uses empty array as placeholder

**Conclusion:** Custom fields module needs to be created from scratch.

---

## 4. Organization Endpoints

### Organizations Controller
**File:** `zephix-backend/src/organizations/controllers/organizations.controller.ts`

**Base Path:** `/organizations`

**GET Endpoints:**

| Endpoint | Guards | Purpose |
|----------|--------|---------|
| `GET /organizations` | `JwtAuthGuard` | Get all organizations for current user |
| `GET /organizations/:id` | `JwtAuthGuard, OrganizationGuard` | Get organization details |
| `GET /organizations/admin/users` | `JwtAuthGuard, AdminGuard` | Get all users (admin only) |
| `GET /organizations/users` | `JwtAuthGuard` | Get organization users for workspace member selection |
| `GET /organizations/onboarding/status` | `JwtAuthGuard` | Get onboarding status |
| `GET /organizations/onboarding/progress` | `JwtAuthGuard` | Get onboarding progress |

### Tenant Context Approach
**Uses `:orgId` in path?** ❌ NO

**How it works:**
- Routes use `:id` parameter (e.g., `/organizations/:id`)
- `OrganizationGuard` extracts `organizationId` from:
  - `request.params.organizationId` OR
  - `request.params.id` OR
  - `request.headers['x-org-id']` OR
  - `request.query.organizationId` OR
  - `user.organizationId` (from JWT)
- Guard stores `organizationId` in `request.organizationId`
- Controllers use `req.user.organizationId` or `@CurrentOrganization()` decorator

**Conclusion:** Uses tenant context from JWT/user object, NOT `:orgId` in path pattern.

---

## 5. Actual Role Enums

### Role Enum Values

**Organization Roles (from `RolesGuard`):**
```typescript
const roleHierarchy = {
  owner: 4,
  admin: 3,
  pm: 2,
  viewer: 1,
};
```

**Exact String Values:**
- `'admin'` (lowercase)
- `'pm'` (lowercase)
- `'viewer'` (lowercase)
- `'owner'` (lowercase)

**Usage in Controllers:**
```typescript
@Roles('admin')  // Used in organizations.controller.ts
@RequireOrgRole('admin')  // Used in workspaces.controller.ts
```

**RequireOrgRoleGuard:**
**File:** `zephix-backend/src/modules/workspaces/guards/require-org-role.guard.ts`

```typescript
export const RequireOrgRole = (role: 'admin' | 'project_manager' | 'viewer') => SetMetadata('requiredOrgRole', role);
```

**Note:** `RequireOrgRoleGuard` accepts `'admin' | 'project_manager' | 'viewer'`, but `RolesGuard` uses `'admin' | 'pm' | 'viewer'`. The actual value used in `organizations.controller.ts` is `'admin'` (lowercase).

**Conclusion:** Use `'admin'` (lowercase) for organization admin role.

---

## 6. Module Patterns

### Reference Module: Workspaces

**Status:** ✅ Workspaces module exists and can be used as reference

### Workspaces Module Structure

```
src/modules/workspaces/
├── workspaces.module.ts
├── workspaces.controller.ts
├── workspaces.service.ts
├── workspace.policy.ts
├── rbac.ts
├── entities/
│   ├── workspace.entity.ts
│   └── workspace-member.entity.ts
├── dto/
│   ├── create-workspace.dto.ts
│   ├── update-workspace.dto.ts
│   ├── add-member.dto.ts
│   ├── change-role.dto.ts
│   ├── change-owner.dto.ts
│   └── workspace.response.dto.ts
├── guards/
│   ├── require-org-role.guard.ts
│   ├── require-workspace-access.guard.ts
│   ├── require-workspace-role.guard.ts
│   └── feature-flag.guard.ts
├── decorators/
│   ├── require-workspace-role.decorator.ts
│   └── actor.decorator.ts
├── services/
│   ├── workspace-members.service.ts
│   ├── workspace-access.service.ts
│   ├── workspace-backfill.service.ts
│   └── events.service.ts
└── admin-trash.controller.ts
```

### Entity Audit Fields Pattern (Workspace Entity)

```typescript
@CreateDateColumn({ name: 'created_at' })
createdAt!: Date;

@UpdateDateColumn({ name: 'updated_at' })
updatedAt!: Date;

@DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
deletedAt?: Date | null;

@Column('uuid', { name: 'created_by' })
createdBy!: string;

@Column('uuid', { name: 'deleted_by', nullable: true })
deletedBy?: string | null;
```

**Pattern:**
- `created_at` - `@CreateDateColumn`
- `updated_at` - `@UpdateDateColumn`
- `deleted_at` - `@DeleteDateColumn` (for soft delete)
- `created_by` - `@Column('uuid')`
- `deleted_by` - `@Column('uuid', nullable: true)`

### Controller Pattern (WorkspacesController)

```typescript
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  // Uses @CurrentUser() decorator for user context
  // Uses tenant context from JWT (req.user.organizationId)
  // Uses RequireOrgRoleGuard for admin-only endpoints
  // Uses RequireWorkspaceRoleGuard for workspace-level RBAC
}
```

**Guard Pattern:**
- `@UseGuards(JwtAuthGuard)` - Base guard on controller
- `@UseGuards(RequireOrgRoleGuard)` - For org-level admin operations
- `@RequireOrgRole('admin')` - Decorator for required role
- `@UseGuards(RequireWorkspaceRoleGuard)` - For workspace-level operations
- `@RequireWorkspaceRole('owner', { allowAdminOverride: true })` - Decorator for workspace role

---

## Summary Table

| Component | Status | Path/Notes |
|-----------|--------|------------|
| **Admin Module** | ✅ Exists | `src/admin/` (not `src/modules/admin`) |
| **Admin Route Pattern** | `/admin/*` | No `/api` prefix in decorator (added by interceptor) |
| **Workspaces Soft Delete** | ✅ YES | `deleted_at` column exists |
| **Projects Soft Delete** | ❌ NO | No `deleted_at` in entity |
| **Trash Endpoint** | ✅ Exists | `GET /admin/trash?type=workspace` |
| **Custom Fields Module** | ❌ NO | Needs to be created |
| **Organization Routes** | Uses `:id` | NOT `:orgId`, uses tenant context |
| **Tenant Context** | From JWT | `req.user.organizationId` |
| **Role Enum Value** | `'admin'` | Lowercase string |
| **Reference Module** | `workspaces` | Use as template for new modules |

---

## Key Values for Phase 2.2B

| Value | Found Value | Location |
|-------|-------------|----------|
| **Role enum** | `'admin'` | Section 5, `organizations.controller.ts` line 79 |
| **Route pattern** | `/admin/*` | Section 1, `AdminController` line 9 |
| **Uses :orgId?** | `NO` | Section 4, uses tenant context from JWT |
| **Reference module** | `workspaces` | Section 6, `src/modules/workspaces/` |

---

## Existing Patterns Identified

### 1. Soft Delete Pattern (Workspaces)
- Use `@DeleteDateColumn` for `deleted_at`
- Use `@Column('uuid')` for `deleted_by`
- Use `.withDeleted()` in queries to include soft-deleted records
- Use `.softDelete(id)` to soft delete
- Use `.restore(id)` to restore

### 2. Admin Route Pattern
- Controllers use `@Controller('admin/*')` or `@Controller('admin/trash')`
- Guards: `@UseGuards(JwtAuthGuard, AdminGuard)` or `@UseGuards(JwtAuthGuard)` with policy checks
- Tenant context from `req.user.organizationId`

### 3. Entity Audit Fields
- `created_at` - `@CreateDateColumn`
- `updated_at` - `@UpdateDateColumn`
- `deleted_at` - `@DeleteDateColumn` (optional, for soft delete)
- `created_by` - `@Column('uuid')`
- `deleted_by` - `@Column('uuid', nullable: true)` (optional)

### 4. Controller Guard Pattern
- Base: `@UseGuards(JwtAuthGuard)`
- Org admin: `@UseGuards(RequireOrgRoleGuard)` + `@RequireOrgRole('admin')`
- Workspace role: `@UseGuards(RequireWorkspaceRoleGuard)` + `@RequireWorkspaceRole('owner')`

---

## What Needs Creation vs Wiring

### Needs Creation
1. **Custom Fields Module** - Complete module needs to be created
   - Entity with audit fields (match workspaces pattern)
   - Controller with CRUD endpoints
   - Service with business logic
   - DTOs for create/update
   - Module registration

### Needs Wiring Only
1. **AdminCustomFieldsPage.tsx** - Wire to backend endpoints (after creation)
2. **AdminTrashPage.tsx** - Already wired (completed in Phase 2.1)
3. **TeamManagement** - Already wired (completed in Phase 2.1)

---

## Notes

- Projects entity does NOT have soft delete support. Trash endpoint currently only supports workspaces.
- Custom fields module is completely missing and needs full implementation.
- All admin routes use tenant context from JWT, not `:orgId` in path.
- Role values are lowercase strings: `'admin'`, `'pm'`, `'viewer'`, `'owner'`.
- Workspaces module is the best reference for creating new modules.

