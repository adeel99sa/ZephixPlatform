# AD-027 Batch 1 — Endpoint Mapping (Final Architect Deliverable)

**Status:** ARCHITECT-LOCKED 2026-05-01

**Source:** Cursor enumeration report 2026-05-01 + AD-027_LOCKED.md (double-patched) + AD-027_BATCH_1_MAPPING_FRAMEWORK.md

**Total endpoints:** 46 across 5 controllers

**Purpose:** Per-endpoint scope/action classification + required guard specification. Direct input to batch 1 implementation Cursor prompt.

---

## Architectural corrections from enumeration (must apply to AD-027)

Before per-endpoint mapping, three architectural corrections triggered by real-code findings:

### Correction 1: Permission decorators as canonical (not just role decorators)

The codebase uses fine-grained permission strings (`edit_workspace_settings`, `view_workspace`, `manage_workspace_members`, `delete_workspace`, `archive_workspace`) via `@RequireWorkspacePermission` decorator. AD-027 originally specified `@WorkspaceRoles('role')` pattern.

**Decision:** Permission decorators ARE canonical. AD-027 needs a third patch to clarify:
- Permission decorators map to role tiers (workspace_owner has ALL permissions; delivery_owner has Config-tier subset; member has Write-tier subset; viewer has Read-tier subset)
- Permission mapping table to be defined as part of batch 1 implementation
- Existing `@RequireWorkspacePermission` continues to be used; not migrated

### Correction 2: Imperative patterns expanded list

In addition to `WorkspaceRoleGuardService` (deprecated per AD-027 Section 4.3), the imperative-pattern list expands to:
- `WorkspaceAccessService.canAccessWorkspace` (5 endpoints in workspaces.controller.ts)
- `WorkspacePolicy.enforceUpdate` (1 endpoint: restore)
- Manual `normalizePlatformRole` / platform role checks in handlers (4+ endpoints)

All migrated to declarative as part of batch 1 implementation.

### Correction 3: Trash is Platform scope, not Workspace scope

`AdminTrashController` operates platform-wide (no `:workspaceId`). All 6 endpoints classified as Platform scope.

---

## PER-ENDPOINT MAPPING — All 46 endpoints

### Controller 1: workspaces.controller.ts (31 endpoints)

| # | Method+Path | Scope | Action | Required Guard | Notes |
|---|---|---|---|---|---|
| 1 | GET resolve/:slug | workspace | read | `@UseGuards(JwtAuthGuard, RequireWorkspaceAccessGuard)` + `@RequireWorkspaceAccess('viewer')` | Migrate from imperative `canAccessWorkspace` |
| 2 | GET slug/:slug | workspace | read | Same as #1 | Migrate from imperative |
| 3 | GET slug/:slug/home | workspace | read | Same as #1 | Service handles enforcement; verify migration |
| 4 | GET / | org | read | `@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)` + `@RequireOrgRole(PlatformRole.MEMBER)` | List workspaces for org; minimum role = member |
| 5 | GET /:id | workspace | read | Same as #1 | Migrate from imperative `canAccessWorkspace` |
| 6 | POST / | org | write | `@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)` + `@RequireOrgRole(PlatformRole.MEMBER)` + entitlement | Workspace creation. Already uses ADMIN — can RELAX to MEMBER per AD-027 Section 3.3. Architect call: keep ADMIN-only for MVP (safer); revisit if customer demand. |
| 7 | PATCH /:id | workspace | config | `@RequireWorkspacePermissionGuard` + `@RequireWorkspacePermission('edit_workspace_settings')` | **Audit emit ALLOW** per Section 12.2 |
| 8 | GET /:id/settings | workspace | read | `@RequireWorkspacePermission('view_workspace')` | Permission-based read |
| 9 | PATCH /:id/settings | workspace | config | `@RequireWorkspacePermission('edit_workspace_settings')` | **Audit emit ALLOW**. Note: includes `ownerId` field which is destructive class — see also #23 changeOwner |
| 10 | GET /:id/dashboard-config | workspace | read | `@RequireWorkspaceAccess('viewer')` | Already correct |
| 11 | PATCH /:id/dashboard-config | workspace | config | `@RequireWorkspacePermission('edit_workspace_settings')` | Already correct. Audit emit ALLOW |
| 12 | DELETE /:id | workspace | destructive | `@RequireWorkspacePermission('delete_workspace')` | **Audit emit ALLOW + DENY** per Section 12.2 |
| 13 | POST /:id/archive | workspace | destructive | `@RequireWorkspacePermission('archive_workspace')` | **Audit emit ALLOW + DENY**. Archive = destructive per AD-027 Section 2.4 reversibility test |
| 14 | POST /:id/restore | workspace | config | `@RequireWorkspacePermission('archive_workspace')` | Migrate from imperative `policy.enforceUpdate`. **Audit emit ALLOW** per Section 12.2 (restore is config per AD-027 Decision 6) |
| 15 | GET /:workspaceId/role | workspace | read | `@RequireWorkspaceAccess('viewer')` | Caller's own role; self-read; minimum = viewer |
| 16 | GET /:workspaceId/summary | workspace | read | `@RequireWorkspaceAccess('viewer')` | Migrate from imperative `canAccessWorkspace` |
| 17 | GET /:id/members | workspace | read | `WorkspaceMembershipFeatureGuard` + `@RequireWorkspaceAccess('viewer')` | Already correct. Feature guard layered on top |
| 18 | POST /:id/members | workspace | config | `WorkspaceMembershipFeatureGuard` + `@RequireWorkspacePermission('manage_workspace_members')` | **Audit emit ALLOW**. Member management = workspace_owner only per Section 3.5 |
| 19 | PATCH /:id/members/:userId | workspace | config | `WorkspaceMembershipFeatureGuard` + `@RequireWorkspacePermission('manage_workspace_members')` | **Section 3.6 application:** Service layer MUST block self-promotion (user cannot change their own role). Not split into self/other endpoint — handled at service. **Audit emit ALLOW + DENY** |
| 20 | DELETE /:id/members/:userId | workspace | destructive | Same | **Section 3.6 SPLIT REQUIRED:** Add new endpoint `DELETE /:id/members/me` (self-leave, JWT-only). Original endpoint stays workspace_owner only for removing OTHERS. **Audit emit both** |
| 21 | PATCH /:id/members/:memberId/suspend | workspace | config | Same | Membership row id, not user id. **Audit emit ALLOW** |
| 22 | PATCH /:id/members/:memberId/reinstate | workspace | config | Same | **Audit emit ALLOW** |
| 23 | POST /:id/change-owner | workspace | destructive | `WorkspaceMembershipFeatureGuard` + `@RequireOrgRole(PlatformRole.ADMIN)` | Owner change is destructive (irreversible without ceremony). Currently org ADMIN — keep. **Audit emit ALLOW + DENY** |
| 24 | PATCH /:id/owners | workspace | destructive | Same as #23 | Replace owner set. Same classification |
| 25 | POST /:id/invite-link | workspace | config | `WorkspaceMembershipFeatureGuard` + `@RequireWorkspacePermission('manage_workspace_members')` | Already correct. **Audit emit ALLOW** |
| 26 | DELETE /:id/invite-link/:linkId | workspace | config | Same | Revoke link by id. Audit emit ALLOW |
| 27 | GET /:id/invite-link | workspace | read | `WorkspaceMembershipFeatureGuard` + `@RequireWorkspaceAccess('viewer')` | Already correct |
| 28 | DELETE /:id/invite-link/active | workspace | config | Same as #25 | Audit emit ALLOW |
| 29 | POST join | workspace | write | **ARCHITECT DECISION NEEDED** | JSDoc says optional auth; class has JwtAuthGuard. See Open Question Q1 below |
| 30 | POST /:id/members/invite | workspace | config | Same as #25 | Stub endpoint. Per AD-029 Section 1.3, stub stays guarded |
| 31 | GET /:id/resource-risk-summary | workspace | read | `@RequireWorkspaceAccess('viewer')` | Add explicit guard; service-layer enforcement insufficient per AD-027 |

### Controller 2: admin/workspace-members.controller.ts (4 endpoints)

All endpoints inherit `@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)` + `@RequireOrgRole(PlatformRole.ADMIN)` at class level. Already correct per AD-027.

| # | Method+Path | Scope | Action | Required Guard | Notes |
|---|---|---|---|---|---|
| 32 | GET /workspaces/:workspaceId/members | platform | read | Class-level (ADMIN required) | Admin tooling. Audit emit NO (read) |
| 33 | POST /workspaces/:workspaceId/members | platform | config | Class-level | Admin add member. **Audit emit ALLOW** (config action) |
| 34 | PATCH /workspaces/:workspaceId/members/:memberId | platform | config | Class-level | Admin update role. **Audit emit ALLOW** |
| 35 | DELETE /workspaces/:workspaceId/members/:memberId | platform | destructive | Class-level | Admin remove member. **Audit emit ALLOW + DENY** |

**Architectural note:** This controller is Platform scope despite operating on workspace data, because the guard requires Platform Admin (not workspace role). This is a platform admin operating ON a workspace, not a workspace user operating IN their workspace. Distinction matters for audit.

### Controller 3: admin/workspaces-maintenance.controller.ts (2 endpoints)

Same class-level guards. Platform scope.

| # | Method+Path | Scope | Action | Required Guard | Notes |
|---|---|---|---|---|---|
| 36 | GET admin/workspaces/maintenance/cleanup-test/candidates | platform | read | Class-level | List cleanup candidates. Audit emit NO |
| 37 | POST admin/workspaces/maintenance/cleanup-test | platform | destructive | Class-level | Run cleanup (deletes test workspaces). **Audit emit ALLOW + DENY** |

### Controller 4: workspace-modules.controller.ts (3 endpoints)

| # | Method+Path | Scope | Action | Required Guard | Notes |
|---|---|---|---|---|---|
| 38 | GET /workspaces/:workspaceId/modules | workspace | read | **ADD** `RequireWorkspaceAccessGuard` + `@RequireWorkspaceAccess('viewer')` | Currently JWT-only; missing workspace-scope guard |
| 39 | GET /workspaces/:workspaceId/modules/:moduleKey | workspace | read | Same | Currently JWT-only; same gap |
| 40 | PATCH /workspaces/:workspaceId/modules/:moduleKey | workspace | config | Currently uses `@RequireOrgRole(PlatformRole.ADMIN)` — keep | Module toggle. Strict authority retained. **Audit emit ALLOW + DENY** (config action affecting workspace state) |

**Architectural note:** Endpoints 38 + 39 are Category C2 gaps from original discovery — JWT-only when they should be workspace-scoped. Migrating to proper guards as part of batch 1 implementation.

### Controller 5: admin-trash.controller.ts (6 endpoints)

All endpoints inherit `@UseGuards(JwtAuthGuard, AdminOnlyGuard)` at class level. Platform scope (operates platform-wide on soft-deleted items).

| # | Method+Path | Scope | Action | Required Guard | Notes |
|---|---|---|---|---|---|
| 41 | GET admin/trash/retention-policy | platform | read | Class-level | Read static config. Audit emit NO |
| 42 | GET admin/trash | platform | read | Class-level | List trash items. Audit emit NO |
| 43 | POST admin/trash/purge | platform | destructive | Class-level | Bulk purge. **Audit emit ALLOW + DENY** per Section 12.2. Bulk operation per Section 2.6 |
| 44 | POST admin/trash/:entityType/:id/restore | platform | config | Class-level | Restoration is config per AD-027 Decision 6. **Audit emit ALLOW** |
| 45 | DELETE admin/trash | platform | destructive | Class-level | Clear all trash. **Audit emit ALLOW + DENY** |
| 46 | DELETE admin/trash/:entityType/:id | platform | destructive | Class-level | Permanent delete. **Audit emit ALLOW + DENY** |

---

## Open architect decisions for batch 1

### Q1: POST /workspaces/join — auth required or optional?

**Status:** REQUIRES PRODUCT OWNER INPUT

JSDoc says "auth optional"; class-level guard is `JwtAuthGuard` (auth required).

**Two interpretations:**
- (a) JSDoc is stale; auth is required. User must be logged in to join workspace via separate flow (e.g., paste invite token in app).
- (b) Class guard is wrong; should be OptionalJwtAuthGuard. New users can register-and-join in one flow.

**Implication for AD-027:** If (a), endpoint stays workspace-scoped, requires authenticated user, no special handling. If (b), endpoint is Public scope per Section 1.1, needs to be added to public allowlist.

**Architect lean:** (a). Invite-link flow exists separately for unauthenticated joins (POST /:id/invite-link creates the link; that link probably has its own unauthenticated acceptance endpoint). The "join" endpoint operating on already-authenticated users matches existing behavior. JSDoc is stale documentation.

**Action:** Will mark as (a) for batch 1 implementation. Confirm with PO.

### Q2: Permission-to-role mapping table

Per Correction 1, AD-027 needs to formalize how permission strings map to role tiers. Sample table:

| Permission | Required role |
|---|---|
| `view_workspace` | workspace_viewer |
| `view_dashboard` | workspace_viewer |
| `edit_workspace_settings` | workspace_owner OR delivery_owner |
| `manage_workspace_members` | workspace_owner |
| `delete_workspace` | workspace_owner |
| `archive_workspace` | workspace_owner |

**Action:** Needs to be locked as AD-027 patch #3 OR documented in a separate AD (AD-028 or new). Architect lean: include in AD-027 patch #3 because it's the same architectural concern.

---

## Summary statistics

| Category | Count |
|---|---|
| Workspace scope | 35 (workspaces.controller.ts: 28 of 31, plus workspace-modules.controller.ts: 3) |
| Org scope | 2 (workspaces.controller.ts: GET / and POST /) |
| Platform scope | 12 (workspace-members 4 + maintenance 2 + admin-trash 6) |

| Action | Count |
|---|---|
| Read | 17 |
| Write | 1 (join) |
| Config | 18 |
| Destructive | 10 |

**Endpoints requiring audit emission per Section 12.2:** 28 (all Config + Destructive actions)

**Endpoints needing migration from imperative pattern:** ~10 (canAccessWorkspace × 5, policy.enforceUpdate × 1, manual role checks × 4)

**Endpoints needing NEW guards (Category C2 gaps):** 3 (workspace-modules GETs × 2, resource-risk-summary × 1)

**Section 3.6 split required:** 1 (DELETE /:id/members/:userId → split self-leave endpoint)

---

## Implementation prompt scope (estimated)

The batch 1 implementation Cursor prompt will include:
1. Build `AuditService.recordGuardEvent` method (per AD-027 Section 12.2)
2. Build `GuardAuditInterceptor` (per AD-027 Section 12.3)
3. Apply guards to 46 endpoints per this mapping
4. Migrate ~10 endpoints from imperative to declarative
5. Add ~3 Category C2 missing guards
6. Split 1 endpoint per Section 3.6 (self-leave)
7. Wire interceptor metadata for audit emission
8. Add tests using PR #225 harness — 46 endpoints × 5 tests = 230 tests minimum (workspace scope), plus org/platform scope tests
9. AD-027 patch #3 for permission-to-role mapping table (architect work, parallel)

**Realistic Cursor effort:** 2-3 weeks. Likely needs to be split into sub-prompts for review fatigue management.

**Sub-prompt split options:**
- 1a: Build interceptor + recordGuardEvent (infrastructure only)
- 1b: Apply guards to controllers 1+4 (workspaces + workspace-modules)
- 1c: Apply guards to controllers 2+3+5 (admin controllers, simpler)
- 1d: Add Section 3.6 self-leave endpoint
- 1e: Add tests using harness across all of 1b-1d

Each sub-prompt is bounded; each gets full 4-gate review.

---

## Document end

This artifact is direct input to AD-027 batch 1 implementation Cursor prompts. Architect-locked 2026-05-01.
