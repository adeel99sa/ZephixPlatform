# RoleGate and `useEffectiveRole` — Week 1 shell contract

This folder defines the **single UI pattern** for role- and capability-based rendering. Weeks 2–4 should import these primitives instead of ad-hoc `user.role` checks (see **Rule A** in `src/utils/RBAC-CANONICAL-HELPERS.md`).

## Imports

```tsx
import { RoleGate } from "@/components/access/RoleGate";
import { useEffectiveRole } from "@/utils/access/useEffectiveRole";
```

## Architectural context

| ADR | Relevance |
|-----|-----------|
| [ADR-001](../../../../docs/adrs/ADR-001-workspace-is-the-container.md) | Workspace-scoped data and `workspaceRole` from the workspace store inform capabilities like `workspace.manage`. |
| [ADR-002](../../../../docs/adrs/ADR-002-home-and-inbox-are-separate.md) | **Home** (`/home`) and **Inbox** (`/inbox`) are distinct surfaces; Viewer does not get Inbox in the shell. |
| [ADR-003](../../../../docs/adrs/ADR-003-administration-in-admin-profile-menu.md) | **Administration** (`/administration`) is only in the **profile menu** for platform admins — never in the left rail. Sidebar **Settings** links to `/settings` (personal / org prefs), not the admin console. |

## `useEffectiveRole()`

Returns:

- `platformRole`: `'admin' \| 'member' \| 'viewer'` (normalized from `platformRoleFromUser`)
- `platformRoleUpper`: `'ADMIN' \| 'MEMBER' \| 'VIEWER'` (canonical enum)
- `workspaceRole`: active workspace role from `useWorkspaceStore`, or `null`
- `can(action)`: boolean — see capability table in `useEffectiveRole.ts`
- `is(role)`: `is('admin')`, `is('member')`, `is('viewer')`, or `is('paid')` (Admin or Member)

Prefer **`can('…')`** for nav and shell so behavior stays centralized.

## Examples

### 1. Platform role gate (any of the listed roles)

```tsx
<RoleGate roles={["admin", "member"]}>
  <button type="button">Edit something</button>
</RoleGate>
```

### 2. Capability gate

```tsx
<RoleGate capability="templates.nav">
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
if (!can("dashboards.nav")) return null;
```

## Adding a new capability

1. Open `src/utils/access/useEffectiveRole.ts`.
2. Extend the `EffectiveAction` union with a new string token (e.g. `'reports.export'`).
3. Implement the rule in the `can()` `switch`, using **`@/utils/access`** helpers (`isPlatformAdmin`, `canManageTemplates`, …) — **do not** compare raw backend role strings here.
4. Gate UI with `<RoleGate capability="reports.export">` or `can('reports.export')`.
5. Add or extend a Vitest test next to the surface you changed.

## Production note

Backend RBAC remains authoritative. Frontend gates prevent **wrong affordances**; they are not a security boundary.
