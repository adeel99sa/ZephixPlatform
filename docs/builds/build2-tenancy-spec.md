# Build 2 — Tenancy & Workspace + complexity_mode (Backend Spec)

**Status:** Locked. Author: Stream A dispatch. Recon: Stream C (2026-05-09).

## 1. Confirmed inputs from recon

- `complexity_mode` is at the data layer: enum `{simple, standard, advanced}` on `workspaces.complexity_mode` (migration `18000000000080`). Service methods `getComplexityMode` / `setComplexityMode` exist in `workspaces.service.ts`. Not yet wired to any HTTP endpoint, DTO, or frontend. No internal permission check.
- Programs module is fully built (`modules/programs/`), workspace-scoped, with services + controller + migrations. Real, not stub.
- `EntitlementService` is the canonical quota mechanism. `assertWithinLimit(orgId, key, currentValue)` at `modules/billing/entitlements/entitlement.service.ts`. Registry has `max_projects`, `max_portfolios`, `max_scenarios`, `max_storage_bytes`, `api_rate_multiplier`, `attachment_retention_days`. **No `max_users`, no `max_workspaces` today.**
- Two parallel billing systems: legacy `src/billing/` (JSONB plan rows with `maxUsers`/`maxWorkspaces`) and Phase 3A `src/modules/billing/entitlements` (registry-shaped). **Phase 3A is canonical for B2.**
- Default workspace creation is **not** auto-triggered on org signup (by design — `feedback_workspace_creation_truthfulness`). Preserve.
- Workspace snapshot endpoint at `admin.controller.ts:713-755` returns hardcoded `UNKNOWN` literals for `budgetStatus`, `capacityStatus`, `projectCount: 0`, `openExceptions: 0`, `owners: []`. Real wiring is B2 scope where engines exist; `UNKNOWN` remains for B10/B13 fields.
- Latest migration is `18000000000150`. B2 migrations start at `18000000000160+`.

## 2. Locked PO decisions

- **D1** — `complexity_mode` renamed to `lean | standard | governed` (3 values). Three-stage migration: additive → backfill → drop. `simple → lean`, `advanced → governed`, `standard` unchanged.
- **D2** — Org Admin only can change `complexity_mode`. Workspace Owner can request via UI but cannot execute.
- **D3** — Programs gated by `complexity_mode = governed` only. `lean` and `standard` workspaces cannot create Programs; existing Programs in non-governed workspaces are read-only with banner.
- **D4** — Free tier limits: 1 admin + 2 users (3 total) + 2 workspaces. Add `max_users` and `max_workspaces` to entitlement registry.
- **D5** — Slug-canonical URLs (frontend Stream B owns; backend exposes slug-resolve endpoint already at `GET /workspaces/slug/:slug/home`).
- **D6** — Workspace snapshot `UNKNOWN` replacement: real values where engines exist (project count, owners). `UNKNOWN` preserved for `budgetStatus`, `capacityStatus` until B10/B13.
- **D7** — Default workspace on org signup: preserved as-is, no auto-create.

## 3. PR structure

- **PR1** (`build2/tenancy-foundations`): Stage 1 migration (additive enum values), entitlement registry additions, services + DTOs + tests, feature flag `B2_TENANCY_V2_ENABLED` off. Mergeable to `staging` without behavior change.
- **PR2** (`build2/tenancy-cutover`): Stage 2 migration (backfill), HTTP endpoints, Programs gating logic, snapshot wiring, audit action constraint migration, flag flip in deployment runbook. Coordinates with Stream B's frontend PR.
- **PR3** (`build2/tenancy-cleanup`): Stage 3 migration (drop old enum values), drop legacy `src/billing/` JSONB code paths after staging soak. Solo PR after 7-day soak.

## 4. PR1 scope (this PR)

### 4.1 Migrations — Stage 1 + audit CHECK extension

Two migrations shipped in PR1:

**`src/migrations/18000000000160-RenameComplexityModeStage1Additive.ts`** — Stage 1 enum expansion:
- `ALTER TYPE workspace_complexity_mode_enum ADD VALUE IF NOT EXISTS 'lean'`
- `ALTER TYPE workspace_complexity_mode_enum ADD VALUE IF NOT EXISTS 'governed'`
- `standard` remains.
- `down()` is a partial rollback — Postgres cannot remove enum values cleanly without a full type swap. Document forward-only.

**`src/migrations/18000000000171-AddComplexityModeChangedToAuditEvents.ts`** — audit CHECK extension (Q1 from PR1 review verdict, originally scoped to PR2, moved forward):
- Drops + recreates `CHK_audit_events_action` with the prior allow-list preserved + `'complexity_mode_changed'` appended.
- Pattern mirrors migrations 082/083 (Template Center action expansions).
- `down()` restores the prior allow-list. Operator must `DELETE FROM audit_events WHERE action='complexity_mode_changed'` before revert if violating rows exist; constraint creation will otherwise fail.
- Reason it moved to PR1: avoid a window where setComplexityMode emits silently-swallowed audit rows. PR1 dormancy means production has zero `complexity_mode_changed` rows, so the migration has no downside in the early position.

### 4.2 Entitlement registry expansion

Code change (not a DB migration). `src/modules/billing/entitlements/entitlement.registry.ts`:

- `max_users`: `{ free: 3, team: 10, enterprise: null /* unlimited */, custom: null }`
- `max_workspaces`: `{ free: 2, team: 10, enterprise: null, custom: null }`
- All existing keys preserved.

### 4.3 Entity update

`src/modules/workspaces/entities/workspace.entity.ts`:

- Add new enum values `LEAN = 'lean'`, `GOVERNED = 'governed'` to `WorkspaceComplexityMode`.
- Mark legacy values `SIMPLE`, `ADVANCED` as `@deprecated` (removal target: PR3).
- Column default stays `'simple'` for PR1; PR2 backfill flips default to `'lean'`.
- **Deviation note:** Spec text says "enum updated to {lean, standard, governed}" but PR1 must keep `SIMPLE`/`ADVANCED` referenceable (column default literal + 16 existing test cases reference them). Treating PR1 as additive; full removal in PR3 is consistent with three-stage migration philosophy.

### 4.4 DTOs

`src/modules/workspaces/dto/complexity-mode.dto.ts` (new):

- `GetComplexityModeResponseDto`: `{ mode: 'lean' | 'standard' | 'governed' }`
- `UpdateComplexityModeDto`: `{ mode: 'lean' | 'standard' | 'governed' }`
- DTO validation accepts only the new three values via `class-validator @IsEnum`.

### 4.5 Service layer

`src/modules/workspaces/workspaces.service.ts`:

- `setComplexityMode` gains an `actor: { userId, platformRole, ... }` parameter. Two guards in order:
  1. **Q4 strict actor identity** (PR1 review verdict): if `actor.platformRole == null || ''`, throws `InternalServerErrorException` with code `COMPLEXITY_MODE_AUDIT_ACTOR_MISSING`. This catches JWT/RequireOrgRoleGuard configuration bugs that would otherwise silently downgrade missing roles to `VIEWER` (via `normalizePlatformRole`'s legacy-compat default) and emit a misleading 403.
  2. **Admin check**: if normalized role is below `ADMIN`, throws `ForbiddenException` with code `WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY`.
- Audit emission via `AuditService.record({ action: AuditAction.COMPLEXITY_MODE_CHANGED, ... })`. Migration `18000000000171` (PR1) widened the `audit_events.action` CHECK so emits land on first PR2 controller invoke — no audit gap window.
- Idempotent no-op: if `previousMode === mode` the call returns without emitting an audit row. This is intentional (no audit churn for repeated identical writes); see ADR-B2-004 §"Idempotent calls".

### 4.6 Programs gating service

`src/modules/programs/services/programs-gating.service.ts` (new):

- `isProgramsAvailable(workspaceId): Promise<boolean>` — true iff `workspace.complexity_mode === 'governed'`.
- `assertProgramsAvailable(workspaceId): Promise<void>` — throws `ForbiddenException` with code `PROGRAMS_NOT_AVAILABLE_FOR_TIER` if not governed.
- Wired into `ProgramsService.create()` in PR2; bare service exists in PR1 to unit-test in isolation.

### 4.7 Quota enforcement

- `OrganizationsService.inviteUser`: before persisting `UserOrganization`, call `entitlementService.assertWithinLimit(orgId, 'max_users', currentUserCount)`. Throws `ForbiddenException` with code `MAX_USERS_LIMIT_EXCEEDED` on free tier 4th user.
- `WorkspacesService.createWithOwners`: before creating workspace, call `entitlementService.assertWithinLimit(orgId, 'max_workspaces', currentWorkspaceCount)`. Throws with code `MAX_WORKSPACES_LIMIT_EXCEEDED` on free tier 3rd workspace.

### 4.8 Feature flag

`B2_TENANCY_V2_ENABLED` added to `feature-flags.config.ts`. **Off in PR1.** Flipped on in PR2 cutover deployment runbook.

### 4.9 Tests

- Unit:
  - `WorkspacesService.setComplexityMode`: org admin allowed, non-admin denied (`WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY`).
  - `WorkspacesService.getComplexityMode`: returns current value (existing tests preserved).
  - `ProgramsGatingService`: governed allowed, lean denied, standard denied, missing workspace 404.
  - `OrganizationsService.inviteUser`: free tier 4th user blocked.
  - `WorkspacesService.createWithOwners`: free tier 3rd workspace blocked.
  - Entitlement registry: `max_users` / `max_workspaces` resolve correctly per plan code.
- R1 integration (real Postgres schema):
  - `src/modules/workspaces/services/__tests__/workspaces.complexity-mode.real-schema.spec.ts` — 4-test pattern (positive, negative-control for legacy enum values, source-integrity, schema-sanity).

## 5. Exit criteria — PR1

**All met. PR1 merged at `c50061d7…` on 2026-05-09T20:25:17Z.**

- ✅ Both migrations (160 + 171) run forward + back + forward against staging-copy DB.
- ✅ All new tests pass (51/51 PR1 jest); `tsc --noEmit` clean.
- ✅ Wave9 governance smoke 10/10 against PR1 deploy.
- ✅ Feature flag `B2_TENANCY_V2_ENABLED` confirmed off.
- ✅ B1 endpoints unchanged in behavior (5/5 spot-check + dormancy probe).

## 6. Rollback criteria

If post-PR1 deploy: Wave9 drops below 10/10, any B1 endpoint regresses, or Stage 1 migration fails forward or back on staging-copy → revert to pre-PR1 state and report. **Do not fix forward.**

## 7. PR2 scope (cutover)

PR2 inherits the original dispatch's scope plus six items from the PR1 review verdict and self-audit.

**Original PR2 scope (from dispatch):**
- Migration 18000000000170 — Stage 2 backfill (`simple → lean`, `advanced → governed`, `DEFAULT 'lean'`).
- HTTP endpoints: `GET /api/v1/workspaces/:id/complexity-mode` (any member), `PATCH /api/v1/workspaces/:id/complexity-mode` (`RequireOrgRole(ADMIN)`).
- Programs gating wired into `ProgramsService.create()` behind `B2_TENANCY_V2_ENABLED`.
- Workspace snapshot wiring: `projectCount` and `owners` from real data; `budgetStatus`/`capacityStatus` preserved as `UNKNOWN` until B10/B13.
- Audit migration `18000000000171` — **already shipped in PR1 (Q1 reshuffle)**.
- Feature flag flip in deployment runbook.

**Verdict-added PR2 items:**
- **Q2** — Extend `max_users` quota gate to `WorkspaceInviteService.acceptInvite` (workspace-scoped invite path also creates `UserOrganization` rows on acceptance and must not bypass the seat limit).
- **Q3** — `ComplexityModeResponseDto` returns `{ mode, updatedAt, updatedBy: { id, email } }` matching Stream B's locked types in `features/workspaces/types.ts`. Verify at controller wiring.
- **Item 2** (self-audit) — ADR-B2-004 gains a paragraph explaining the idempotent no-op audit-omission trade-off.
- **Item 3** (self-audit) — `setComplexityMode` rejects writes of deprecated `SIMPLE`/`ADVANCED` values with `BadRequestException`. Defense-in-depth at the service layer; the DTO already restricts the HTTP boundary.
- **Item 4** (self-audit) — `ProgramsGatingService` gains `(orgId, workspaceId)` signature for tenant-scoping consistency with the rest of the workspaces surface.
- **Item 5** (self-audit) — `OrganizationsService.inviteUser` runs the existing-member lookup before the quota gate so re-inviting an already-active member returns `ConflictException` (existing behavior) instead of `MAX_USERS_LIMIT_EXCEEDED` at the seat limit.
- **Item 6** (self-audit) — This refresh of the spec doc itself (committed first in PR2).

**Deferred to platform-wide tickets (not B2 scope):**
- Quota count→assert→create race vulnerability across all six call sites (portfolios, projects, scenarios, attachments, max_users, max_workspaces). Trigger: pre-public-beta. Pattern fix needed for all sites at once (advisory locks or counter table).
- `AuditService.recordTransactional(input, manager)` overload for callers that need audit-state atomicity. Migrate critical-path engines (governance, identity, billing) first.

## 8. References

- `docs/architecture/decisions/ADR-B2-001-complexity-mode-three-stage-rename.md`
- `docs/architecture/decisions/ADR-B2-002-entitlement-registry-canonical.md`
- `docs/architecture/decisions/ADR-B2-003-programs-gated-by-governed.md`
- `docs/architecture/decisions/ADR-B2-004-complexity-mode-org-admin-only.md`
