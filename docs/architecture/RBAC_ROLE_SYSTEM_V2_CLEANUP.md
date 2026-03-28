# RBAC Role System V2 Cleanup

Status: **COMPLETE** — 2026-03-06
Branch: `chore/mcp-and-skills`

---

## Context

The RBAC system had accumulated two types of drift that needed correction:

1. **Platform role reads** — business auth code was reading `user.role` (base DB field) directly, ignoring `user.platformRole` (org-context field set at login).
2. **Module duplication** — two `normalizePlatformRole` implementations existed; multiple admin guard variants co-existed without clear ownership.

This cleanup centralizes role resolution without changing any DB schema, API contracts, or staging behavior.

---

## Role Definitions

### Platform Roles (org-context)

| Role | Source | Description |
|------|--------|-------------|
| `ADMIN` | `UserOrganization.role` at login | Org-wide admin; creates workspaces; manages org |
| `MEMBER` | `UserOrganization.role` at login | Participates in work; can own workspaces |
| `VIEWER` | `UserOrganization.role` at login | Read-only guest (free tier) |

**Resolution precedence in every guard:**
```
user.platformRole ?? user.role
```
`platformRole` is set from `UserOrganization.role` at JWT issuance time.
`user.role` is the base `User.role` DB field — legacy, always `ADMIN` for newly registered users.

### Workspace Roles (workspace-context)

| Role | DB value | V2 alias | Description |
|------|----------|----------|-------------|
| workspace_owner | `workspace_owner` | `workspace_admin` | Full workspace control |
| workspace_member | `workspace_member` | — | Standard member |
| workspace_viewer | `workspace_viewer` | — | Read-only |
| delivery_owner | `delivery_owner` | — | Project-scoped; do not migrate |
| stakeholder | `stakeholder` | — | Project-scoped; do not migrate |

Workspace roles are stored in `workspace_members.role`. The DB constraint uses legacy names.
App-layer code should accept both `workspace_owner` and `workspace_admin` for write-role checks.

---

## Canonical Module: Backend

**Single source of truth:** `zephix-backend/src/common/auth/platform-roles.ts`

Exports:
- `PlatformRole` enum (`ADMIN` | `MEMBER` | `VIEWER`)
- `LEGACY_ROLE_MAPPING` — maps `owner`, `admin`, `pm`, `manager`, `member`, `guest`, `viewer` to canonical
- `normalizePlatformRole(role)` → `PlatformRole` (defaults to VIEWER for unknown)
- `resolvePlatformRoleFromRequestUser(user)` → `PlatformRole` (reads `user.platformRole ?? user.role`)
- `isAdminPlatformRole(role)` / `isMemberPlatformRole(role)` / `isViewerPlatformRole(role)`
- `isAdminRole(role)` — alias for `isAdminPlatformRole`, backward compatible
- `canCreateWorkspaces(role)` — alias for `isAdminPlatformRole`, backward compatible

**Legacy shim:** `zephix-backend/src/shared/enums/platform-roles.enum.ts`

Re-exports everything from the canonical module. The ~45 backend files importing from this path continue to work unchanged. New code should import from `common/auth/platform-roles` directly.

---

## Canonical Module: Frontend

**Single source of truth:** `zephix-frontend/src/utils/roles.ts`

Exports:
- `PlatformRole` type (`'ADMIN' | 'MEMBER' | 'VIEWER'`)
- `normalizePlatformRole(role)` → `PlatformRole`
- `platformRoleFromUser(user, authStoreRole?)` → `PlatformRole` (prefers `user.platformRole ?? user.role`)
- `isAdminRole(role)`, `isAdminUser(user)`, `isPaidUser(user)`, `isGuestUser(user)`

`zephix-frontend/src/types/roles.ts` re-exports from `utils/roles.ts` for backward compatibility.

---

## Admin Guard Consolidation

| Guard | Path | Status | Note |
|-------|------|--------|------|
| `PlatformAdminGuard` | `common/auth/platform-admin.guard.ts` | **Canonical** | Preferred for new code |
| `AdminGuard` | `admin/guards/admin.guard.ts` | Kept | Used by admin module controllers; imports from canonical `platform-roles.ts` |
| `AdminGuard` | `shared/guards/admin.guard.ts` | Legacy | Has AuditService dep; do not add new usages |
| `AdminOnlyGuard` | `shared/guards/admin-only.guard.ts` | Deprecated | `work-item.controller.ts` migrated to `PlatformAdminGuard` |

---

## Drift Fixed

### Backend

| File | Change |
|------|--------|
| `modules/work-items/work-item.controller.ts` | `user.role` → `user.platformRole ?? user.role` for all `blockGuestWrite`, `platformRole`, and `canEditWorkItem` calls |
| `modules/projects/controllers/project-clone.controller.ts` | `user.role` → `user.platformRole ?? user.role` passed to clone service |
| `modules/workspaces/guards/require-workspace-permission.guard.ts` | `user.role` → `user.platformRole ?? user.role` |
| `modules/work-items/work-item.controller.ts` | `AdminOnlyGuard` → `PlatformAdminGuard` |
| `shared/enums/platform-roles.enum.ts` | Converted to re-export shim from `common/auth/platform-roles.ts` |

### Frontend

| File | Change |
|------|--------|
| `hooks/useAuth.ts` | `store.user.role === 'admin'` → `platformRoleFromUser(store.user) === 'ADMIN'` |
| `features/budget/BudgetTab.tsx` | Multi-value raw comparison → `isAdminRole(user?.platformRole ?? user?.role)` |
| `features/onboarding/GuidedSetupPanel.tsx` | Same as BudgetTab.tsx |
| `features/admin/utils/getOrgUsers.ts` | `normalizePlatformRole(user.role)` → `normalizePlatformRole(user.platformRole ?? user.role)` |

---

## What Was Not Changed

- DB schema — no enum removals, no column changes
- API contracts — all response shapes and request DTOs unchanged
- Staging behavior — no new feature flags, no conditional logic changes
- Migrations — untouched
- Archived components — `archived-admin-components/` excluded
- Billing module — out of scope

---

## Proof Artifacts

| File | Contents |
|------|----------|
| `proofs/rbac-v2/00-preflight.txt` | Pre-work git status and guard results |
| `proofs/rbac-v2/00-version.json` | Staging version snapshot before work |
| `proofs/rbac-v2/01-role-drift-inventory.md` | Full inventory with bucket classification |
| `proofs/rbac-v2/03-workspace-role-normalization.md` | Workspace role compat boundary |
| `proofs/rbac-v2/RBAC_V2_CLEANUP_PROOF.md` | Final post-verification proof (written at Step 12) |
