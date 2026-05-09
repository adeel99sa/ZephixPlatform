# ADR-B2-002 — Phase 3A entitlement registry as canonical quota mechanism

**Status:** Accepted (2026-05-09).
**Build:** B2.

## Context

Two billing/quota systems coexist in the backend:

1. Legacy `src/billing/` — JSONB `plans.features` rows store `maxUsers`, `maxWorkspaces`, `maxProjects`, etc. Used by `src/billing/services/plans.service.ts` and `subscriptions.service.ts`. Stripe-shaped. No type-safety on plan keys.
2. Phase 3A `src/modules/billing/entitlements/` — typed registry at `entitlement.registry.ts` keyed by `PlanCode` enum, served by `EntitlementService.assertWithinLimit()`. Already wired into `projects.service`, `portfolios.service`, `scenarios.service`, `attachments.service` for resource quota enforcement.

B2 introduces tenant quotas (`max_users`, `max_workspaces`) for the free-tier (3 users / 2 workspaces). Choosing where to enforce them is the decision.

## Decision

The Phase 3A entitlement registry is the canonical quota mechanism for B2 and going forward. Legacy `src/billing/` JSONB plan keys (`maxUsers`, `maxWorkspaces`) are deprecated and removed in PR3 after a 7-day staging soak.

`max_users` and `max_workspaces` are added to `EntitlementKey` and `EntitlementDefinition` and populated for all four `PlanCode` values:

- `free`: `max_users: 3`, `max_workspaces: 2`
- `team`: `max_users: 10`, `max_workspaces: 10`
- `enterprise`: `max_users: null` (unlimited), `max_workspaces: null`
- `custom`: `max_users: null`, `max_workspaces: null` (override via `plan_metadata`)

Enforcement call sites:
- `OrganizationsService.inviteUser` → `assertWithinLimit(orgId, 'max_users', currentUserCount)` before creating `UserOrganization`.
- `WorkspacesService.createWithOwners` → `assertWithinLimit(orgId, 'max_workspaces', currentWorkspaceCount)` before creating `Workspace`.

Both throw `ForbiddenException` with structured codes (`MAX_USERS_LIMIT_EXCEEDED`, `MAX_WORKSPACES_LIMIT_EXCEEDED`) and emit `quota_block` audit events via the existing `EntitlementService` log hook.

## Consequences

- **+** Single source of truth for plan limits; type-safe registry vs. JSONB.
- **+** All four B2 free-tier limits resolve through one query path (`Organization` + `EntitlementService.resolve`).
- **+** Existing call sites in `projects` / `portfolios` / `scenarios` / `attachments` already use this mechanism — consistency.
- **−** Migration of any custom-plan JSONB data is needed in PR3 (recon found no production custom-plan rows; staging only).
- **−** Legacy `src/billing/plans.service.ts` callers still read JSONB features; reads remain working but write paths are deprecated. Cleanup is PR3's responsibility.

## Alternatives considered

- **Use legacy JSONB `maxUsers` / `maxWorkspaces`**: rejected — JSONB is untyped, drift-prone, and the legacy module has no `assert*` helper to reuse. Would require building a parallel enforcement layer.
- **Add a third dedicated `tenancy-quota` module**: rejected — three quota systems is one too many; entitlement registry already serves the same purpose.
