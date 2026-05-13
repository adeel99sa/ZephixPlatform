# RoleGate and `useEffectiveRole` — Week 1 shell contract

This folder defines the **single UI pattern** for role- and capability-based rendering. Weeks 2–4 should import these primitives instead of ad-hoc `user.role` checks (see **Rule A** in `src/utils/RBAC-CANONICAL-HELPERS.md`).

## Canonical capability vocabulary

**Source of truth:** [`docs/architecture/role-taxonomy-mvp.md`](../../../../docs/architecture/role-taxonomy-mvp.md) **§4** (38 tokens). Any `can("…")` / `<RoleGate capability="…">` token used in production UI **must** exist in that table (or be added there in the same PR).

`useEffectiveRole` currently implements a **shell subset** of §4; extend the `EffectiveAction` union and the `switch` in `useEffectiveRole.ts` when you need additional tokens.

## Imports

```tsx
import { RoleGate } from "@/components/access/RoleGate";
import { useEffectiveRole } from "@/utils/access/useEffectiveRole";
```

## Architectural context

| ADR | Relevance |
|-----|-----------|
| [ADR-001](../../../../docs/adrs/ADR-001-workspace-is-the-container.md) | Workspace is the container; workspace store supplies `workspaceRole` for future workspace-scoped tokens. |
| [ADR-002](../../../../docs/adrs/ADR-002-home-and-inbox-are-separate.md) | **Home** (`/home`) and **Inbox** (`/inbox`) are distinct; `inbox.view` is **false** for Platform VIEWER (taxonomy §3.13 / §5.3). |
| [ADR-003](../../../../docs/adrs/ADR-003-administration-in-admin-profile-menu.md) | **Administration** org console is profile-menu only (`admin.view`). Sidebar **Settings** uses `workspace.view` (personal / workspace settings entry at `/settings`). |

## `useEffectiveRole()`

Returns:

- `platformRole`: `'admin' \| 'member' \| 'viewer'` (normalized from `platformRoleFromUser`)
- `platformRoleUpper`: `'ADMIN' \| 'MEMBER' \| 'VIEWER'`
- `workspaceRole`: active workspace role from `useWorkspaceStore`, or `null`
- `can(action)`: boolean — **§4 tokens only** (see `EffectiveAction` in `useEffectiveRole.ts`)
- `is(role)`: `is('admin')`, `is('member')`, `is('viewer')`, or `is('paid')` (Admin or Member — e.g. org-level **My Work** queue, not the same as `task.view` on every surface)

Prefer **`can('…')`** for gates that map 1:1 to taxonomy rows.

## Examples

### 1. Platform role gate (any of the listed roles)

```tsx
<RoleGate roles={["admin", "member"]}>
  <button type="button">Edit something</button>
</RoleGate>
```

### 2. Capability gate (taxonomy token)

```tsx
<RoleGate capability="template.view">
  <NavLink to="/templates">Templates</NavLink>
</RoleGate>
```

### 3. Role + fallback

```tsx
<RoleGate roles={["admin"]} fallback={<span className="text-slate-400">Admins only</span>}>
  <OrgDangerZone />
</RoleGate>
```

### 4. Using the hook in logic-heavy components

```tsx
const { can, is } = useEffectiveRole();
if (!can("dashboard.view.published")) return null;
```

## Adding a new capability

1. Add the token to **`docs/architecture/role-taxonomy-mvp.md` §4** (if not already there).
2. Extend `EffectiveAction` in `src/utils/access/useEffectiveRole.ts`.
3. Implement the row in the `can()` `switch` using **`@/utils/access`** helpers — **do not** compare raw backend role strings.
4. Gate UI with `<RoleGate capability="your.token">` or `can('your.token')`.
5. Add or extend a Vitest test next to the surface you changed.

## Production note

Backend RBAC remains authoritative. Frontend gates prevent **wrong affordances**; they are not a security boundary.
