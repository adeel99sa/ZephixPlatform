# Role Taxonomy for MVP Beta (Workstream 2)

**Status:** Draft for architect review (WS-ROLE-VIEWS-WEEK-1-B)
**Audience:** Frontend (RoleGate consumer), backend (cross-check), product (capability decisions)
**Authoritative on:** UI affordance × role decisions. **NOT authoritative on backend authorization** — server is source of truth (RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md §1).

---

## 1. Purpose

Single source of truth for what each role can do across every MVP-beta surface. Drives the `capability` prop on `<RoleGate>` and the role-keyed map inside `useEffectiveRole`. Future workstream specs (Weeks 2–4) reference this file when deciding which UI affordances to render per role.

**Frontend gating in this document is advisory — server enforcement (per RBAC reference §9) is the binding contract.** Any UI affordance shown to a role here must be reachable by the same role on the backend, or it produces a confusing UX (button visible → click → 403). Section 2.3 below records the canonical effective-role helper that the backend uses; the matrices in §3 align to that helper's output.

---

## 2. Role Hierarchy

### 2.1 Platform Role (org-scoped, from JWT claim)

Canonical enum: `PlatformRole` at `zephix-backend/src/shared/enums/platform-roles.enum.ts`.

| Role | Intent | UI implication |
|---|---|---|
| **`ADMIN`** | Org-wide administration; the only platform role that may create/delete/archive workspaces. High-trust for org-level operations. (RBAC ref §2.1) | Treated as `workspace_owner` everywhere by `getEffectiveWorkspaceRole`. Sees full Administration tree. |
| **`MEMBER`** | Paid participant; work happens inside assigned workspaces when `ZEPHIX_WS_MEMBERSHIP_V1` is on. (RBAC ref §2.1) | Standard surface; affordances depend on workspace role. |
| **`VIEWER`** | Read-heavy / guest. Default for unknown normalized roles (safe deny for writes). (RBAC ref §2.1) | **Equivalent to "Guest" per F-B ADR-F-B-003.** Notification suppression enforced backend-side; Inbox sidebar item hidden in UI. |

JWT resolution: `user.platformRole ?? user.role` → `normalizePlatformRole(...)`. Legacy strings (`owner`, `admin`, `guest`) map via `LEGACY_ROLE_MAPPING` (RBAC ref §2.1).

### 2.2 Workspace Role (workspace-scoped, from `workspace_members.role`)

Type: `WorkspaceRole` at `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts`.

| Stored value | Normalized alias | Notes |
|---|---|---|
| `workspace_owner` | `workspace_admin` (via `normalizeWorkspaceRole`) | Top of workspace hierarchy. (RBAC ref §2.2) |
| `workspace_member` | — | Standard participant. |
| `workspace_viewer` | — | Read-oriented workspace access. |
| `delivery_owner` | — | **Project-scoped — not a workspace role substitute**, but appears on `workspace_members` rows in current data. Hierarchy slot: level 3 (between member and owner). (RBAC ref §2.2 + §6 T4) |
| `stakeholder` | — | **Project-scoped, read-only** — same caution as `delivery_owner`. Hierarchy slot: same level as `workspace_viewer`. |

**Hierarchy** (canonical, from `workspace-access.service.ts:265-271`):

| Level | Role |
|---|---|
| 4 | `workspace_owner` / `workspace_admin` |
| 3 | `delivery_owner` |
| 2 | `workspace_member` |
| 1 | `workspace_viewer` / `stakeholder` |
| 0 (null) | No membership and not platform ADMIN — no access |

### 2.3 Effective Role Resolution

**Canonical helper:** `WorkspaceAccessService.getEffectiveWorkspaceRole` at [workspace-access.service.ts:213](zephix-backend/src/modules/workspace-access/workspace-access.service.ts#L213).

```
INPUT: { userId, orgId, platformRole, workspaceId }
OUTPUT: WorkspaceRole | null

Rule 1 (ADMIN bypass):
  If platformRole === PlatformRole.ADMIN
    → return 'workspace_owner' (implicit, for ALL workspaces in org)

Rule 2 (Membership lookup):
  Else (MEMBER or VIEWER):
    Find WorkspaceMember where (workspaceId, userId) match
    AND member.workspace.organizationId === orgId
    → return member.role (workspace_owner / workspace_member / workspace_viewer / delivery_owner / stakeholder)

Rule 3 (No access):
  No membership row AND not ADMIN
    → return null
```

**ADMIN bypass is implicit and unconditional.** A Platform ADMIN never has an explicit `workspace_members` row but is treated as `workspace_owner` for every workspace in the org. (Backend: `workspace-access.service.ts:224-227`. ADR cross-reference: Engine 2 ADR-Engine-2-002 `getEffectiveWorkspaceRole` is the canonical helper.)

**Feature flag interaction:** When `ZEPHIX_WS_MEMBERSHIP_V1=0` (off), `getUserWorkspaceRole` short-circuits: ADMIN → `workspace_owner`, everyone else → `workspace_member` (workspace-access.service.ts:169-186). This is back-compat behavior; with flag **on** in production, the helper above is authoritative.

### 2.4 Three Effective Surface Roles (UI columns)

For the matrices in §3, UI affordances collapse to three columns:

| UI Column | Maps from effective workspace role | Backend equivalent |
|---|---|---|
| **Admin** | `workspace_owner` (incl. Platform ADMIN bypass via Rule 1) | `hasWorkspaceRoleAtLeast('workspace_owner')` |
| **Member** | `workspace_member`, `delivery_owner` | `hasWorkspaceRoleAtLeast('workspace_member')` |
| **Viewer** | `workspace_viewer`, `stakeholder`, Platform `VIEWER` | Below member level; reads only |

For four specific capabilities (`workspace.change.owner`, `workspace.archive`, `workspace.delete`, `workspace.edit.complexity`), the Admin column requires Platform ADMIN specifically — not `workspace_owner` via membership. See §5.8 and §5.9. RoleGate consumers must check `isPlatformAdmin` separately for these capabilities.

Special cases for `delivery_owner` and `stakeholder` divergence from this collapse are documented in §5.5 and §5.6.

---

## 3. Surface × Action × Role Matrix

Action vocabulary draws from the `AuditAction` enum (`audit.constants.ts`) where possible, expressed as verb-noun. Where an action is UI-only (e.g., "see Inbox sidebar item"), it has no audit equivalent.

Legend: ✓ = affordance shown + reachable; ✗ = hidden or disabled; **R** = read-only variant shown (no edit/delete control); † = see §5 edge case.

### 3.1 Sidebar / Shell (already implemented Week 1 — documented for reference)

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| See workspace switcher | ✓ | ✓ | ✓ |
| See Home link | ✓ | ✓ | ✓ |
| See Inbox link | ✓ | ✓ | ✗ † (§5.3) |
| See Projects link | ✓ | ✓ | ✓ |
| See Templates link | ✓ | ✓ | ✓ (R) |
| See Dashboards link | ✓ | ✓ | ✓ (R) |
| See Administration tree | ✓ | ✗ | ✗ |
| See profile menu | ✓ | ✓ | ✓ |

Source: ADR-001 (workspace container), ADR-002 (Home/Inbox separation), ADR-003 (Administration in profile menu).

### 3.2 Project Overview tab

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View project summary | ✓ | ✓ | ✓ |
| View project KPIs | ✓ | ✓ | ✓ |
| Edit project name/description | ✓ | ✓ | ✗ |
| Archive project | ✓ | ✗ | ✗ |
| Delete project | ✓ | ✗ | ✗ |
| Manage project team | ✓ | ✓ | ✗ |

Source: RBAC reference §4 default matrix (`create_project_in_workspace` = `workspace_owner` only); ADR-007 governed mutation pattern.

### 3.3 Project Activities tab (phases)

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View phase list | ✓ | ✓ | ✓ |
| Create phase | ✓ | ✓ | ✗ |
| Edit phase name/dates | ✓ | ✓ | ✗ |
| Reorder phases | ✓ | ✓ | ✗ |
| Delete phase | ✓ | ✗ | ✗ |
| Trigger phase-gate evaluation | ✓ | ✓ | ✗ |
| Approve phase-gate transition | ✓ | ✗ | ✗ |

Source: AuditAction enum (`PHASE_CREATED`, `PHASE_UPDATED`, `PHASE_REORDERED`, `PHASE_DELETED`, `PHASE_TRANSITION_APPROVED`); Engine 5 governance — gate approval requires owner-tier authority.

### 3.4 Project Board view (Kanban)

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View board | ✓ | ✓ | ✓ |
| Drag task to new status (D&D) | ✓ | ✓ | ✗ † (§5.2: drag hidden, not disabled) |
| Create task from board | ✓ | ✓ | ✗ |
| Click task → open detail | ✓ | ✓ | ✓ (R) |
| Bulk-update via board actions | ✓ | ✓ | ✗ |

Source: AuditAction (`TASK_MOVED`, `TASK_STATUS_CHANGED`, `TASK_CREATED`). §5.2 decision on D&D hide-vs-disable.

### 3.5 Project Table view

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View task table | ✓ | ✓ | ✓ |
| Create task | ✓ | ✓ | ✗ |
| Edit task inline | ✓ | ✓ | ✗ |
| Assign task | ✓ | ✓ | ✗ |
| Bulk-update tasks | ✓ | ✓ | ✗ |
| Delete task | ✓ | ✓ | ✗ |
| Export table to CSV | ✓ | ✓ | ✓ |
| Save custom view | ✓ | ✓ | ✗ |

Source: AuditAction (`TASK_CREATED`, `TASK_UPDATED`, `TASK_ASSIGNED`, `TASK_DELETED`); Phase 1 work-execution backend reference (MEMORY.md "Bulk actions").

### 3.6 Project Gantt view

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View Gantt timeline | ✓ | ✓ | ✓ |
| Drag bars to reschedule | ✓ | ✓ | ✗ |
| Edit task duration via handle | ✓ | ✓ | ✗ |
| Add dependency between tasks | ✓ | ✓ | ✗ |
| Export Gantt to image/PDF | ✓ | ✓ | ✓ |

Source: AuditAction (`TASK_UPDATED`).

### 3.7 Project Documents tab

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View document list | ✓ | ✓ | ✓ |
| Open document | ✓ | ✓ | ✓ (R) |
| Create document | ✓ | ✓ | ✗ |
| Edit document | ✓ | ✓ | ✗ |
| Delete document | ✓ | ✗ | ✗ |
| Upload attachment | ✓ | ✓ | ✗ |
| Download attachment | ✓ | ✓ | ✓ |

Source: AuditAction (`DOCUMENT_CREATED`, `DOCUMENT_UPDATED`, `DOCUMENT_DELETED`, `upload_complete`, `download_link`); RBAC ref §4 (`create_document_in_workspace` allows owner + member).

### 3.8 Templates surface

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View template list | ✓ | ✓ | ✓ (R) |
| Open template detail | ✓ | ✓ | ✓ (R) |
| Create ORG template | ✓ | ✗ | ✗ |
| Create WORKSPACE template | ✓ | ✗ | ✗ |
| Edit own template | ✓ | ✗ | ✗ |
| Publish/unpublish template | ✓ | ✗ | ✗ |
| Instantiate template into project | ✓ | ✗ † (§5.7) | ✗ |
| Clone template | ✓ | ✗ | ✗ |
| Delete template | ✓ | ✗ | ✗ |

Source: RBAC ref §3.2 (template-specific rules); `requireWorkspaceWrite` for instantiate v5.1 (owner/admin/delivery_owner). T5 documents publish-path TODO for WORKSPACE templates. §5.7 covers the workspace_member instantiate edge case.

### 3.9 Dashboards surface

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View own personal dashboards | ✓ | ✓ | ✗ |
| View published dashboards (audience-filtered) | ✓ | ✓ | ✓ |
| Create personal dashboard | ✓ | ✓ | ✗ |
| Edit own dashboard | ✓ | ✓ | ✗ |
| Delete own dashboard | ✓ | ✓ | ✗ |
| Publish dashboard | ✓ | ✗ | ✗ |
| Unpublish dashboard | ✓ | ✗ | ✗ |
| Edit dashboard audience | ✓ | ✗ | ✗ |
| View other Members' personal dashboards | ✗ † (§5.4) | ✗ | ✗ |

Source: ADR-006 dashboard publishing model (`isPublished` + `audience` JSONB; admin-only publish). §5.4 documents Admin-cannot-see-others-personal decision.

### 3.10 Workspace home

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View workspace summary | ✓ | ✓ | ✓ |
| View "my work" widget | ✓ | ✓ | ✗ (no editable items) |
| View workspace KPIs | ✓ | ✓ | ✓ |
| Navigate to projects | ✓ | ✓ | ✓ |
| Quick-create project | ✓ | ✗ | ✗ |

Source: ADR-001 (workspace is the container), ADR-002 (Home is operational landing, not Inbox).

### 3.11 Workspace member management

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View member list | ✓ | ✓ | ✗ |
| Invite member | ✓ | ✗ | ✗ |
| Remove member | ✓ | ✗ | ✗ |
| Change member role | ✓ | ✗ | ✗ |
| Suspend member | ✓ | ✗ | ✗ |
| Reinstate member | ✓ | ✗ | ✗ |
| Transfer workspace ownership | ✓ † (§5.8) | ✗ | ✗ |

Source: RBAC ref §4 (`manage_workspace_members` = `workspace_owner`); Engine 2 ADR-Engine-2-003 (canonical change-owner endpoint with `RequireOrgRole(PlatformRole.ADMIN)`). §5.8: ownership transfer requires Platform ADMIN, not just workspace_owner — important Admin column nuance.

### 3.12 Workspace settings

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View workspace settings | ✓ | ✓ | ✓ (R) |
| Edit workspace name | ✓ | ✗ | ✗ |
| Edit workspace description | ✓ | ✗ | ✗ |
| Edit complexity mode | ✓ † (§5.9) | ✗ | ✗ |
| Manage feature flags / capabilities | ✓ | ✗ | ✗ |
| Archive workspace | ✓ † (§5.8) | ✗ | ✗ |
| Delete workspace | ✓ † (§5.8) | ✗ | ✗ |

Source: RBAC ref §4 (`edit_workspace_settings` / `archive_workspace` / `delete_workspace` = `workspace_owner`); ADR-B2-FE-003 (complexity_mode UI vocabulary); ADR-B2-004 (complexity_mode = Platform ADMIN only, not workspace_owner alone — §5.9 covers this).

### 3.13 Inbox / notifications

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| See Inbox in sidebar | ✓ | ✓ | ✗ † (§5.3) |
| View notification feed | ✓ | ✓ | ✗ |
| Mark notification as read | ✓ | ✓ | ✗ |
| Subscribe to project notifications | ✓ | ✓ | ✗ |
| Manage notification preferences | ✓ | ✓ | ✗ |

Source: ADR-002 (Inbox ≠ Home); F-B ADR-F-B-003 (Viewer notification suppression — Platform VIEWER receives zero notifications backend-side; UI hides Inbox entirely per §5.3).

### 3.14 Personal Settings / Profile

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| View own profile | ✓ | ✓ | ✓ |
| Edit display name | ✓ | ✓ | ✓ |
| Change password | ✓ | ✓ | ✓ |
| Enroll MFA | ✓ | ✓ | ✓ |
| View own session list | ✓ | ✓ | ✓ |
| Revoke own session | ✓ | ✓ | ✓ |
| See "Administration" submenu in profile menu | ✓ | ✗ | ✗ |

Source: ADR-003 (Administration accessed from profile menu, not sidebar).

### 3.15 Administration tree (already gated — documented for reference)

| Action | Admin | Member | Viewer |
|---|:-:|:-:|:-:|
| Open Administration page | ✓ | ✗ | ✗ |
| View org users list | ✓ | ✗ | ✗ |
| Invite org user | ✓ | ✗ | ✗ |
| Change org user platform role | ✓ | ✗ | ✗ |
| Create workspace (org-level) | ✓ | ✗ | ✗ |
| Delete workspace (org-level) | ✓ | ✗ | ✗ |
| View audit log | ✓ | ✗ | ✗ |
| Manage org settings | ✓ | ✗ | ✗ |
| Manage subscription / billing | ✓ | ✗ | ✗ |
| Configure governance rules | ✓ | ✗ | ✗ |

Source: ADR-003 (Administration menu placement); F-E admin console foundation; RBAC ref §2.1 (ADMIN is the only platform role for workspace create/delete).

---

## 4. Capability Map (for RoleGate)

The `<RoleGate capability="...">` component accepts the tokens below. Tokens use dotted notation: `<domain>.<action>[.<qualifier>]`. The capability map is keyed by effective UI role (Admin / Member / Viewer) and resolves at render time from `useEffectiveRole`.

**Total: 38 tokens.**

| # | Capability token | Admin | Member | Viewer | Source surface |
|---|---|:-:|:-:|:-:|---|
| 1 | `workspace.view` | ✓ | ✓ | ✓ | §3.10, §3.12 |
| 2 | `workspace.edit.settings` | ✓ | ✗ | ✗ | §3.12 |
| 3 | `workspace.manage.members` | ✓ | ✗ | ✗ | §3.11 |
| 4 | `workspace.change.owner` | ✓ † | ✗ | ✗ | §3.11, §5.8 |
| 5 | `workspace.archive` | ✓ | ✗ | ✗ | §3.12 |
| 6 | `workspace.delete` | ✓ | ✗ | ✗ | §3.12 |
| 7 | `workspace.edit.complexity` | ✓ † | ✗ | ✗ | §3.12, §5.9 |
| 8 | `project.view` | ✓ | ✓ | ✓ | §3.2 |
| 9 | `project.create` | ✓ | ✗ | ✗ | §3.10 |
| 10 | `project.edit` | ✓ | ✓ | ✗ | §3.2 |
| 11 | `project.archive` | ✓ | ✗ | ✗ | §3.2 |
| 12 | `project.delete` | ✓ | ✗ | ✗ | §3.2 |
| 13 | `project.manage.team` | ✓ | ✓ | ✗ | §3.2 |
| 14 | `phase.create` | ✓ | ✓ | ✗ | §3.3 |
| 15 | `phase.edit` | ✓ | ✓ | ✗ | §3.3 |
| 16 | `phase.delete` | ✓ | ✗ | ✗ | §3.3 |
| 17 | `phase.gate.approve` | ✓ | ✗ | ✗ | §3.3 |
| 18 | `task.view` | ✓ | ✓ | ✓ | §3.4, §3.5, §3.6 |
| 19 | `task.create` | ✓ | ✓ | ✗ | §3.4, §3.5 |
| 20 | `task.edit` | ✓ | ✓ | ✗ | §3.4, §3.5 |
| 21 | `task.delete` | ✓ | ✓ | ✗ | §3.5 |
| 22 | `task.assign` | ✓ | ✓ | ✗ | §3.5 |
| 23 | `task.bulk.update` | ✓ | ✓ | ✗ | §3.5 |
| 24 | `task.comment` | ✓ | ✓ | ✗ | (cross-surface) |
| 25 | `document.view` | ✓ | ✓ | ✓ | §3.7 |
| 26 | `document.create` | ✓ | ✓ | ✗ | §3.7 |
| 27 | `document.edit` | ✓ | ✓ | ✗ | §3.7 |
| 28 | `document.delete` | ✓ | ✗ | ✗ | §3.7 |
| 29 | `template.view` | ✓ | ✓ | ✓ | §3.8 |
| 30 | `template.create` | ✓ | ✗ | ✗ | §3.8 |
| 31 | `template.publish` | ✓ | ✗ | ✗ | §3.8 |
| 32 | `template.instantiate` | ✓ | ✗ † | ✗ | §3.8, §5.7 |
| 33 | `dashboard.view.published` | ✓ | ✓ | ✓ | §3.9 |
| 34 | `dashboard.create.personal` | ✓ | ✓ | ✗ | §3.9 |
| 35 | `dashboard.publish` | ✓ | ✗ | ✗ | §3.9 |
| 36 | `inbox.view` | ✓ | ✓ | ✗ † | §3.13, §5.3 |
| 37 | `admin.view` | ✓ | ✗ | ✗ | §3.15 |
| 38 | `audit.view` | ✓ | ✗ | ✗ | §3.15 |
| 39 | `artifact.create` | ✓ | ✓ | ✗ | Sprint 5.2a project artifacts |

**Dagger (†) semantics — explicit per row.** Daggers signal that the capability's resolution requires additional context beyond the (Admin / Member / Viewer) effective-role column:

- **Rows 4, 5, 6, 7** (`workspace.change.owner`, `workspace.archive`, `workspace.delete`, `workspace.edit.complexity`): resolution requires **`isPlatformAdmin === true` AND the Admin column**. A user who is `workspace_owner` via membership row alone (without Platform ADMIN) resolves to `false` on these four capabilities. RoleGate consumers must read `isPlatformAdmin` from `useEffectiveRole` and combine it with the Admin column for these tokens. See §5.8 and §5.9.
- **Row 32** (`template.instantiate`): backend currently rejects `workspace_member` requests per RBAC reference §6 T2 (instantiate v5.1 requires `requireWorkspaceWrite` = owner/admin/delivery_owner only). UI gates Member-side conservatively (✗) to avoid "button-then-403" UX, even though the §3.8 matrix shows Member-eligible at the affordance level. Re-evaluate when T2 resolves. See §5.7.
- **Row 36** (`inbox.view`) for Viewer: hide entirely — do not render the Inbox sidebar item or any notification surface for Platform VIEWER. Per §5.3 (F-B ADR-F-B-003: Viewer notifications are suppressed backend-side; UI must mirror).

For all other rows (no dagger), the capability map's true/false is the complete signal — no additional context required.

---

## 5. Edge Cases & Decisions

### 5.1 Cross-workspace deep link (Member deep-links to workspace they don't belong to)

**Decision:** **404 redirect to workspace home (or org home if no default workspace), NOT a 403 dialog.**

**Reason:** Per Engine 2 ADR-Engine-2-001 (Decision C — 4-layer contract), backend returns 401/403 on missing tenant context, but the frontend transport layer (per `engine-2-tenancy.md` §2.3) maps cross-workspace access denial to a 404-style "not found" UX rather than exposing the existence of the foreign workspace. Surfacing 403 would leak that the workspace exists (information disclosure).

**Source:** Engine 2 ADR-Engine-2-001; Decision C contract.

### 5.2 Viewer on Board view — drag-and-drop hide vs disable

**Decision:** **Hide drag affordance entirely.** Do not render the drag handle. Cards are click-to-detail only.

**Reason:** A visible-but-disabled affordance creates UX confusion ("why can't I move this?"). Hiding is consistent with the Viewer-is-read-only mental model. The detail panel itself is read-only for Viewer (no edit controls rendered).

**Source:** ADR-006 (read-only consistency for Viewer role); product principle "quiet capabilities, not loud disabled states" from `42-zephix-product-principles.mdc`.

### 5.3 Viewer Inbox visibility

**Decision:** **Hide the Inbox sidebar item entirely for Platform VIEWER.** Do not render the navigation entry.

**Reason:** Per F-B ADR-F-B-003 (Viewer notification suppression), backend never persists notifications for Platform VIEWER recipients. The Inbox would render an empty feed perpetually. Hiding the sidebar item is consistent with "no notification state for Guest" semantics.

**Source:** Foundation F-B ADR-F-B-003 (`f-b-notifications.md`).

### 5.4 Member sees other Members' personal dashboards?

**Decision:** **No. Member sees only own dashboards + published dashboards whose audience includes them.**

**Reason:** Per ADR-006, the dashboard publishing model uses `isPublished` + `audience` JSONB. Personal (unpublished) dashboards are private to the creator. Even Admin does NOT see other users' personal dashboards — only published ones (Admin's privilege is mutation: publish/unpublish/edit audience, not cross-user-personal viewing).

**Source:** ADR-006 (dashboard publishing model).

### 5.5 `delivery_owner` divergence from `workspace_member`

**Decision:** **Treat `delivery_owner` as effective `workspace_member` in the UI matrices for MVP**, with one exception: `template.instantiate` is available to `delivery_owner` per `requireWorkspaceWrite` (`workspace_owner` / `workspace_admin` / `delivery_owner`).

**Reason:** Per RBAC ref §2.2/§2.3, `delivery_owner` is a project-scoped concept that may appear on workspace_members rows. The RBAC reference §6 T4 flags model-clarity as needed; MVP collapses delivery_owner into the Member column for UI purposes except where backend explicitly grants them broader scope (instantiate).

**Frontend implementation note:** `useEffectiveRole` should return `'member'` for `delivery_owner` membership for §3 matrix evaluation, AND expose a separate `isDeliveryOwner` boolean for the rare surfaces (template instantiate, project-as-delivery-owner views) that branch on it.

**Future:** Future product work may grant `delivery_owner` cross-team assignment authority on their project; MVP collapses to Member behavior. Tracked for v2 of this taxonomy.

**Source:** RBAC ref §2.2, §6 T4; `workspace-access.service.ts:265-271` hierarchy; T2 instantiate v5.1 path.

### 5.6 `stakeholder` divergence from `workspace_viewer`

**Decision:** **Treat `stakeholder` as effective `workspace_viewer` in MVP UI matrices.** No surfaces in §3 distinguish them.

**Reason:** Per RBAC ref §2.2, `stakeholder` is documented as project-scoped read-only — equivalent to Viewer at the workspace level. Future product work may introduce stakeholder-specific surfaces (read-only project dashboards with restricted financial fields, etc.), but MVP does not.

**Source:** RBAC ref §2.2 hierarchy (`stakeholder` shares level 1 with `workspace_viewer`).

### 5.7 Member instantiates template — backend asymmetry (RBAC T2)

**Decision:** **Hide template-instantiate affordance for Members in MVP**, despite the matrix in §3.8 showing the action.

**Reason:** Per RBAC ref §6 T2, instantiate v5.1 uses `requireWorkspaceWrite` (allows `workspace_owner` / `workspace_admin` / `delivery_owner` only — NOT `workspace_member`). A Member clicking instantiate gets a backend 403. To avoid "button-then-403" UX, gate the affordance Admin-only on the frontend until T2 is resolved (the legacy instantiate path uses a different rule and would allow more — but legacy is being deprecated).

**RoleGate implementation:** `template.instantiate` capability map is `Admin: ✓, Member: ✗, Viewer: ✗` for MVP. Marked with † in §4 to flag that the underlying matrix shows Member-allowed but UI is conservative.

**Source:** RBAC ref §6 T2; Engine 4 Phase A template inventory.

### 5.8 Workspace ownership transfer — Platform ADMIN-only, not workspace_owner alone

**Decision:** **`workspace.change.owner` capability is true for the UI's "Admin" column only when the user is a Platform ADMIN.** A user who is `workspace_owner` via membership row (without Platform ADMIN) cannot transfer ownership in MVP — the canonical endpoint requires `RequireOrgRole(PlatformRole.ADMIN)`.

**Reason:** Per Engine 2 ADR-Engine-2-003 (`POST /:id/change-owner` requires Platform ADMIN), workspace_owner via membership alone is insufficient. This is a known asymmetry between membership-role and platform-role permissions; the change-owner backdoor was closed in PR #269.

**Frontend implementation:** `useEffectiveRole` should expose both `effectiveRole` (the workspace-collapsed Admin/Member/Viewer column) AND `isPlatformAdmin` boolean. `workspace.change.owner` and `workspace.archive` / `workspace.delete` resolve through `isPlatformAdmin && effectiveRole === 'admin'`. Same applies to archive/delete (RBAC ref §4 lists these as `workspace_owner` default, but org-level Platform ADMIN is required per Engine 2 + F-E admin console foundation).

**Source:** Engine 2 ADR-Engine-2-003; F-E admin console foundation.

### 5.9 `complexity_mode` edit — Platform ADMIN-only

**Decision:** **`workspace.edit.complexity` capability is true only for Platform ADMIN, not for non-ADMIN workspace_owner.**

**Reason:** Per ADR-B2-004 (decisions/ADR-B2-004-complexity-mode-org-admin-only.md), complexity_mode mutations require Platform ADMIN. The backend controller enforces this via `RequireOrgRole(PlatformRole.ADMIN)`. UI must mirror.

**Frontend implementation:** Same as 5.8 — gate on `isPlatformAdmin` separately from workspace role column.

**Source:** ADR-B2-004 (complexity-mode-org-admin-only); ADR-B2-FE-003 (complexity_mode UI vocabulary).

### 5.10 Feature-flag `ZEPHIX_WS_MEMBERSHIP_V1` off (legacy back-compat)

**Decision:** **MVP frontend treats the flag as always on.** Do not branch UI on flag state.

**Reason:** Per MEMORY.md, the flag is `ON` in staging and intended for production. Per RBAC ref §6 T3, flag-off mode is a known security gap (workspace role enforcement disabled). The frontend should not provide a more permissive UX in flag-off mode — that would inherit the gap.

**Source:** RBAC ref §6 T3; MEMORY.md pending ops actions section.

---

## 6. Cross-References

Every decision above traces to a canonical source. This section enumerates them for reviewer cross-check.

### 6.1 Canonical files cited

| Reference | Used in |
|---|---|
| `RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md` (full reference) | §2.1, §2.2, §2.4, §3.x (most), §5.5, §5.6, §5.7, §5.10 |
| `engines/engine-1-rbac.md` | §2 (overall framing); §3.15 |
| `engines/engine-2-tenancy.md` | §2.3 (effective role helper), §5.1 (Decision C), §5.8 (change-owner) |
| `AD-027_LOCKED.md` (permission matrix framework) | §3 (action vocabulary, hierarchy) |
| `adrs/ADR-001-workspace-is-the-container.md` | §3.1, §3.10 |
| `adrs/ADR-002-home-and-inbox-are-separate.md` | §3.1, §3.13 |
| `adrs/ADR-003-administration-in-admin-profile-menu.md` | §3.1, §3.14, §3.15 |
| `adrs/ADR-006-dashboard-publishing-model.md` | §3.9, §5.2, §5.4 |
| `adrs/ADR-007-governed-mutation-pattern.md` | §3.2, §3.3 |
| `foundations/f-b-notifications.md` (ADR-F-B-003) | §3.1, §3.13, §5.3 |
| `foundations/f-e-admin-console.md` | §3.15, §5.8 |
| `zephix-backend/src/modules/workspace-access/workspace-access.service.ts` | §2.3 (getEffectiveWorkspaceRole canonical), §2.4 hierarchy |
| `decisions/ADR-B2-004-complexity-mode-org-admin-only.md` | §3.12, §5.9 |
| `decisions/ADR-B2-FE-003-complexity-mode-vocabulary.md` | §3.12, §5.9 |
| `zephix-backend/src/modules/audit/audit.constants.ts` (AuditAction enum) | §3 (vocabulary derivation) |

### 6.2 Known asymmetries (server vs UI) flagged in this taxonomy

| ID | Surface | Description | Resolution path |
|---|---|---|---|
| T1 (RBAC ref §6) | All workspace writes | Platform ADMIN bypass inconsistent across services | ADR pending |
| T2 (RBAC ref §6) | Template instantiate | v5.1 (member-write only) vs legacy (admin shortcut) — different minimum roles | §5.7 conservative-UI workaround |
| T3 (RBAC ref §6) | Flag-off mode | Workspace role enforcement disabled when flag off | §5.10 frontend ignores flag state |
| T4 (RBAC ref §6) | Project-scoped roles on workspace table | `delivery_owner` / `stakeholder` not real workspace roles | §5.5, §5.6 collapse rules |
| T5 (RBAC ref §6) | Workspace template publish | Code TODO for workspace_owner publish path | Admin-only in §3.8 until resolved |

The above asymmetries are **carried forward as known debt** from RBAC reference — they are documented here so that frontend authors do not invent new positions on them. The taxonomy adopts the conservative server-side answer for each.

---

## 7. Document control

| Field | Value |
|---|---|
| **Owner** | Solution architect (taxonomy synthesis); Cursor (RoleGate consumer); product (capability decisions) |
| **Update trigger** | Any new ADR touching RBAC; resolution of any of T1–T5; addition of new MVP surface |
| **Scope** | MVP beta (Workstreams 2–4). Post-MVP role refinements (e.g., true project-RBAC lattice, T4 resolution) are out of scope and will produce a v2 of this taxonomy. |
| **Linked workstream** | WS-ROLE-VIEWS-WEEK-1-B (this doc); WS-2-W1-A (Cursor's `useEffectiveRole` + RoleGate consumer of this map) |

---

*End of taxonomy.*
