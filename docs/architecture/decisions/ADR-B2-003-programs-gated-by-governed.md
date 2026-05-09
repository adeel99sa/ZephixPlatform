# ADR-B2-003 — Programs gated by `complexity_mode = governed`

**Status:** Accepted (2026-05-09).
**Build:** B2.

## Context

Programs is a real, fully-built workspace-scoped module (`src/modules/programs/`) — entity, services, controller, KPI rollup, migration `1788000000000` made `programs.workspace_id NOT NULL`. PO has decided Programs is a governed-tier capability: only workspaces in the `governed` complexity tier can create new Programs. `lean` and `standard` workspaces should not be able to create Programs, but **existing** Programs in non-governed workspaces remain readable (Stream B's frontend shows a banner).

## Decision

A new `ProgramsGatingService` (in `modules/programs/services/`) provides:

- `isProgramsAvailable(workspaceId): Promise<boolean>` — returns `true` iff the workspace's `complexity_mode === 'governed'`.
- `assertProgramsAvailable(workspaceId): Promise<void>` — throws `ForbiddenException` with code `PROGRAMS_NOT_AVAILABLE_FOR_TIER` if not governed.

In PR2 cutover, `ProgramsService.create()` calls `assertProgramsAvailable(workspaceId)` before its existing logic. List/get/update/delete operations remain unchanged for backward compatibility — read paths are deliberately not gated.

PR1 ships the bare service + unit tests; the wiring into `ProgramsService.create()` is PR2 (gated by `B2_TENANCY_V2_ENABLED`).

## Consequences

- **+** Marketing-aligned tier gating; Programs becomes the visible reason to upgrade past `standard`.
- **+** Read-only preservation respects existing customer data; no destructive cleanup.
- **+** Single chokepoint in `create()` — easier to audit than scattering checks across update/delete.
- **−** Existing Programs in non-governed workspaces become permanently read-only unless the workspace is upgraded. Stream B handles UX (banner with "request upgrade" link).
- **−** Any background or batch process that creates Programs (e.g., template instantiation) must be audited to confirm it routes through the gated path.

## Alternatives considered

- **Hard-block on read too**: rejected — PO explicitly preserved read access for legacy Programs; hiding them would surprise customers and violate data-visibility expectations.
- **Soft-warn (allow create, show warning)**: rejected — no enforcement, no upgrade signal, no protection of governance integrity.
- **Gate on plan instead of complexity_mode**: rejected — `complexity_mode` is the correct axis (governance maturity), not billing tier; an Enterprise-billed customer can still run a `lean` workspace and would get an inappropriate upgrade prompt.
