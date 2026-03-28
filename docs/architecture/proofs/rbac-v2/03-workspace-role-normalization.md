# RBAC V2 — Workspace Role Normalization

Generated: 2026-03-06

---

## Summary

The DB `workspace_members.role` column stores the legacy value `workspace_owner`.
At the app layer, `workspace_admin` is the canonical V2 alias.

Both names are equivalent and refer to the same privilege level.
No DB migration is needed or planned: the DB enum constraint is authoritative and must not change.

---

## Compatibility Rule

| Layer | Allowed values | Rule |
|-------|----------------|------|
| DB reads (TypeORM queries) | `workspace_owner` | Use as-is; comes from DB enum |
| DB writes (inserts, updates) | `workspace_owner` | Must write legacy value (DB constraint) |
| App-layer comparisons | Both `workspace_owner` and `workspace_admin` | Accept both; use `normalizeWorkspaceRole()` before comparing where possible |
| API responses to clients | Either (pass through DB value) | Clients must accept both |

---

## normalizeWorkspaceRole

Defined in: `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts`

```typescript
export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole | null {
  if (!role) return null;
  if (role === 'workspace_owner') return 'workspace_admin';
  // validates others...
}
```

Maps `workspace_owner` → `workspace_admin`. All other valid roles pass through unchanged.

---

## WorkspaceRole Type

```typescript
export type WorkspaceRole =
  | 'workspace_owner'  // Legacy DB value — still in DB
  | 'workspace_admin'  // Canonical V2 alias (same privileges)
  | 'workspace_member'
  | 'workspace_viewer'
  | 'delivery_owner'   // Project-scoped, do not migrate
  | 'stakeholder';     // Project-scoped, do not migrate
```

---

## Changes Made in RBAC V2

### `workspace-role-guard.service.ts`

- `writeRoles` now includes both `workspace_owner` and `workspace_admin`:
  ```typescript
  const writeRoles: WorkspaceRole[] = ['delivery_owner', 'workspace_owner', 'workspace_admin'];
  ```
  This ensures that if a `workspace_admin` value ever appears (e.g., from a future normalizing migration), write access is not accidentally denied.

### `workspace-access.service.ts`

- Role rank table already handles both:
  ```typescript
  workspace_owner: 4,
  workspace_admin: 4, // canonical alias for workspace_owner — same privilege level
  ```

---

## What Was NOT Changed

- DB schema — `workspace_members.role` constraint remains `workspace_owner | workspace_member | workspace_viewer`
- All DB writes still use `workspace_owner`
- Guards/services that compare `=== 'workspace_owner'` were not bulk-renamed (risk too high; they read from DB which always returns `workspace_owner`)
- DTOs (`change-role.dto.ts`, `add-member.dto.ts`) still validate against `workspace_owner` only — accepting `workspace_admin` from external clients requires a deliberate API version decision

---

## Frontend

The frontend `WorkspaceRole` type in both `state/workspace.store.ts` and `stores/workspaceStore.ts` uses `workspace_owner`. Since the API continues to return `workspace_owner` from the DB, this is correct and requires no change.
