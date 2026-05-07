# RBAC Canonical Helpers (Frontend)

This document is the single reference for role/permission checks in the frontend.
Use these helpers instead of raw role string comparisons.

## Helper Hierarchy

| Layer | Canonical helper(s) | Use for |
|---|---|---|
| Platform | `platformRoleFromUser()`, `isPlatformAdmin()` | Org-wide admin/member/viewer decisions, route gating |
| Workspace | `useWorkspacePermissions()`, `useWorkspaceRole()`, `isWorkspaceStoreReadOnlyRole`, `isWorkspaceStoreWriterRole` | Workspace settings; Zustand `workspaceRole` → `isReadOnly`/`canWrite` derivations (`stakeholder` / `workspace_viewer` vs `workspace_owner` / `delivery_owner`) |
| Project | `useProjectPermissions()` | Project-level elevated actions (template/save/duplicate/edit) |

## Decision Tree

1. Need to gate by org-wide role (admin/member/viewer)?
   - Use `platformRoleFromUser(user)` for role resolution.
   - Use `isPlatformAdmin(user)` for admin checks.
2. Need to gate workspace actions?
   - Use `useWorkspacePermissions()` for capability flags in workspace UI.
   - Use `useWorkspaceRole(workspaceId)` when role must be loaded for a specific workspace.
3. Need to gate project actions?
   - Use `useProjectPermissions(project)`; do not compare raw role strings in project UI.

## Canonical Usage Examples

```ts
import { isPlatformAdmin } from "@/utils/access";

const canAccessAdmin = isPlatformAdmin(user);
```

```ts
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";

const { canManageMembers, isReadOnly } = useWorkspacePermissions();
```

```ts
import { useProjectPermissions } from "@/features/projects/hooks/useProjectPermissions";

const { canSaveAsTemplate, canEdit } = useProjectPermissions(project);
```

## Org directory legacy literals (`LEGACY_ORG_ROLE`)

`/admin/users` admin UI rows use lowercase **`owner` | `admin` | …** — **`LEGACY_ORG_ROLE`** lives in **`utils/roles.ts`**. Predicate **`isLegacyOrgDirectoryOwner`** lives in **`utils/access.ts`** (org-owner row UX, distinct from **`isPlatformAdmin`**).

## Lint Enforcement

**Rule A** (`no-restricted-syntax`, **ERROR**) applies under:

- `src/features/admin/**`
- `src/features/administration/**` (Lesson #28: plural directory aligned with Phase 2 migrations; closes silent gap vs singular `admin`)
- `src/features/workspaces/**`
- `src/pages/auth/**`
- `src/App.tsx`

Lint rules enforce canonical usage by:

- banning raw role string equality checks in guarded paths (see above)
- warning on direct role comparisons to encourage helper use (**Rule B**, **WARN**)
- preserving explicit exemptions for canonical helper modules themselves

## `isAdminUser` Deprecation

`isAdminUser` exists for backward compatibility only.
Use `isPlatformAdmin` for platform-level admin checks because it is the canonical helper in `utils/access.ts`.
