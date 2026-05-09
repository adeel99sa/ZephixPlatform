# ADR-B2-004 — `complexity_mode` change is Org Admin only

**Status:** Accepted (2026-05-09).
**Build:** B2.

## Context

`complexity_mode` is not a cosmetic preference — it gates governance enforcement (Programs availability, capacity policies, gate workflows, exception handling). Allowing a Workspace Owner to flip a workspace from `governed` to `lean` would let them turn off enforcement on themselves. The recon found `setComplexityMode` had no internal permission check (its comment said "Caller is responsible for permission checks (controller guard)"); the controller doesn't exist yet, so until B2 there was no exposure.

## Decision

The `PATCH /api/v1/workspaces/:id/complexity-mode` endpoint (introduced in PR2) requires `RequireOrgRole(PlatformRole.ADMIN)` via the existing `RequireOrgRoleGuard`. Workspace Owners can request a mode change via the UI (Stream B), but the backend rejects any caller whose normalized platform role is below `ADMIN`.

Defense-in-depth: `WorkspacesService.setComplexityMode` accepts an `actorPlatformRole` parameter and throws `ForbiddenException` with code `WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY` if the caller is not `ADMIN`. This means programmatic callers (other services, scripts, admin tools) cannot accidentally bypass the guard by skipping the controller.

Every mode change emits an `audit_events` row with action `complexity_mode_changed` (audit constant added in PR1; CHECK-constraint migration in PR2).

## Consequences

- **+** Governance integrity preserved — workspace-level escape from enforcement is impossible.
- **+** Audit trail captures every change with actor, before/after, timestamp.
- **+** Defense-in-depth: guard at controller, assertion at service. Either failing alone blocks the change.
- **−** Workspace Owners cannot self-serve. UX must surface a "request from Org Admin" path (Stream B).
- **−** Admin Console must expose a per-workspace mode-change UI (Stream B) so admins don't have to call the API directly.

## Alternatives considered

- **Workspace Owner can flip own workspace**: rejected — lets governance be opted out unilaterally; defeats the purpose of `complexity_mode`.
- **Org Admin or Workspace Owner**: rejected — same problem, just narrower attack surface.
- **Service-level role check only (no controller guard)**: rejected — the controller guard provides a fast-fail before the service is invoked, and matches the codebase convention used for every other admin-only mutation.
