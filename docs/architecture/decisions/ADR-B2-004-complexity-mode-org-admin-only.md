# ADR-B2-004 — `complexity_mode` change is Org Admin only

**Status:** Accepted (2026-05-09).
**Build:** B2.

## Context

`complexity_mode` is not a cosmetic preference — it gates governance enforcement (Programs availability, capacity policies, gate workflows, exception handling). Allowing a Workspace Owner to flip a workspace from `governed` to `lean` would let them turn off enforcement on themselves. The recon found `setComplexityMode` had no internal permission check (its comment said "Caller is responsible for permission checks (controller guard)"); the controller doesn't exist yet, so until B2 there was no exposure.

## Decision

The `PATCH /api/v1/workspaces/:id/complexity-mode` endpoint (introduced in PR2) requires `RequireOrgRole(PlatformRole.ADMIN)` via the existing `RequireOrgRoleGuard`. Workspace Owners can request a mode change via the UI (Stream B), but the backend rejects any caller whose normalized platform role is below `ADMIN`.

Defense-in-depth: `WorkspacesService.setComplexityMode` accepts an `actorPlatformRole` parameter and throws `ForbiddenException` with code `WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY` if the caller is not `ADMIN`. This means programmatic callers (other services, scripts, admin tools) cannot accidentally bypass the guard by skipping the controller.

Every mode change emits an `audit_events` row with action `complexity_mode_changed`. Both the audit constant and the `audit_events.action` CHECK-constraint extension shipped in PR1 (the latter via migration `18000000000171`, moved forward from PR2 per the PR1 review verdict's Q1 resolution to eliminate a "silent swallow" debuggability gap).

### Idempotent calls

`setComplexityMode` returns early without emitting an audit row when `previousMode === mode` (same value the workspace already has). The decision: don't pollute the audit log with no-op writes from idempotent callers (admin scripts, deployment runbooks, retry logic).

Trade-off: an admin running a script that sets the mode unconditionally leaves no audit trace per execution, only on actual transitions. This is the right pre-MVP call — audit churn from idempotent retries would dilute the signal far more than it would help reconstruct intent. If audit-of-attempts becomes a requirement (e.g., regulated environments), revisit this with a low-weight "complexity_mode_attempted" action that distinguishes attempts from transitions, rather than removing the early-return.

### Strict actor identity (Q4 from PR1 review)

`setComplexityMode` rejects calls where `actor.platformRole == null || ''` with `InternalServerErrorException` and code `COMPLEXITY_MODE_AUDIT_ACTOR_MISSING`. The check runs on the raw input *before* `normalizePlatformRole` (which silently downgrades missing input to `VIEWER` for legacy compatibility). Without this, a JWT/guard configuration bug would emit a misleading 403 instead of the diagnostic 500 — and the audit row would carry a placeholder actor. Better to fail loudly than to write garbage.

### Service-level rejection of deprecated values (PR2 / item 3 from PR1 self-audit)

PR2 adds `BadRequestException` if `mode === SIMPLE || mode === ADVANCED`. The DTO already restricts the HTTP boundary, but defense-in-depth requires the service layer to refuse legacy values from any caller (programmatic callers, future internal services). This enforces ADR-B2-001's "do not introduce new code paths that *write* SIMPLE or ADVANCED" at the right layer.

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
