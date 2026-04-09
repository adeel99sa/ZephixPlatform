# Zephix — RBAC & Access Control Architecture (Full Reference)

**Audience:** Solution architects, security reviewers, principal engineers, RBAC-focused hires  
**Classification:** Engineering reference — **no secrets, credentials, or customer data**  
**Scope:** Backend authority model, guard patterns, and known tensions as implemented in the monorepo. Frontend gating is **advisory only**; **server enforcement** is authoritative.

**Related:** `ZEPHIX_PLATFORM_ARCHITECTURE_OVERVIEW.md` (platform context).

---

## 1. Design Principles

| Principle | Meaning |
|-----------|---------|
| **Server is source of truth** | Every mutating and sensitive read path must enforce scope + role on the API. UI checks are UX only. |
| **Tenant first** | `organizationId` is mandatory for data access; workspace-scoped domains require validated workspace context (typically `x-workspace-id` where the contract requires it). |
| **Do not trust client scope** | Do not take `organizationId` / `workspaceId` from arbitrary client bodies for authorization when auth + route + headers can define scope. |
| **VIEWER = guest** | Platform **VIEWER** is least privileged; cross-workspace aggregates for MEMBER/VIEWER must respect **accessible workspace IDs**. |
| **Normalize roles** | JWT may carry legacy strings; guards normalize via **`normalizePlatformRole`** / **`normalizeWorkspaceRole`**. |
| **Three layers** | **Platform role** (org membership) × **Workspace membership role** (per workspace) × **Project-scoped labels** (PM, delivery_owner, etc.) — not interchangeable. |

---

## 2. Role Dimensions (Orthogonal Concepts)

### 2.1 Platform role (organization-level)

**Canonical module:** `src/common/auth/platform-roles.ts`  
**Enum:** `PlatformRole`: **`ADMIN`**, **`MEMBER`**, **`VIEWER`**

| Role | Intent (product) |
|------|-------------------|
| **ADMIN** | Org-wide administration; **only** platform role that may **create org workspaces** (`canCreateWorkspaces`). Treated as high trust for org-level operations. |
| **MEMBER** | Paid participant; work happens inside **assigned** workspaces when membership features are on. |
| **VIEWER** | Read-heavy / guest; default for unknown normalized roles (**safe deny for writes**). |

**JWT resolution:** `user.platformRole ?? user.role` → `normalizePlatformRole(...)`.  
**Org-context role** is expected on `platformRole` (e.g. from `UserOrganization` at login).

**Legacy strings** (e.g. `owner`, `admin`, `guest`) map via `LEGACY_ROLE_MAPPING`.

---

### 2.2 Workspace membership role

**Type:** `WorkspaceRole` on `workspace_members` (see `workspace.entity.ts`).

| Stored / logical value | Notes |
|------------------------|--------|
| **`workspace_owner`** | Legacy DB value; **canonical alias in new code:** treat as **`workspace_admin`** after `normalizeWorkspaceRole`. |
| **`workspace_admin`** | Same privilege tier as `workspace_owner` in hierarchy helpers. |
| **`workspace_member`** | Standard participant. |
| **`workspace_viewer`** | Read-oriented workspace access. |
| **`delivery_owner`** | **Project-scoped** — documented on entity as **not** a substitute for workspace role; still may appear on membership rows in data. |
| **`stakeholder`** | **Project-scoped** — same caution. |

**Hierarchy** (for `hasWorkspaceRoleAtLeast`):  
`workspace_owner` / `workspace_admin` (4) ≥ `delivery_owner` (3) ≥ `workspace_member` (2) ≥ `workspace_viewer` / `stakeholder` (1).

**Feature flag:** `ZEPHIX_WS_MEMBERSHIP_V1`  
- When **off:** many workspace-role guards **short-circuit allow** (back-compat); effective roles may be simplified (e.g. admin → owner, others → member) in `WorkspaceAccessService`.  
- When **on:** **MEMBER/VIEWER** require **`workspace_members`** rows; **ADMIN** may still be treated as **`workspace_owner`** in **effective role** helpers.

---

### 2.3 Project-scoped concepts (not a full RBAC lattice today)

| Concept | Implementation shape |
|---------|----------------------|
| **Project Manager** | `Project.projectManagerId` — **accountability / defaults** (e.g. team seeding). **Not** the primary gate for arbitrary task writes; workspace write + other guards dominate. |
| **delivery_owner / stakeholder** | Intended as **project-level** granularity per entity comments; **must not** be collapsed into workspace roles without an ADR. |

---

## 3. Permission Surfaces (How Checks Are Expressed)

### 3.1 Declarative guards (HTTP)

| Mechanism | Typical use |
|-----------|-------------|
| **`JwtAuthGuard`** | Class or route: authenticated user + tenant claims. |
| **`RequireOrgRoleGuard` + `@RequireOrgRole(...)`** | Minimum **platform** role via ordered hierarchy **ADMIN > MEMBER > VIEWER**. Accepts legacy decorator strings normalized to `PlatformRole`. |
| **`RequireWorkspaceRoleGuard` + metadata** | Minimum **workspace** role when `ZEPHIX_WS_MEMBERSHIP_V1=1`; **optional `allowAdminOverride`** (platform ADMIN bypass). If flag **off**, may **allow all** (compat). |
| **`WorkspaceRoleGuardService`** | **Imperative** checks: `requireWorkspaceRead`, `requireWorkspaceWrite` — **membership table only** for read/write; write allowed for `delivery_owner`, `workspace_owner`, `workspace_admin` only. **No platform-admin bypass** in this service. |
| **`WorkspaceAccessService`** | **Accessible workspace IDs** (null = all in org for admin or flag off); **effective workspace role**; **canAccessWorkspace**. |
| **`WorkspacePermissionService`** | **Configurable matrix** `permissionsConfig` on `Workspace` with **default** allow-lists per action; **platform admin** short-circuit **allow all**; **platform ADMIN** mapped to **`workspace_owner`** in `getRoleForUserInWorkspace`. Used by some **legacy** flows (e.g. older template instantiate). |

### 3.2 Template-specific rules (examples)

| Operation | Enforcement (high level) |
|-----------|---------------------------|
| **List templates** | Authenticated; org context; workspace header for workspace-scoped listing as per `TemplatesService.listV1`. |
| **Create template** | **ORG:** platform **admin** only. **WORKSPACE:** **admin** or **`workspace_owner`** from workspace role lookup. **SYSTEM:** not via normal user API. |
| **Publish template** | **`RequireOrgRole('admin')`**; code comment: TODO for workspace-owner path for WORKSPACE-scoped templates. |
| **Instantiate template v5.1** | **`requireWorkspaceWrite`** on workspace → **must** be member with **owner/admin/delivery_owner** role on row; then **`canAccessWorkspace`**. |

### 3.3 Policy overrides (governance substrate)

**`PolicyOverride`** + resolution order (**project > workspace > org > system default**) exists for **keyed policies** — not a replacement for RBAC but **orthogonal** (e.g. feature toggles, thresholds). Future **governance engine** should **compose** with RBAC, not duplicate it.

---

## 4. Default Workspace Permission Matrix (`WorkspacePermissionService`)

When `permissionsConfig` is missing, defaults include:

| Action | Default allowed roles |
|--------|------------------------|
| `view_workspace` | owner, member, viewer |
| `edit_workspace_settings` | workspace_owner |
| `manage_workspace_members` | workspace_owner |
| `change_workspace_owner` | workspace_owner |
| `archive_workspace` | workspace_owner |
| `delete_workspace` | workspace_owner |
| **`create_project_in_workspace`** | **`workspace_owner` only** |
| `create_board_in_workspace` | workspace_owner |
| `create_document_in_workspace` | workspace_owner, workspace_member |

**Note:** **`create_project_in_workspace`** default is **not** `workspace_member`. Instantiate v5.1 uses a **different** guard (`requireWorkspaceWrite`) — see §6.

---

## 5. Request Context Checklist (Mental Model)

For a workspace-scoped write:

1. **Authenticated?** (`JwtAuthGuard`)  
2. **Org context present?** (`organizationId` on user / tenant context)  
3. **Workspace header valid?** (if route contract requires `x-workspace-id`)  
4. **Can user access this workspace?** (`WorkspaceAccessService.canAccessWorkspace` or equivalent)  
5. **Does this code path use `requireWorkspaceWrite` or `RequireWorkspaceRoleGuard` or `WorkspacePermissionService`?** — behavior **differs** (§6).  
6. **Resource scoped in query?** `organizationId` (+ `workspaceId` if applicable) on DB operations.

---

## 6. Known Architectural Tensions (ADR Candidates)

These are **implementation facts**, not desired end states:

| # | Tension | Detail |
|---|---------|--------|
| **T1** | **Platform ADMIN vs `workspace_members`** | `WorkspaceAccessService` / `WorkspacePermissionService` often treat **ADMIN** as **workspace_owner** or allow-all. **`WorkspaceRoleGuardService.requireWorkspaceWrite`** does **not** grant admin bypass — it **only** looks at **`workspace_members`**. |
| **T2** | **Instantiate v5.1 vs legacy instantiate** | v5.1: **`requireWorkspaceWrite`**. Legacy: **`WorkspacePermissionService`** `create_project_in_workspace` + admin shortcut. **Different minimum roles.** |
| **T3** | **`ZEPHIX_WS_MEMBERSHIP_V1` off** | **`RequireWorkspaceRoleGuard`** returns **true** (no check). Risk: workspace role enforcement **disabled** if flag forgotten in prod. |
| **T4** | **Project-scoped roles on workspace table** | `delivery_owner` / `stakeholder` documented as project-scoped but may appear on **workspace_members**; hierarchy compares them to workspace roles — **model clarity** needed. |
| **T5** | **Publish template** | Org **admin** only today; **WORKSPACE** templates may need **workspace_owner** publish path (TODO in code). |

**Recommended ADR #1:** *Single rule for platform ADMIN: implicit workspace owner vs explicit membership-only for all write paths.*

---

## 7. Suggested Permission Matrix (Strawman — Align to Code After ADR)

**Legend:** ✓ allowed, ✗ denied, **flag** = depends on `ZEPHIX_WS_MEMBERSHIP_V1` / config / TODO.

| Action | Platform ADMIN (not on `workspace_members`) | Workspace owner/admin | Workspace member | Workspace viewer |
|--------|---------------------------------------------|------------------------|------------------|------------------|
| Access workspace (read) | ✓ (often all WS in org) | ✓ | ✓ | ✓ |
| **Instantiate template v5.1** | **✗ today** (`requireWorkspaceWrite`) | ✓ | ✗ | ✗ |
| Legacy create project (permission service default) | ✓ (admin bypass) | ✓ (owner) | ✗ | ✗ |
| Mutate work tasks (typical controller) | **✗** unless also member + write role | ✓ | ✗ | ✗ |
| `RequireWorkspaceRoleGuard` min role (flag on) | ✓ if `allowAdminOverride` | per decorator | per decorator | per decorator |

*Treat this table as **documentation of current asymmetry** until T1/T2 are resolved.*

---

## 8. Cross-Workspace Isolation (MEMBER / VIEWER)

- **`WorkspaceAccessService.getAccessibleWorkspaceIds`:** returns **`null`** (all org workspaces) for **ADMIN** or flag off; otherwise **only member workspace IDs**.  
- **Product rule:** Responses that aggregate across workspaces for **MEMBER/VIEWER** must **filter** to **accessible** workspace IDs (see platform guardrails / tenancy rules).

---

## 9. Frontend

- **Role gating** in React is for **UX** (hide buttons, show copy).  
- **Assumption:** Malicious clients can bypass; **all** enforcement remains on the API.

---

## 10. Testing & Verification Expectations

- **New guards / changed matrices:** unit tests on guard + **service integration** for allow/deny matrix.  
- **Regression:** instantiate template, workspace create, template create/publish, representative **work-management** PATCH with **MEMBER** vs **VIEWER** vs **owner**.  
- **Feature flag:** explicit tests for `ZEPHIX_WS_MEMBERSHIP_V1` on/off if behavior diverges.

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **Platform role** | Org-level `ADMIN` / `MEMBER` / `VIEWER`. |
| **Workspace role** | `workspace_members.role` (+ legacy aliases). |
| **Effective workspace role** | Result of `WorkspaceAccessService.getEffectiveWorkspaceRole` (admin → owner, else membership). |
| **Implicit admin** | Admin treated as owner / all workspaces without a membership row — **inconsistent** across services today. |

---

## 12. What a “Full RBAC Architect” Should Deliver Next

1. **ADR:** Resolve **T1** (admin + membership + write).  
2. **Single matrix document** (this file + spreadsheet) owned by product + security.  
3. **Consolidate** `requireWorkspaceWrite` vs `WorkspacePermissionService` vs `RequireWorkspaceRoleGuard` for **one** instantiate/create-project story.  
4. **Project-level RBAC** (optional phase): explicit **project roles** table vs overloading `workspace_members`.  
5. **Publish** path for **WORKSPACE** templates (close TODO).  
6. **Remove or harden** “flag off = allow” paths for workspace role guard.

---

## Document control

| Field | Value |
|--------|--------|
| **Purpose** | Full RBAC / access-control reference for architects and hires |
| **Owner** | Platform engineering + security |
| **Update** | After any guard, flag, or `WorkspaceRole` semantics change |

---

*End of document.*
