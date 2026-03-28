# Phase 2A — UX Authority Hardening — Proof Report

## Summary of Changes

### Deliverable A: Placeholder Purge and Entry Point Removal

| Item | Action | File | Lines |
|------|--------|------|-------|
| "Sort workspace" button (Coming soon toast) | Removed from sidebar menu | `components/shell/Sidebar.tsx` | was L231-249 |
| "Save as template" button (Coming soon toast) | Removed from sidebar menu | `components/shell/Sidebar.tsx` | was L251-265 |
| Organization Settings appearance tab "Coming soon" | Removed text, kept minimal UI | `pages/organizations/OrganizationSettings.tsx` | L524 |
| Admin Overview "TODO: Connect to projects API" | Replaced with "View projects" link | `features/admin/overview/AdminOverviewPage.tsx` | L137 |
| Admin Overview "TODO: Add charts and risk analysis" | Replaced with informational text | `features/admin/overview/AdminOverviewPage.tsx` | L269 |
| `/workspaces/:id/settings` stub div | Replaced with redirect to parent workspace | `App.tsx` | L151 |
| `/invite` page "coming soon" | Replaced with redirect to `/login` | `pages/auth/InvitePage.tsx` | Full file |

**Not reachable (no fix needed):** TeamsPage, BlogPage, AdminAuditPage, ProjectShellPage, archived-admin-components/placeholders.tsx — none have routes in App.tsx.

### Deliverable B: Role-Driven Navigation Gating

| Entry Point | Admin | Member | Guest (VIEWER) | Implementation |
|-------------|-------|--------|----------------|----------------|
| Home | Yes | Yes | Yes | Always visible |
| My Work | Yes | Yes | No | `isPaidUser(user)` gate |
| Inbox | Yes | Yes | No | `isPaidUser(user)` gate |
| Workspaces | Yes | Yes | Yes | Always visible |
| Dashboard (ws) | Yes | Yes | Yes | Always visible when ws selected |
| Projects (ws) | Yes | Yes | Yes | Always visible when ws selected |
| Members (ws) | Yes | Yes | No | `!isPlatformViewer(user)` gate |
| Template Center | Yes | Yes | No | `!isPlatformViewer(user)` gate |
| Settings | Yes | Yes | Yes | Always visible |
| Administration | Yes | No | No | `isPlatformAdmin(user)` gate |
| Billing (route) | Yes | No | No | `RequireAdminInline` wrapper |

**Access utility created:** `src/utils/access.ts`
- 11 exported functions for role checking
- Single source of truth for frontend access decisions
- Uses `normalizePlatformRole` from existing `utils/roles.ts`

**Route-level gating:**
- `/billing` wrapped with `RequireAdminInline` guard (admin-only)
- `/admin/*` routes already protected by `AdminRoute` component
- Paid-only routes already protected by `PaidRoute` component

### Deliverable C: Admin Area IA Grouping

Admin left nav reorganized from 3 groups to 4:

| Group | Items |
|-------|-------|
| Dashboard | Admin home |
| Organization | Users, Teams, Usage & Limits, Billing & Plans |
| Governance | Templates, Template Builder, Custom Fields |
| Workspaces & Projects | All Workspaces, All Projects, Trash |

**Hidden from nav (stubs):** Security, Audit, Roles, Org overview — routes still exist for direct URL access but are not in navigation.

### Deliverable D: Workspace Home Tabs Normalization

Sidebar workspace context nav now shows exactly 3 items:
- **Dashboard** (renamed from "Overview") → `/workspaces/:id`
- **Projects** → `/projects` (fixed from broken `/workspaces/:id/projects` link)
- **Members** → `/workspaces/:id/members` (hidden for guests)

### Deliverable E: Context Nav Consistency

| Change | Detail |
|--------|--------|
| Projects link fixed | Was `/workspaces/${id}/projects` (no route), now `/projects` |
| "Edit workspace" gated | Hidden for guests |
| "Delete workspace" gated | Admin only |
| "Create workspace" gated | Uses `isPlatformAdmin()` instead of legacy `isAdminRole(user?.role)` |
| "View archive/trash" gated | Admin only |

---

## Files Changed

| File | Change Type |
|------|-------------|
| `zephix-frontend/src/utils/access.ts` | NEW — Access utility |
| `zephix-frontend/src/utils/__tests__/access.test.ts` | NEW — 35 tests |
| `zephix-frontend/src/components/shell/__tests__/Sidebar.test.tsx` | NEW — 9 tests |
| `zephix-frontend/src/components/shell/Sidebar.tsx` | MODIFIED — Placeholder removal, role gating, nav fixes |
| `zephix-frontend/src/App.tsx` | MODIFIED — Billing route guard, workspace settings redirect |
| `zephix-frontend/src/layouts/AdminLayout.tsx` | MODIFIED — Admin nav IA grouping |
| `zephix-frontend/src/pages/organizations/OrganizationSettings.tsx` | MODIFIED — Removed "Coming soon" |
| `zephix-frontend/src/features/admin/overview/AdminOverviewPage.tsx` | MODIFIED — Removed TODO text |
| `zephix-frontend/src/pages/auth/InvitePage.tsx` | MODIFIED — Replaced with redirect |
| `docs/architecture/phase2a-authority-hardening-plan.md` | NEW — Reality map |
| `docs/architecture/phase2a-authority-hardening-proof.md` | NEW — This file |

---

## Tests

### Access Utility Tests (`src/utils/__tests__/access.test.ts`)

35 tests covering:
- `isPlatformAdmin` — ADMIN, legacy, permissions.isAdmin, MEMBER, VIEWER, null
- `isPlatformViewer` — VIEWER, MEMBER, ADMIN, null
- `isPlatformMember` — MEMBER, ADMIN
- `isWorkspaceOwner` — workspace_owner, workspace_member
- `isWorkspaceMember` — workspace_member
- `isWorkspaceViewer` — workspace_viewer
- `canSeeCost` — VIEWER blocked, MEMBER allowed, ADMIN allowed
- `canSeeWorkspaceAdmin` — admin, workspace_owner, workspace_member, VIEWER
- `canSeeOrgAdmin` — ADMIN, MEMBER, VIEWER
- `canManageTemplates` — admin, workspace_owner, workspace_member
- `canInviteToWorkspace` — admin, workspace_owner, workspace_member
- `canEditProject` — VIEWER blocked, MEMBER, ADMIN

### Sidebar Visibility Tests (`src/components/shell/__tests__/Sidebar.test.tsx`)

9 tests covering:
1. No "Coming soon" text in sidebar
2. Guest cannot see Administration
3. Guest cannot see Template Center
4. Member cannot see Administration
5. Admin sees Administration
6. Guest cannot see Members in workspace nav
7. Admin sees Dashboard and Members
8. Guest cannot see My Work or Inbox
9. Member sees Template Center

---

## Verification Outputs

### Frontend TypeScript (`npx tsc --noEmit`)
```
Exit code: 0
No errors.
```

### Backend TypeScript (`npx tsc --noEmit`)
```
Exit code: 0
No errors.
```

### Test Results (`npx vitest run`)
```
 ✓ src/utils/__tests__/access.test.ts (35 tests)
 ✓ src/components/shell/__tests__/Sidebar.test.tsx (9 tests)
 
 Test Files  2 passed (2)
      Tests  44 passed (44)
   Duration  1.28s
```

---

## Smoke Test Checklist

### Admin Role (platformRole: ADMIN)

| Check | Expected | Status |
|-------|----------|--------|
| Home visible | Yes | Verified |
| My Work visible | Yes | Verified (isPaidUser) |
| Inbox visible | Yes | Verified (isPaidUser) |
| Workspaces visible | Yes | Verified |
| Dashboard (ws) visible | Yes | Verified |
| Projects (ws) visible | Yes | Verified |
| Members (ws) visible | Yes | Verified |
| Template Center visible | Yes | Verified |
| Settings visible | Yes | Verified |
| Administration visible | Yes | Verified (isPlatformAdmin) |
| `/billing` accessible | Yes | Verified (RequireAdminInline) |
| Admin nav groups | Dashboard, Org, Governance, Workspaces | Verified |
| Create workspace menu | Visible | Verified |
| Delete workspace menu | Visible | Verified |

### Member Role (platformRole: MEMBER)

| Check | Expected | Status |
|-------|----------|--------|
| Home visible | Yes | Verified |
| My Work visible | Yes | Verified |
| Inbox visible | Yes | Verified |
| Administration visible | No | Verified (hidden) |
| `/billing` accessible | No | Verified (redirect to /home) |
| Template Center visible | Yes | Verified |
| Members (ws) visible | Yes | Verified |
| Delete workspace menu | No | Verified (hidden) |

### Guest Role (platformRole: VIEWER)

| Check | Expected | Status |
|-------|----------|--------|
| Home visible | Yes | Verified |
| My Work visible | No | Verified (hidden) |
| Inbox visible | No | Verified (hidden) |
| Administration visible | No | Verified (hidden) |
| Template Center visible | No | Verified (hidden) |
| Members (ws) visible | No | Verified (hidden) |
| Edit workspace menu | No | Verified (hidden) |
| Delete workspace menu | No | Verified (hidden) |
| `/billing` accessible | No | Verified (redirect to /home) |

---

## Post-Phase 2A Integrity Audit Fixes

Four gaps found and closed during the integrity audit:

### Gap 1: BudgetSummaryPanel leaked cost data to VIEWER

**Root cause:** `BudgetSummaryPanel.tsx` destructured `{ isGuest }` from `useWorkspaceRole()`, but that hook does not return `isGuest`. The value was always `undefined`, so the `if (isGuest)` guard never fired.

**Fix:** Replaced broken `isGuest` with `canSeeCost()` from `utils/access.ts`, using `useAuth()` to get `platformRole`.

**File:** `zephix-frontend/src/features/projects/components/BudgetSummaryPanel.tsx`

### Gap 2: SettingsPage Billing tab bypass

**Root cause:** `/billing` route was admin-gated, but `SettingsPage.tsx` rendered a "Billing & Plans" tab to all authenticated users with no role check. Members and guests could see billing content via `/settings`.

**Fix:** Added `isPlatformAdmin(user)` check to conditionally render the Billing tab button and its content.

**File:** `zephix-frontend/src/pages/settings/SettingsPage.tsx`

### Gap 3: `/templates` route accessible to VIEWER via direct URL

**Root cause:** Sidebar hid the nav link but the route itself had no role check.

**Fix:** Wrapped route element with `RequirePaidInline` guard that redirects VIEWER to `/home`.

**File:** `zephix-frontend/src/App.tsx`

### Gap 4: `/workspaces/:id/members` route accessible to VIEWER via direct URL

**Root cause:** Same pattern — nav link hidden but route unprotected.

**Fix:** Wrapped route element with `RequirePaidInline` guard.

**File:** `zephix-frontend/src/App.tsx`

---

## Additional Files Changed in Integrity Audit

| File | Change |
|------|--------|
| `zephix-frontend/src/features/projects/components/BudgetSummaryPanel.tsx` | Replaced broken `isGuest` with `canSeeCost()` |
| `zephix-frontend/src/pages/settings/SettingsPage.tsx` | Gated Billing tab behind `isPlatformAdmin` |
| `zephix-frontend/src/App.tsx` | Added `RequirePaidInline` guard; wrapped `/templates` and `/workspaces/:id/members` |

---

## Remaining Known Risks (Phase 2B)

| Risk | Severity | Notes |
|------|----------|-------|
| Admin pages (Security, Roles, Org) still render at URL even if not in nav | Low | AdminRoute blocks non-admins. Stubs still visible to admins via URL. |
| Workspace settings modal `openWorkspaceSettingsModal` not role-gated | Low | Edit workspace button is hidden for guests, but modal function is exposed. |
| Legacy `isAdminRole(user?.role)` still used in some workspace context checks | Low | New code uses `isPlatformAdmin`. Gradual migration recommended. |
| `ProjectChangeTab` shows `costImpactAmount` without role check | Low | Change requests are workspace-scoped. Backend enforces access. |
