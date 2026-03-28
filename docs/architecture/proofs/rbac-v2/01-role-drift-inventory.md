# RBAC V2 — Role Drift Inventory

Generated: 2026-03-06
Branch: chore/mcp-and-skills
Scope: backend `zephix-backend/src`, frontend `zephix-frontend/src`

---

## Bucket Legend

| Bucket | Meaning |
|--------|---------|
| **MUST_FIX** | Direct `user.role` read or unnormalized role comparison in business-auth path |
| **INTENTIONAL_FALLBACK** | `user.platformRole ?? user.role` — correct precedence, keep |
| **NON_BUSINESS** | Seed scripts, migrations, spec fixtures — non-auth business logic |
| **OUT_OF_SCOPE** | Already uses auth context correctly, archived code, or separate concern |

---

## Backend Drift

### MUST_FIX

| File | Line(s) | Pattern | Fix Action |
|------|---------|---------|-----------|
| `modules/work-items/work-item.controller.ts` | 142, 174, 219, 295 | `blockGuestWrite(user.role)` | Replace with `blockGuestWrite(user.platformRole ?? user.role)` |
| `modules/work-items/work-item.controller.ts` | 154 | `platformRole: user.role` | Replace with `platformRole: user.platformRole ?? user.role` |
| `modules/work-items/work-item.controller.ts` | 193, 238 | `canEditWorkItem(..., user.role, ...)` | Replace with `user.platformRole ?? user.role` |
| `modules/projects/controllers/project-clone.controller.ts` | 43 | `user.role` passed as 7th arg to clone service | Replace with `user.platformRole ?? user.role` |
| `modules/workspaces/guards/require-workspace-permission.guard.ts` | 45 | `role: user.role \|\| 'viewer'` | Replace with `role: user.platformRole ?? user.role \|\| 'viewer'` |
| `shared/enums/platform-roles.enum.ts` | whole file | Duplicate `normalizePlatformRole` (defaults to VIEWER) alongside `common/auth/platform-roles.ts` (returns null) | Convert to re-export shim from `common/auth/platform-roles.ts`; update canonical to default-VIEWER |
| `shared/guards/admin.guard.ts` (AdminGuard) | whole file | Imports `normalizePlatformRole` from `shared/enums` not canonical; has AuditService dep | Migrate callers to `PlatformAdminGuard` or `admin/guards/admin.guard.ts`; keep as shim only |
| `shared/guards/admin-only.guard.ts` (AdminOnlyGuard) | whole file | Duplicate of `PlatformAdminGuard`; imports from `shared/enums` | Migrate sole caller (`work-item.controller.ts`) to `PlatformAdminGuard`; deprecate |

### INTENTIONAL_FALLBACK (keep as-is)

| File | Pattern | Reason |
|------|---------|--------|
| `common/http/get-auth-context.ts:15` | `user.platformRole \|\| user.role` | Context boundary — this IS the canonical fallback layer |
| `modules/workspaces/guards/require-org-role.guard.ts:46` | `normalizePlatformRole(user.platformRole ?? user.role)` | Correct precedence already |
| `modules/projects/guards/require-project-workspace-role.guard.ts:79` | `normalizePlatformRole(user.platformRole ?? userRole)` | Correct precedence already |
| `admin/guards/admin.guard.ts:14` | `normalizePlatformRole(user.platformRole ?? user.role)` | Correct, imports from canonical |
| `organizations/guards/organization.guard.ts:131,138` | Multi-claim chain `org.role \|\| user.role` | JWT org-membership claim extraction, not RBAC enforcement |

### NON_BUSINESS (no action)

| File | Pattern | Reason |
|------|---------|--------|
| `scripts/dev-seed.ts` | `workspace_owner`, `normalizePlatformRole(user.role)` | Seed utility; never ships |
| `migrations/*` | `workspace_owner` in SQL | DB schema; must not change |
| `modules/work-items/work-items-bulk.integration.spec.ts` | `workspace_owner` in SQL seed | Integration test fixture |
| `modules/work-items/work-item.service.ts:403,573` | `blockGuestWrite(userRole)` — receives resolved platformRole from controller | Already receives resolved value; no drift here |
| All `*.spec.ts` / `*.integration.spec.ts` | `platformRole: 'ADMIN'` mock objects | Test fixtures, not business auth |

### OUT_OF_SCOPE (no action)

| File | Pattern | Reason |
|------|---------|--------|
| `modules/workspace-access/workspace-access.service.ts` | `workspace_owner` comparisons | Workspace-level role, separate concern (Step 7) |
| `modules/workspace-access/workspace-role-guard.service.ts` | `workspace_owner` comparisons | Workspace-level role, Step 7 |
| `modules/workspaces/entities/workspace.entity.ts` | `workspace_owner \| workspace_admin` type union | Entity shape; Step 7 |
| `modules/template-center/documents/document-lifecycle.controller.ts:115` | `auth.platformRole === 'ADMIN'` | Already uses auth context (no user.role) |
| `shared/controllers/metrics.controller.ts:43` | `auth.platformRole?.toUpperCase()` | Already uses auth context |
| `billing/*` | Various | Billing concern, out of scope per task rules |

---

## Frontend Drift

### MUST_FIX

| File | Line(s) | Pattern | Fix Action |
|------|---------|---------|-----------|
| `hooks/useAuth.ts` | 9–12 | `store.user.role === 'admin'` (4 comparisons) | Replace with `platformRoleFromUser(store.user) === 'ADMIN'` |
| `features/budget/BudgetTab.tsx` | 71–74 | `user?.platformRole === 'ADMIN' \|\| platformRole === 'OWNER' \|\| === 'admin' \|\| === 'owner'` | Replace with `isAdminRole(user?.platformRole ?? user?.role)` |
| `features/onboarding/GuidedSetupPanel.tsx` | 63–66 | Same raw multi-value comparison | Replace with `isAdminRole(user?.platformRole ?? user?.role)` |
| `features/admin/utils/getOrgUsers.ts` | 27 | `normalizePlatformRole(user.role)` — ignores `user.platformRole` | Replace with `normalizePlatformRole(user.platformRole ?? user.role)` |

### INTENTIONAL_FALLBACK (keep as-is)

| File | Pattern | Reason |
|------|---------|--------|
| `hooks/useWorkspacePermissions.ts:57–59` | `user?.platformRole ? normalize(platformRole) : normalize(user?.role)` | Correct explicit fallback |
| `hooks/useOnboardingCheck.ts:52` | `user.platformRole ?? (user as any).role` | Correct fallback |
| `utils/access.ts:33,43,49` | `user.platformRole \|\| user.role` then normalize | Correct fallback pattern |
| `utils/roles.ts:66` | `user?.platformRole ?? user?.role ?? authStoreRole` | `platformRoleFromUser` canonical implementation |
| `features/organizations/useOrgHomeState.ts:32` | `platformRoleFromUser(user)` | Already uses canonical helper |

### NON_BUSINESS (no action)

| File | Pattern | Reason |
|------|---------|--------|
| `services/enterpriseAuth.service.ts:254,319` | `role: response.user.role` | Forwarding raw API response field to store; normalized at use site |
| `stores/workspaceStore.ts`, `state/workspace.store.ts` | `WorkspaceRole` type with `workspace_owner` | Workspace-level role type; Step 7 |
| `features/workspaces/workspace.api.ts:131,144` | `workspace_owner \| workspace_member \| workspace_viewer` type | API contract shape; Step 7 |
| `features/admin/api/adminWorkspaces.api.ts:75` | `role: data?.role \|\| 'workspace_owner'` | API default value, expected |

### OUT_OF_SCOPE (no action)

| File | Pattern | Reason |
|------|---------|--------|
| `archived-admin-components/AdminUsers.tsx` | `user.role` in badge display | Archived component, not in active routing |
| `utils/workspace-access-levels.ts` | `workspace_owner` mappings | Workspace-level concern; Step 7 |
| `utils/accessMapping.ts` | `workspace_owner` mappings | Workspace-level concern; Step 7 |

---

## Summary Counts

| Bucket | Backend | Frontend | Total |
|--------|---------|---------|-------|
| MUST_FIX | 8 items (5 code points + 3 module issues) | 4 items | 12 |
| INTENTIONAL_FALLBACK | 5 | 5 | 10 |
| NON_BUSINESS | 5 | 4 | 9 |
| OUT_OF_SCOPE | 5 | 3 | 8 |

---

## Module Consolidation Plan

### Backend: Two `normalizePlatformRole` implementations

| File | Current behavior | Action |
|------|-----------------|--------|
| `common/auth/platform-roles.ts` | Returns `PlatformRole \| null` for unknown | **Canonical** — update to return `PlatformRole` (default VIEWER) + add helper fns |
| `shared/enums/platform-roles.enum.ts` | Returns `PlatformRole` (default VIEWER) | Convert to **re-export shim** pointing to canonical |

Key: ~45 backend files import from `shared/enums/platform-roles.enum.ts`. Shim approach avoids touching all of them.

### Backend: Four admin guard variants → one

| Guard | Current users | Action |
|-------|--------------|--------|
| `common/auth/platform-admin.guard.ts` (PlatformAdminGuard) | None currently | **Canonical** — this is the target |
| `admin/guards/admin.guard.ts` (AdminGuard) | `admin.controller.ts`, `organization.controller.ts`, `env-proof.controller.ts`, `backup-readiness.controller.ts` | Keep — already imports from canonical `platform-roles.ts` |
| `shared/guards/admin-only.guard.ts` (AdminOnlyGuard) | `work-item.controller.ts` line 451 | Migrate single caller to `PlatformAdminGuard` |
| `shared/guards/admin.guard.ts` (AdminGuard w/ AuditService) | `shared.module.ts` (exported but no direct controller use) | Deprecate export from SharedModule |

### Frontend: Already canonical

`zephix-frontend/src/utils/roles.ts` already has `normalizePlatformRole`, `platformRoleFromUser`, `isAdminRole`.
`zephix-frontend/src/types/roles.ts` re-exports from `utils/roles.ts`.
No new module needed — Step 5/6 only fixes call sites.
