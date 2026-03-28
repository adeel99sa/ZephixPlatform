# Zephix RBAC Role System — V1 Stabilization

**Status:** Stabilized
**Phase:** Role system cleanup (not a full redesign)
**Objective:** Fix guard bugs, consolidate admin guards, enforce platformRole precedence

---

## 1. Role Layers

The platform has three independent role layers:

```
Layer 1: Platform Role (org-scoped)   — ADMIN | MEMBER | VIEWER
Layer 2: Legacy Org Role (DB enum)    — owner | admin | pm | viewer
Layer 3: Workspace Role (ws-scoped)   — workspace_admin | workspace_member | workspace_viewer
                                         + project-scoped: delivery_owner | stakeholder
```

### 1.1 Platform Roles

Defined in `src/common/auth/platform-roles.ts` (canonical) and `src/shared/enums/platform-roles.enum.ts` (legacy).

| Role | Description | Paid |
|------|-------------|------|
| `ADMIN` | Creates org, manages workspaces, org-wide admin | Yes |
| `MEMBER` | Participates in work, can own workspaces | Yes |
| `VIEWER` | Read-only guest access | Free |

**Role hierarchy:** ADMIN(3) > MEMBER(2) > VIEWER(1)

### 1.2 Legacy Org Role → Platform Role Mapping

| Legacy DB Role | Platform Role |
|----------------|---------------|
| `owner` | `ADMIN` |
| `admin` | `ADMIN` |
| `pm` / `project_manager` / `member` | `MEMBER` |
| `guest` / `viewer` | `VIEWER` |

### 1.3 Workspace Roles

Stored in `WorkspaceMember.role`. Active only when `ZEPHIX_WS_MEMBERSHIP_V1=1`.

| Role | DB Value | Description |
|------|----------|-------------|
| `workspace_admin` | `workspace_owner` (legacy DB value) | Full workspace control |
| `workspace_member` | `workspace_member` | Can create/edit work |
| `workspace_viewer` | `workspace_viewer` | Read-only |
| `delivery_owner` | `delivery_owner` | Project-scoped only |
| `stakeholder` | `stakeholder` | Project-scoped only |

> **Note:** DB still stores `workspace_owner`. The `normalizeWorkspaceRole()` function in `workspace.entity.ts` maps it to the canonical `workspace_admin` alias. Do not migrate DB values yet.

### 1.4 JWT Payload

```json
{
  "sub": "userId",
  "email": "user@example.com",
  "organizationId": "org-uuid",
  "role": "admin",         // legacy User.role field — always 'admin' for registered users — use as fallback only
  "platformRole": "VIEWER" // org-context role derived from UserOrganization.role at login — USE THIS
}
```

**Resolution rule in all guards:**
```typescript
normalizePlatformRole(user.platformRole ?? user.role)
```

---

## 2. Guard Architecture

### 2.1 Guard Execution Order

```
Request
  └── JwtAuthGuard          — validates JWT, populates req.user
  └── CsrfGuard             — validates XSRF-TOKEN cookie + header for mutating requests
  └── PlanStatusGuard       — blocks writes when plan is inactive
  └── [route-specific guards]
        ├── PlatformAdminGuard       — admin-only routes
        ├── RequireOrgRoleGuard      — org-scoped role minimum (ADMIN/MEMBER/VIEWER)
        ├── RequireWorkspaceRoleGuard      — workspace membership check (flag-gated)
        ├── RequireWorkspaceAccessGuard    — workspace read/write/ownerOrAdmin modes
        ├── RequireProjectWorkspaceRoleGuard — project workspace membership (flag-gated)
        └── EntitlementGuard         — paid feature gating
```

### 2.2 Guard Reference

| Guard | File | Reads | Status |
|-------|------|-------|--------|
| `PlatformAdminGuard` | `common/auth/platform-admin.guard.ts` | `platformRole ?? role` | New — available for new routes only (not yet wired to existing routes, by design) |
| `RequireOrgRoleGuard` | `workspaces/guards/require-org-role.guard.ts` | `platformRole ?? role` | Fixed |
| `RequireWorkspaceRoleGuard` | `workspaces/guards/require-workspace-role.guard.ts` | `platformRole ?? role` | Fixed |
| `RequireProjectWorkspaceRoleGuard` | `projects/guards/require-project-workspace-role.guard.ts` | `platformRole ?? role` | Fixed |
| `AdminGuard` (admin module) | `admin/guards/admin.guard.ts` | `platformRole ?? role` | Fixed (removed email bypass) |
| `AdminGuard` (auth module) | `modules/auth/guards/admin.guard.ts` | `platformRole ?? role` | Fixed |
| `AdminGuard` (shared) | `shared/guards/admin.guard.ts` | `platformRole \|\| role` | Already correct |
| `AdminOnlyGuard` | `shared/guards/admin-only.guard.ts` | `platformRole \|\| role` | Already correct |
| `CsrfGuard` | `auth/guards/csrf.guard.ts` | Cookie + header tokens | Unchanged |
| `PlanStatusGuard` | `billing/entitlements/plan-status.guard.ts` | org plan status | Unchanged |
| `EntitlementGuard` | `billing/entitlements/require-entitlement.guard.ts` | plan feature flags | Unchanged |

---

## 3. Feature Flag: Workspace RBAC

```
ZEPHIX_WS_MEMBERSHIP_V1=1
```

When **OFF** (default): `RequireWorkspaceRoleGuard` and `RequireProjectWorkspaceRoleGuard` bypass all checks for backward compatibility.

When **ON**: Full workspace membership enforcement.

**To activate for staging:** Set `ZEPHIX_WS_MEMBERSHIP_V1=1` in Railway staging environment variables. This is safe after the guard fixes in this stabilization phase are deployed.

Do **not** hard-code this in `feature-flags.config.ts` — it must remain env-driven to allow independent staging and production activation.

---

## 4. Bugs Fixed in V1 Stabilization

### Bug 1 — RequireOrgRoleGuard read wrong field (CRITICAL)
- **Before:** `normalizePlatformRole(user.role)` — always ADMIN for all registered users
- **After:** `normalizePlatformRole(user.platformRole ?? user.role)`

### Bug 2 — RequireWorkspaceRoleGuard read wrong field
- **Before:** `normalizePlatformRole(userRole)` where `userRole = user.role`
- **After:** `normalizePlatformRole(user.platformRole ?? userRole)`

### Bug 3 — RequireProjectWorkspaceRoleGuard admin check used legacy strings
- **Before:** `userRole === 'admin' || userRole === 'owner'`
- **After:** `normalizePlatformRole(user.platformRole ?? userRole) === PlatformRole.ADMIN`

### Bug 4 — admin/guards/admin.guard.ts had email hardcode
- **Before:** `user.email === 'admin@zephix.ai' || ...`
- **After:** Removed. Identity is expressed via role only.

### Bug 5 — modules/auth/guards/admin.guard.ts read legacy string only
- **Before:** `user.role === 'admin' || user.role === 'owner'`
- **After:** `normalizePlatformRole(user.platformRole ?? user.role) === PlatformRole.ADMIN`

### Bug 6 — Frontend useWorkspacePermissions hook read wrong field
- **Before:** `normalizePlatformRole(user.role)`
- **After:** `normalizePlatformRole(user.platformRole ?? user.role)`

---

## 5. Canonical Module

All new guards should import from:
```typescript
import { PlatformRole, normalizePlatformRole, isAdminRole } from 'src/common/auth/platform-roles';
```

The legacy module `src/shared/enums/platform-roles.enum.ts` remains for backward compatibility but new code should not use it.

---

## 6. Permission Matrix

### Platform-Level

| Action | ADMIN | MEMBER | VIEWER |
|--------|:-----:|:------:|:------:|
| Access `/admin/*` | ✅ | ❌ | ❌ |
| Create workspaces | ✅ | ❌ | ❌ |
| Invite users to org | ✅ | ❌ | ❌ |
| Manage org billing | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ❌ |
| Edit tasks | ✅ | ✅ | ❌ |
| View (read) | ✅ | ✅ | ✅ |

### Workspace-Level (when ZEPHIX_WS_MEMBERSHIP_V1=1)

| Action | workspace_admin | workspace_member | workspace_viewer |
|--------|:---------------:|:----------------:|:----------------:|
| Manage workspace settings | ✅ | ❌ | ❌ |
| Invite workspace members | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ❌ |
| Edit work | ✅ | ✅ | ❌ |
| View work | ✅ | ✅ | ✅ |

> Platform ADMIN always gets implicit `workspace_admin` role for all workspaces in their org.
> Platform VIEWER is always forced to `workspace_viewer` regardless of workspace membership row.

### Plan Entitlements

| Feature | FREE | TEAM | ENTERPRISE |
|---------|:----:|:----:|:----------:|
| Capacity engine | ❌ | ✅ | ✅ |
| What-if scenarios | ❌ | ❌ | ✅ |
| Portfolio rollups | ❌ | ✅ | ✅ |
| Max projects | 3 | 20 | Unlimited |
| Storage | 500 MB | 5 GB | 100 GB |

---

## 7. PlatformAdminGuard — Design Intent

`PlatformAdminGuard` (in `src/common/auth/platform-admin.guard.ts`) was created as the canonical guard for **new** admin-only routes going forward. It was intentionally **not** retrofitted to existing routes for the following reasons:

1. **Audit logging would be lost** — `shared/guards/admin.guard.ts` calls `AuditService.logAction('admin.unauthorized')` on every denied request. Replacing it with `PlatformAdminGuard` (which has no audit dependency) would silently drop that audit trail.
2. **Mass replacement = higher risk** — Swapping guards across 10+ controllers in a stabilization phase (not a redesign phase) introduces unnecessary blast radius.
3. **Existing guards were fixed in place** — All three admin guard variants now use `normalizePlatformRole(user.platformRole ?? user.role)`, which is functionally equivalent to `PlatformAdminGuard`. The security fix is applied; a rename is cosmetic.

**When to adopt `PlatformAdminGuard` on existing routes:** During the next RBAC V2 phase, when controllers are reviewed and audit logging is either preserved via middleware or folded into `PlatformAdminGuard` itself.

---

## 8. What Was NOT Changed (Scope Boundary)

- No database schema changes
- No API contract changes
- No legacy role enum removal
- No `WorkspaceMember` DB values changed
- `smoke-key.guard.ts` not modified
- Integration tests with DB dependency not modified
- `ZEPHIX_WS_MEMBERSHIP_V1` not enabled by default (manual Railway action required)
