# F-D — Capability Registry & Feature Flags

**Status**: **Distributed substrate, not a dedicated module** (per architect Gate 2.5 Refinement 2). Substrate is real and shipped; consolidation into a dedicated capability-registry module is forward roadmap.
**Owner Foundation**: F-D (per Blueprint v2 §4)
**Foundation Boundary**: Feature flag registry, tenant-scoped capability gating (`complexity_mode`), feature-flag guards, environment bypass policy, live-infra probe discipline (Lesson #34)
**HEAD at authoring**: `c34b0468` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

**Distributed-substrate framing (per architect Gate 2.5 Refinement 2):** F-D is *not* a single module the way F-A (audit), F-B (notifications), and F-C (integrations) are. F-D's substrate lives in three places: a config-level registry (`config/feature-flags.config.ts`), a workspace-entity capability column (`complexity_mode`), and feature-flag guards (`WorkspaceMembershipFeatureGuard` + `RequireProjectWorkspaceRoleGuard`). This document honors the shipped reality, not a fictional consolidated module.

**Lesson #34 explicit application:** The Lesson #34 case (`ZEPHIX_WS_MEMBERSHIP_V1=1` was live on staging but documented as "pending ops action" in memory) is anchored here as architectural discipline: **live-infrastructure probe before treating documented state as ground truth.** Section F-D.5.1 codifies this; FW-F-D-003 closes the gap structurally.

**Naming convention:** `Debt-F-D-XXX` for current debt; `FW-F-D-XXX` for forward-roadmap items.

---

## F-D.1 Purpose & Scope

F-D answers two questions for the platform: **"can this customer use this feature, given their tier / contract / opt-in posture?"** and **"is this feature even available in this environment, given operator decisions about staged rollout?"** F-D owns the substrate that gates capability without hard-coding it into business logic.

### What F-D IS responsible for

- **Process-wide feature flag registry** — [`config/feature-flags.config.ts`](zephix-backend/src/config/feature-flags.config.ts) typed `FeatureFlags` interface, 14 named flags
- **Tenant-scoped capability column** — `complexity_mode` enum on workspace entity (per AD-026 migration `18000000000080`)
- **Feature flag guards** — `WorkspaceMembershipFeatureGuard` (dedicated), `RequireProjectWorkspaceRoleGuard` (consults flag inline)
- **Environment-aware bypass policy** — dev / test bypass; staging + production evaluate flag
- **Structured FEATURE_DISABLED error contract** — `{ code: 'FEATURE_DISABLED', feature: '<flag-name>', message: '...' }`
- **Live-infrastructure probe discipline** — Lesson #34 application; documented state is presumptive, not authoritative

### What F-D is NOT responsible for

- **Tenant scope enforcement** — owned by Engine 2.
- **Permission decisions** — owned by Engine 1. F-D gates *availability* of features; Engine 1 gates *authorization* once available.
- **Per-tenant feature flag override surface** — current flags are process-wide; per-tenant overrides via SaaS-style "growth/enterprise/freemium tier" flag-toggling do not exist (FW-F-D-005).
- **Flag-deployment workflow** — operator concern; environment variable plumbing is deployment territory.
- **A/B testing** — out of scope; flags here are operational gates, not experimentation.

### Foundation boundary tests

| Question | Answer is F-D if… | Answer is *not* F-D if… |
|---|---|---|
| "Does this code read a `process.env.ENABLE_*` or `process.env.ZEPHIX_*` flag?" | yes — F-D substrate | the flag is a deployment concern (NODE_ENV, DATABASE_URL) |
| "Does this code consult `complexity_mode`?" | yes — F-D capability gating | it's writing the column (Engine 2 admin surface) |
| "Does this code throw `code: 'FEATURE_DISABLED'`?" | yes — F-D guard | it's `code: 'FORBIDDEN'` (Engine 1 RBAC) |

---

## F-D.2 Architectural Decisions (Retrospective ADRs)

Five decisions shape F-D.

### ADR-F-D-001 — Typed Feature Flag Registry via Nest's `registerAs`

**Context.** Process-wide feature flags can be:

- **(a)** Read inline from `process.env` wherever needed (decentralized, prone to typos).
- **(b)** Centralized in a typed interface registered with `@nestjs/config`'s `registerAs`, accessed via `ConfigService.get('features')`.

**Decision.** Option (b). [`config/feature-flags.config.ts`](zephix-backend/src/config/feature-flags.config.ts) declares a `FeatureFlags` interface with 14 named flags, registered as `'features'`:

```ts
export interface FeatureFlags {
  // Core (always true)
  auth: boolean; organizations: boolean; projects: boolean;
  // Optional (env-driven)
  aiModule: boolean; governanceModule: boolean; documentProcessing: boolean;
  telemetry: boolean; adminPanel: boolean; workflows: boolean;
  workspaceMembershipV1: boolean;
  // Wave 10 (KPI async)
  kpiAsyncRecomputeEnabled: boolean; kpiSchedulerEnabled: boolean;
  portfolioKpiSnapshotsEnabled: boolean; programKpiSnapshotsEnabled: boolean;
}
```

**Consequences.**

- **Type-safety.** TypeScript catches typos at compile time.
- **Single registry of named flags.** A reader can list current flags by reading one file.
- **Cost.** Some controllers and services bypass the registry and read `process.env` directly (Debt-F-D-001) — the registry is the *intended* central source of truth, not an enforced one.

---

### ADR-F-D-002 — `complexity_mode` as Tenant-Scoped Capability Primitive (per AD-026)

**Context.** Process-wide flags suit operator-level rollout decisions ("turn on the AI module for the staging environment"). Tenant-scoped capability gates suit customer-tier decisions ("this organization is on a complexity_mode that includes phase gates"). Process-wide flags cannot model per-tenant tier.

**Decision.** Per AD-026 ([migration 18000000000080](zephix-backend/src/migrations/18000000000080-AddComplexityModeToWorkspaces.ts)): `complexity_mode` enum column on the workspace entity:

```sql
CREATE TYPE workspace_complexity_mode_enum AS ENUM ('simple', 'standard', 'advanced');
ALTER TABLE workspaces ADD COLUMN complexity_mode workspace_complexity_mode_enum NOT NULL DEFAULT 'simple';
```

`WorkspaceComplexityMode` enum at [workspace.entity.ts:36](zephix-backend/src/modules/workspaces/entities/workspace.entity.ts#L36); column at [workspace.entity.ts:148-150](zephix-backend/src/modules/workspaces/entities/workspace.entity.ts#L148). Read via [`WorkspacesService.getComplexityMode()`](zephix-backend/src/modules/workspaces/workspaces.service.ts#L892); written via [`WorkspacesService.setComplexityMode()`](zephix-backend/src/modules/workspaces/workspaces.service.ts#L907).

**Consequences.**

- **Tenant-scoped capability gating becomes possible.** Engine 5 (governance), Engine 7 (capacity), F-B (notifications) can each branch on `complexity_mode` to select feature defaults appropriate to the workspace tier.
- **Schema-stable.** Enum + column shipped; consumers can wire without migration.
- **Currently zero consumer wiring.** Adversarial probe at HEAD: writer (`setComplexityMode`) shipped; **no reader branches on `complexityMode`** for capability gating. Substrate is provisioned, unused. Tracked as `Debt-F-D-003` + cross-references [Engine 5 Debt-Engine-5-002](../engines/engine-5-governance.md#debt-engine-5-002--complexity_mode-consumer-wiring-per-ad-026).

---

### ADR-F-D-003 — Dedicated `WorkspaceMembershipFeatureGuard` with Environment Bypass

**Context.** A feature flag protecting destructive endpoints (workspace membership controls) must produce a clear error response when disabled and must not block local development or test runs.

**Decision.** Dedicated guard [`WorkspaceMembershipFeatureGuard`](zephix-backend/src/modules/workspaces/guards/feature-flag.guard.ts):

```ts
canActivate(context: ExecutionContext): boolean {
  const nodeEnv = configService.get<string>('NODE_ENV', 'production');
  const flagValue = configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1');

  if (nodeEnv === 'development' || nodeEnv === 'test') return true; // bypass

  if (flagValue !== '1') {
    throw new ForbiddenException({
      code: 'FEATURE_DISABLED',
      feature: 'workspace_membership_v1',
      message: 'Workspace membership feature is not enabled for this environment',
    });
  }
  return true;
}
```

**Bypass policy** is intentionally **NOT `NODE_ENV !== 'production'`** — staging runs with `NODE_ENV=production` and must exercise the same guard behavior. Header comment on the file documents this explicitly.

**Consequences.**

- **Structured error contract** — `{ code: 'FEATURE_DISABLED', feature: '<name>', message: '...' }` — clients can distinguish "feature disabled" from "permission denied" or "tenant unknown".
- **Local dev + tests are unaffected** — guard is a no-op outside production-like environments.
- **Staging behaves like production** — by design, staging exercises the guard. Customers can trust that what they see on staging is what they'll see in production.

---

### ADR-F-D-004 — Distributed Substrate Acknowledged (Not Yet Consolidated)

**Context.** F-D's substrate is in three structurally different places:

- Config-level (process-wide flags): `config/feature-flags.config.ts`
- Entity-level (tenant-scoped capability): `workspace.entity.ts complexity_mode`
- Guard-level (route-level enforcement): `WorkspaceMembershipFeatureGuard`, `RequireProjectWorkspaceRoleGuard`

A consolidated capability-registry module would unify these — one service answers "can this user use this feature in this workspace at this time?" — but does not exist today.

**Decision.** **Acknowledge the distributed substrate honestly.** Document the three sites + their relationships. Treat consolidation as forward roadmap (`FW-F-D-001`), not as architectural debt.

**Consequences.**

- **Honest reader experience.** A new contributor wondering "where do I add a feature gate?" gets the right answer (it depends — process-wide flag goes in the registry; tenant capability goes in `complexity_mode` consumer wiring; route gate goes in a new feature guard).
- **Future consolidation is a deliberate refactor.** When the consolidation happens, it will be `FW-F-D-001` — and the audit-trail of flag use will inform what the consolidated API needs to support.
- **Cost.** Three places to look means three places where drift can happen. See Debt-F-D-001 (out-of-band reads) + Debt-F-D-002 (dual-source).

---

### ADR-F-D-005 — Live-Infrastructure Probe Discipline (Lesson #34 Application)

**Context.** Lesson #34 surfaced a real failure mode in this codebase: `ZEPHIX_WS_MEMBERSHIP_V1=1` was active on staging Railway environment, but the project memory (MEMORY.md) listed "Set ZEPHIX_WS_MEMBERSHIP_V1=1 on Railway backend staging" as a **pending** ops action. The flag was set; the documentation was stale. A reader trusting the documentation would have believed the flag was off when it was on.

**Decision.** **Live-infrastructure probe before trusting documented state.** This is an architectural discipline, not just a memory-hygiene note:

- Documented flag state (in code comments, memory, runbooks) is **presumptive**, not authoritative.
- Authoritative state lives in the runtime infrastructure: `railway variables`, `kubectl get secrets`, AWS Parameter Store, etc.
- Before treating "flag X is documented as off" as truth, probe: does live infrastructure actually show off?
- The deployment-time and the documentation-time can diverge; only one is authoritative at evaluation-time.

The discipline is documented as architectural; the structural fix is `FW-F-D-003` (admin endpoint that lists current flag values from the live runtime — closes the divergence at the source).

**Consequences.**

- **Memory hygiene becomes structural.** Memory entries for "set flag X" should explicitly note "verify with `railway variables -s zephix-backend-staging -e staging` before treating as pending."
- **Documentation drift detectable.** When MEMORY.md says "[ ] Set flag X on Railway" and `railway variables` shows X=1, the discrepancy is the signal — close the memory item and probe-document the live state.
- **FW-F-D-003 closes structurally.** Admin endpoint listing live flag state from `ConfigService` removes the trust gap by making live state queryable through the same authentication path operators use.

---

## F-D.3 Current Implementation State

### The 14 named feature flags (verified at HEAD)

| Flag | Env var | Default | Owner / scope |
|---|---|---|---|
| `auth` | (always true) | `true` | Core auth module |
| `organizations` | (always true) | `true` | Core orgs |
| `projects` | (always true) | `true` | Core projects |
| `aiModule` | `ENABLE_AI_MODULE` | `false` | AI module (Engine 9 substrate) |
| `governanceModule` | `ENABLE_GOVERNANCE` | `false` | Engine 5 governance |
| `documentProcessing` | `ENABLE_DOCUMENTS` | `false` | Documents lifecycle |
| `telemetry` | `ENABLE_TELEMETRY` | `false` | Observability |
| `adminPanel` | `ENABLE_ADMIN` | `false` | Admin console module |
| `workflows` | `ENABLE_WORKFLOWS` | `false` | Workflow engine |
| `workspaceMembershipV1` | `ZEPHIX_WS_MEMBERSHIP_V1` | `false` | RBAC stabilization (Engine 1 / 2 boundary) |
| `kpiAsyncRecomputeEnabled` | `KPI_ASYNC_RECOMPUTE_ENABLED` | `false` | Wave 10 KPI |
| `kpiSchedulerEnabled` | `KPI_SCHEDULER_ENABLED` | `false` | Wave 10 KPI |
| `portfolioKpiSnapshotsEnabled` | `PORTFOLIO_KPI_SNAPSHOTS_ENABLED` | `false` | Wave 10 KPI |
| `programKpiSnapshotsEnabled` | `PROGRAM_KPI_SNAPSHOTS_ENABLED` | `false` | Wave 10 KPI |

### Out-of-band flag reads (NOT in the registry — Debt-F-D-001)

Adversarial probe found at least one flag read directly from `process.env` outside the registry:

| Flag | Sites | Concern |
|---|---|---|
| `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1` | `resources.controller.ts:678`, `workspaces.controller.ts:1121` | Read directly via `process.env`; not in `FeatureFlags` interface; type-safety bypassed; flag-listing surveys miss it |

The `ENABLE_TELEMETRY` flag is read **both** through the registry (`config/feature-flags.config.ts:37`) and **directly** in [`observability/telemetry.service.ts:70`](zephix-backend/src/observability/telemetry.service.ts#L70). Dual-source pattern is Debt-F-D-002 — minor (both reads agree because both check the same env var) but a divergence risk.

### Tenant-scoped `complexity_mode` (per AD-026)

| Component | File | Status |
|---|---|---|
| Migration | [18000000000080-AddComplexityModeToWorkspaces.ts](zephix-backend/src/migrations/18000000000080-AddComplexityModeToWorkspaces.ts) | Shipped |
| Enum declaration | [workspace.entity.ts:36 `WorkspaceComplexityMode`](zephix-backend/src/modules/workspaces/entities/workspace.entity.ts#L36) — `SIMPLE` / `STANDARD` / `ADVANCED` | Shipped |
| Entity column | [workspace.entity.ts:148-150 `complexity_mode`](zephix-backend/src/modules/workspaces/entities/workspace.entity.ts#L148) — default `SIMPLE`, NOT NULL | Shipped |
| Reader API | [`WorkspacesService.getComplexityMode()` line 892](zephix-backend/src/modules/workspaces/workspaces.service.ts#L892) | Shipped |
| Writer API | [`WorkspacesService.setComplexityMode()` line 907](zephix-backend/src/modules/workspaces/workspaces.service.ts#L907) | Shipped |
| **Active consumer wiring** | (none) | **Not shipped — Debt-F-D-003** |

Adversarial probe (HEAD): grep for `getComplexityMode\(\)|complexityMode ===` in non-test code returns the writer declaration only. **No code branches on `complexity_mode` for capability gating.** The substrate is provisioned, fully tested at the entity layer, but no business-logic consumer reads the value to make a gating decision.

This is the architectural concern Engine 5 documented as Debt-Engine-5-002, Engine 7 documented as FW-Engine-7-005, and F-D documents here as the foundation-level position.

### Feature flag guards

| Guard | File | Pattern |
|---|---|---|
| `WorkspaceMembershipFeatureGuard` | [feature-flag.guard.ts](zephix-backend/src/modules/workspaces/guards/feature-flag.guard.ts) | Dedicated; reads `ZEPHIX_WS_MEMBERSHIP_V1` via `ConfigService`; dev/test bypass; structured `FEATURE_DISABLED` error response |
| `RequireProjectWorkspaceRoleGuard` | [require-project-workspace-role.guard.ts:71](zephix-backend/src/modules/projects/guards/require-project-workspace-role.guard.ts#L71) | Inline flag check; `if (!featureEnabled) return true;` (backwards-compat behavior — flag OFF = pass-through) |

The two guards have **different semantics for flag = OFF**:

- `WorkspaceMembershipFeatureGuard`: flag OFF + production-like env → **403 FEATURE_DISABLED** (deny)
- `RequireProjectWorkspaceRoleGuard`: flag OFF → **pass-through** (allow, defer to other authorization)

This isn't inconsistent — it's the difference between "this endpoint exists only when the feature is enabled" (membership guard) vs. "this endpoint's role-check applies only when the feature is enabled" (project workspace-role guard). But the difference is implicit in the code; readers must infer. Flagged as architectural concern, not yet a Debt item — the difference is intentional. Future work (FW-F-D-006) standardizes the documentation pattern.

### No flag observability surface (Debt-F-D-004 candidate)

Adversarial probe: `grep -rn "@Get.*flags|FeatureFlags.*Controller|listFeatureFlags"` returns empty. **No admin endpoint exposes current flag state.** Operators must use `railway variables` (or equivalent for the deployment target) to learn what flags are set.

Combined with stale documentation (Lesson #34 case), this produces the divergence-detection gap: nothing in-platform tells an operator that documented flag state and live infrastructure state have drifted apart.

### No flag deprecation markers in `feature-flags.config.ts`

Adversarial probe: `grep -rE "@deprecated|DEPRECATED|removeAfter|sunsetDate|TODO.*flag" config/`. Result: zero deprecation markers in the feature flag config. The codebase has `@deprecated` markers on legacy entities (Tasks, Risk, Templates), but no convention on feature flags.

A flag that has been stably-on for a year is structurally indistinguishable from a flag that's still under stage rollout. This is operational debt — flag accumulation without lifecycle markers is the path to "we still ship this flag check but the feature has been on by default in prod for two years."

---

## F-D.4 Integration Patterns

### F-D ↔ Engine 1 (RBAC)

- `RequireProjectWorkspaceRoleGuard` consults `ZEPHIX_WS_MEMBERSHIP_V1` before applying role checks. When flag is OFF, role checks pass-through.
- `WorkspaceMembershipFeatureGuard` is a workspace-level gate that runs BEFORE Engine 1 RBAC primitives apply.

### F-D ↔ Engine 2 (Tenancy)

- `complexity_mode` is structurally an Engine 2 surface (workspace property) but semantically an F-D capability gate (per Engine 2 Debt-Engine-2-004).
- The boundary tension is real and documented in both directions.

### F-D ↔ Engine 5 (Governance)

- Engine 5's `governanceModule` flag (`ENABLE_GOVERNANCE`) gates whether the governance module bootstraps at all.
- `complexity_mode` is the natural future input for Engine 5's default `EnforcementMode` selection (cross-reference [Engine 5 Debt-Engine-5-002](../engines/engine-5-governance.md#debt-engine-5-002--complexity_mode-consumer-wiring-per-ad-026)).

### F-D ↔ Engine 7 (Capacity)

- `complexity_mode` is the natural future input for capacity threshold defaults (cross-reference [Engine 7 FW-Engine-7-005](../engines/engine-7-capacity.md#fw-engine-7-005--workspace-level-capacity-defaults-via-complexity_mode)).

### F-D ↔ F-A (Audit Trail)

- Feature flag mutations (turning a flag on or off) are operator actions on the deployment surface; not currently audited via F-A `auditService.record`. Future structural fix `FW-F-D-007` audits flag changes.

### F-D ↔ F-B (Notifications)

- F-B Slack/Teams channels (FW-F-B-003 + FW-F-B-004) depend on F-C integration substrate AND require feature-flag-style availability gating (per-org Slack workspace connected? per-org Teams tenant connected?). When F-B Slack/Teams ship, F-D consults integration-availability checks.

### F-D ↔ F-C (Integrations)

- Integration *enabling* (per `IntegrationConnection.enabled` boolean) is per-record state; this is integration-record semantics, not platform feature-flag semantics.
- F-D's role: the `aiModule` / `governanceModule` / etc. flags govern module-level availability; F-C connection enabled flag governs per-tenant per-integration.

---

## F-D.5 Practitioner Discipline + Competitive Positioning

### F-D.5.1 — What Discipline Requires

Feature flags are deceptively simple: a boolean changes behavior. The discipline is in the lifecycle around the boolean, not the boolean itself.

Robust feature flag discipline requires the following non-negotiables:

- **No stale flags allowed (Lesson #34 application).** A flag's documented state (in MEMORY.md, runbooks, code comments) is presumptive. Live infrastructure state is authoritative. Discipline requires: live-infra probe before treating documented state as ground truth. This is the structural reason why operators need a flag observability surface — to make the live state queryable through the same authentication path the documentation lives in.
- **Flags have lifecycle: introduce → ramp → general-availability → deprecate → remove.** A flag that has been on-by-default in production for six months without a removal plan is operational debt. Discipline requires lifecycle markers (`@introduced=2026-01-15`, `@expectedGA=2026-Q2`, `@deprecate=2026-Q4`) so flags age intentionally.
- **Single source of truth for flag values.** A flag read both through a typed registry AND directly from process.env is a divergence-risk surface. The registry is the single source; bypass paths are debt.
- **Deletion is the success state.** A successful feature flag is one that's been removed from the codebase because the feature it gated is now permanent. Flags that live forever are flags that never reached general availability — and that's a product / technical signal worth surfacing.
- **Flag mutations are auditable.** Operators turning flags on / off are making consequential decisions. Forensic audit of those decisions is required for compliance posture (SOC 2 CC8 — change management).
- **Type-safe access.** A flag named `enableSomething` is one typo away from `enabledSomething` and a silent always-undefined-equals-not-true failure. Typed registry catches typos at compile time.
- **Process-wide vs. tenant-scoped distinction explicit.** Process-wide flags suit operator decisions (turn on the AI module for staging). Tenant-scoped capabilities suit customer-tier decisions (this organization is on the standard plan). Conflating them produces both: per-tenant rollout drift in process-wide flags, and operator-affecting decisions hidden in tenant data.
- **Environment bypass policy explicit.** Dev / test should bypass guards for development velocity. Staging must NOT bypass — staging is the production rehearsal. The bypass condition must be `nodeEnv === 'development' || nodeEnv === 'test'`, not `nodeEnv !== 'production'`.
- **Structured error contract on disabled state.** `{ code: 'FEATURE_DISABLED', feature: '<name>', message: '...' }` — clients distinguish disabled from forbidden from missing-tenant. Generic 403 hides the cause.
- **Flag values queryable in-platform.** Operators should not need to run `railway variables` (or equivalent) to know what's on. A flag observability surface — admin endpoint listing current values — closes the divergence gap that produces stale documentation.
- **Per-tenant flag overrides are a deliberate, audited workflow.** "Turn on this feature for this customer only" is a real product need. Schema + audit emission + admin workflow are all required.

What discipline explicitly forbids:

- Inline `process.env.FEATURE_X === 'true'` reads scattered across services without registry.
- Flag deletion that fails because nothing tracked which code paths still depend on the flag.
- "We'll add the lifecycle markers later" — no later happens; flags accumulate.
- Bypass condition `nodeEnv !== 'production'` (catches staging unintentionally).
- Silent flag mutations without forensic record.

### F-D.5.2 — What Existing Platforms Do (and Don't Do)

#### LaunchDarkly

LaunchDarkly is the canonical commercial feature-flag platform: per-environment + per-segment + per-user flag targeting, server + client SDKs, real-time flag updates via streaming, audit trail for flag changes, lifecycle stages (in-progress → complete → archived).

[Source: docs.launchdarkly.com/home/getting-started — accessed 2026-05-07]

- **Strength.** Mature lifecycle management, real-time flag distribution, deep audit trail for flag mutations, segment + user targeting beyond environment-level.
- **Miss for B2B governed PM.** Customer data flows through LaunchDarkly (user keys + targeting attributes leave the customer's tenant boundary); data residency and audit-trail integration become tenant concerns. LaunchDarkly's audit trail is *its* audit trail, not the customer's.
- **Where Zephix differs.** F-D is in-platform — flag values come from environment variables managed by deployment infrastructure under Zephix's control. No third-party flag-evaluation hop.

#### Unleash (open-source)

Unleash is the open-source alternative: self-hostable, per-environment + per-strategy flag activation, custom strategies via plugins, audit log for flag changes.

[Source: docs.getunleash.io — accessed 2026-05-07]

- **Strength.** Self-hostable (data residency under customer control); flexible strategy plugins; mature open-source ecosystem.
- **Miss for embedded usage.** Even self-hosted, Unleash adds an operational dependency (Unleash service + database) that must be deployed and maintained alongside the application.
- **Where Zephix differs.** F-D is environment-variable-driven for process-wide flags + database-column-driven for tenant-scoped capability — no separate flag-service to operate. Trade-off: less flexibility (no real-time updates, no segment targeting), more operational simplicity.

#### Optimizely Full Stack

Optimizely is feature-flag + experimentation: A/B testing, multivariate experiments, gradual rollouts, audience segmentation.

[Source: docs.developers.optimizely.com/full-stack — accessed 2026-05-07]

- **Strength.** Experimentation built in; statistical analysis of flag-driven outcome differences; mature audience-segmentation primitives.
- **Miss.** Same data-residency concern as LaunchDarkly + experimentation is out of scope for current Zephix needs (governed PM operators don't typically run multivariate UX experiments).
- **Where Zephix differs.** Different segment + scope; feature gating, not experimentation.

#### Stripe Feature Flag Patterns

Stripe's engineering blog has documented internal feature flag patterns: scientist library for safe migrations (compare old + new code paths in production), shadow flags for staging-only testing, kill-switch flags for emergency rollback.

[Source: stripe.com/blog/online-migrations — accessed 2026-05-07]

- **Strength.** Pattern library for high-risk migrations + emergency response; mature operational discipline.
- **Miss.** Stripe-internal patterns; not a generic library to consume.
- **Where Zephix learns.** The lifecycle markers + kill-switch posture inform F-D's future direction (`FW-F-D-002` lifecycle markers). The discipline is what to internalize; the implementation is Zephix-specific.

### F-D.5.3 — Zephix's Differentiation

F-D's architectural decisions enable concrete differentiation. **Anti-marketing discipline note:** F-D currently has known debt items (out-of-band reads, no observability surface, complexity_mode unconsumed). Differentiations 1-3 are shipped; Differentiations 4-5 are honestly labeled as architectural enabler with FW surface.

#### Differentiation 1 — Distributed substrate honestly documented (not consolidated module fiction)

Per ADR-F-D-004: F-D is acknowledged as a distributed substrate. Three sites (config-level registry, entity-level capability column, guard-level enforcement) are documented in their structurally different forms. Future consolidation is a deliberate roadmap item, not a hidden debt.

This is the inverse of the platform-marketing pattern that claims a "feature flag system" while having scattered `process.env` reads. F-D is honest about its current shape.

**Shipped (the honesty + the substrate; consolidation is FW).** Anchored in: this document Section F-D.3 + the file inventory.

#### Differentiation 2 — Typed registry with single named-flag interface

Per ADR-F-D-001: 14 named flags in a typed `FeatureFlags` interface. Type-safety catches typos at compile time. A reader can inventory current flags by reading one file.

Most platforms ship "we have feature flags" without a registry; the registry is the difference between "type the env var name correctly every time" and "TypeScript's compiler enforces it."

**Shipped.** Anchored in: [config/feature-flags.config.ts](zephix-backend/src/config/feature-flags.config.ts) typed interface.

#### Differentiation 3 — Structured FEATURE_DISABLED error contract + environment-aware bypass

Per ADR-F-D-003: `WorkspaceMembershipFeatureGuard` produces structured `{ code: 'FEATURE_DISABLED', feature: '<name>', message: '...' }` on block. Dev/test bypass is intentional; staging behaves like production by design.

The `code: 'FEATURE_DISABLED'` distinguishes "feature is off" from "permission denied" from "tenant unknown" — clients (and SDKs, eventually) can branch on the cause.

**Shipped.** Anchored in: [feature-flag.guard.ts](zephix-backend/src/modules/workspaces/guards/feature-flag.guard.ts) ForbiddenException construction.

#### Differentiation 4 — Architectural enabler for tenant-scoped capability gating via complexity_mode (FW-F-D-004)

Per ADR-F-D-002: AD-026 migration shipped the `complexity_mode` column. Three values (`SIMPLE` / `STANDARD` / `ADVANCED`). Reader + writer APIs shipped.

**Currently shipped: substrate.** Currently NOT shipped: any consumer that branches on `complexity_mode` for capability gating. Engine 5 governance defaults, Engine 7 capacity thresholds, F-B notification channel availability are all candidates for future consumer wiring.

Differentiation positioning: *the architectural foundation for tenant-scoped capability gating is shipped (per AD-026); consumer wiring across Engine 5 / Engine 7 / F-B is forward roadmap (`FW-F-D-004`).* **No fictional shipped tenant-tier feature claimed.**

**Substrate enabler shipped; surface FW.** Anchored in: AD-026 migration + workspace entity column. FW: `FW-F-D-004`.

#### Differentiation 5 — Architectural enabler for live-infrastructure probe discipline (FW-F-D-003)

Per ADR-F-D-005: Lesson #34 codified live-infrastructure probe as architectural discipline. Currently shipped: the discipline itself + the documented application. Currently NOT shipped: a flag observability surface that closes the divergence gap structurally.

Differentiation positioning: *the architectural discipline (probe live state before trusting documented state) is shipped as practice; the structural fix (admin endpoint exposing current flag values) is FW-F-D-003.* The discipline is what protects against drift today; the structural fix removes the need for the discipline by making live state queryable in-platform.

**Practice shipped; structural fix FW.** Anchored in: this document ADR-F-D-005 + Lesson #34 case. FW: `FW-F-D-003`.

### Section F-D.5 summary

F-D's substrate is real and shipped. The architectural honesty (distributed substrate not yet consolidated, complexity_mode unconsumed, no observability surface) is itself a differentiation — F-D documents what it is, not what marketing wants it to be. Three shipped differentiations + two enabler-with-FW differentiations + four debt items in Section F-D.6.

---

## F-D.6 Technical Debt + Future Work

### Debt-F-D-001 — Out-of-band feature flag reads bypass the registry

**State.** `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1` is read directly from `process.env` in [resources.controller.ts:678](zephix-backend/src/modules/resources/resources.controller.ts#L678) and [workspaces.controller.ts:1121](zephix-backend/src/modules/workspaces/workspaces.controller.ts#L1121). Not in `FeatureFlags` interface.

**Risk.** Medium. Type-safety bypassed; flag-listing surveys (Section F-D.3) miss it; future flag observability surface (FW-F-D-003) won't show it without code change. Sets precedent for further out-of-band reads.

**Resolution path.** Add `resourceAiRiskScoringV1: boolean` to `FeatureFlags` interface; update controller call sites to read via `ConfigService.get('features').resourceAiRiskScoringV1`. Lint rule preventing direct `process.env.ZEPHIX_*` reads in non-config files would prevent recurrence (FW-F-D-008).

### Debt-F-D-002 — `ENABLE_TELEMETRY` dual-source read

**State.** `ENABLE_TELEMETRY` is in `feature-flags.config.ts` AND read directly in [`observability/telemetry.service.ts:70`](zephix-backend/src/observability/telemetry.service.ts#L70).

**Risk.** Low. Both reads check the same env var so values agree. Risk is divergence if registry adds normalization (e.g., trim whitespace) that direct read doesn't.

**Resolution path.** Migrate telemetry.service to ConfigService.get('features').telemetry; remove direct read.

### Debt-F-D-003 — `complexity_mode` has zero active consumers

**State.** Per Section F-D.3 + ADR-F-D-002 consequences. Substrate is provisioned; no business-logic consumer reads `complexityMode` for capability gating.

**Risk.** Low present-day (default value `simple` produces uniform behavior); medium-term reputational (a column with no consumers reads as architectural debt to new contributors).

**Resolution path.** Either (a) wire consumers per Engine 5 + Engine 7 FW items, or (b) document explicitly that `complexity_mode` is a Phase E2 / future-feature substrate not yet activated. Option (a) is the path toward Differentiation 4 realization.

### Debt-F-D-004 — No flag observability surface in-platform

**State.** Per Section F-D.3. Operators must `railway variables` (or equivalent) to learn live flag state.

**Risk.** Medium. This is the structural reason Lesson #34 stale-documentation gap can exist. An admin endpoint exposing current `ConfigService.get('features')` values would close the trust-the-docs / trust-the-runtime gap.

**Resolution path.** `FW-F-D-003` (admin observability endpoint).

### Debt-F-D-005 — No flag deprecation policy or lifecycle markers

**State.** Per Section F-D.3. Zero deprecation markers in feature-flags.config.ts. Convention-only flag lifecycle.

**Risk.** Medium-term. Flag accumulation; "we still ship this flag check but the feature has been on by default for two years" pattern.

**Resolution path.** `FW-F-D-002` (lifecycle markers + deprecation policy).

### FW-F-D-001 — Consolidate distributed substrate into dedicated capability registry module

**State.** Per ADR-F-D-004 + Differentiation 1. Three sites (config registry, complexity_mode column, guards) are honestly distributed today; future consolidation is a refactor.

**Resolution path.** New module `capability-registry/` with `CapabilityRegistryService` answering "can this user use this feature in this workspace at this time?" — consults config flags + complexity_mode + tenant-tier (FW-F-D-005). Engine 5 / 7 / F-B consumers route through the unified API.

### FW-F-D-002 — Flag lifecycle markers + deprecation policy

**State.** Per Debt-F-D-005.

**Resolution path.** Convention: each flag in `FeatureFlags` interface gets JSDoc tags `@introduced` (date), `@expectedGA` (date), `@deprecateAfter` (date). Flag-aging report at admin endpoint surfaces flags past their `@deprecateAfter` date.

### FW-F-D-003 — Admin flag observability endpoint

**State.** Per Debt-F-D-004 + ADR-F-D-005 + Differentiation 5.

**Resolution path.** `GET /admin/features` (Platform ADMIN only) returns current `FeatureFlags` values + their source (env var name, registry vs. direct read) + lifecycle markers. Closes the live-infra-probe gap structurally.

### FW-F-D-004 — `complexity_mode` consumer wiring across Engine 5 / Engine 7 / F-B

**State.** Per ADR-F-D-002 + Debt-F-D-003 + Differentiation 4.

**Resolution path.** Coordinated dispatch:
- Engine 5: `complexity_mode` drives default `EnforcementMode` ([Engine 5 Debt-Engine-5-002](../engines/engine-5-governance.md#debt-engine-5-002--complexity_mode-consumer-wiring-per-ad-026))
- Engine 7: `complexity_mode` drives `DEFAULT_UTILIZATION_THRESHOLD` ([Engine 7 FW-Engine-7-005](../engines/engine-7-capacity.md#fw-engine-7-005--workspace-level-capacity-defaults-via-complexity_mode))
- F-B: `complexity_mode` drives default channel-set availability per workspace tier

### FW-F-D-005 — Per-tenant feature flag overrides

**State.** Current flags are process-wide. Per-tenant overrides ("turn on this feature for this customer only") would require a new `OrganizationFeatureOverride` entity + admin workflow + audit emission.

**Resolution path.** New entity keyed `(organizationId, flagName)` → boolean override. Override-resolution logic: tenant-override > tenant-tier (`complexity_mode`-derived) > process-wide flag value > default. Audit emission on override mutations.

### FW-F-D-006 — Standardize flag-OFF semantics documentation

**State.** Per Section F-D.3. The two guards (`WorkspaceMembershipFeatureGuard` vs `RequireProjectWorkspaceRoleGuard`) have different flag-OFF semantics (deny vs. pass-through). The difference is intentional but implicit.

**Resolution path.** Convention: each feature-flag guard documents its flag-OFF semantics in a JSDoc tag (`@flagOff: deny | passthrough | bypass`). Lint rule asserts every guard reading a flag declares the semantics.

### FW-F-D-007 — Flag mutation audit emission

**State.** Per F-D.4 F-D ↔ F-A integration pattern. Operator turning a flag on or off is consequential; not currently audited via `auditService.record`.

**Resolution path.** When admin observability endpoint (FW-F-D-003) supports mutation, emit `auditService.record({ action: 'feature_flag_changed', entity: 'feature_flag', entityId: flagName, before, after })` on each flag mutation. New `FEATURE_FLAG` value in `AuditEntityType` enum + `FEATURE_FLAG_CHANGED` value in `AuditAction` enum.

### FW-F-D-008 — Lint rule against direct `process.env.ZEPHIX_*` reads in non-config files

**State.** Per Debt-F-D-001 root-cause prevention.

**Resolution path.** ESLint rule: warn when a non-config file (`config/`, `main.ts`, `instrument.ts` allowlisted) reads `process.env.ZEPHIX_*` or `process.env.ENABLE_*`. Prefer ConfigService.get('features').*.

### Architectural debt + future-work summary

| ID | Type | Severity | Resolution |
|---|---|---|---|
| Debt-F-D-001 | Debt | Medium | Add `ZEPHIX_RESOURCE_AI_RISK_SCORING_V1` to registry |
| Debt-F-D-002 | Debt | Low | Migrate telemetry.service to ConfigService |
| Debt-F-D-003 | Debt | Low (medium reputational) | `complexity_mode` consumer wiring (FW-F-D-004) |
| Debt-F-D-004 | Debt | Medium | Add admin observability endpoint (FW-F-D-003) |
| Debt-F-D-005 | Debt | Medium-term | Lifecycle markers + deprecation policy (FW-F-D-002) |
| FW-F-D-001 | Future Work | — | Consolidate distributed substrate |
| FW-F-D-002 | Future Work | — | Flag lifecycle markers |
| FW-F-D-003 | Future Work | — | Admin observability endpoint |
| FW-F-D-004 | Future Work | — | `complexity_mode` consumer wiring |
| FW-F-D-005 | Future Work | — | Per-tenant flag overrides |
| FW-F-D-006 | Future Work | — | Standardize flag-OFF semantics docs |
| FW-F-D-007 | Future Work | — | Flag mutation audit emission |
| FW-F-D-008 | Future Work | — | Lint rule against direct env reads |

---

## F-D.7 Architecture Decision Record History

### ADRs originating in this document

| ADR | Title | Status |
|---|---|---|
| ADR-F-D-001 | Typed Feature Flag Registry via Nest's `registerAs` | Accepted |
| ADR-F-D-002 | `complexity_mode` as Tenant-Scoped Capability Primitive (per AD-026) | Accepted (substrate); consumer wiring FW |
| ADR-F-D-003 | Dedicated `WorkspaceMembershipFeatureGuard` with Environment Bypass | Accepted |
| ADR-F-D-004 | Distributed Substrate Acknowledged (Not Yet Consolidated) | Accepted (consolidation FW) |
| ADR-F-D-005 | Live-Infrastructure Probe Discipline (Lesson #34 Application) | Accepted (practice); structural fix FW |

### Cross-references to existing architectural artifacts

| Document | Relationship to F-D |
|---|---|
| [Migration 18000000000080 (AD-026)](zephix-backend/src/migrations/18000000000080-AddComplexityModeToWorkspaces.ts) | Schema foundation for tenant-scoped capability primitive |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md) | AD-027 critical-path enumeration; feature-flag-gated routes within scope |
| [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md) | Workspace module activation; `ZEPHIX_WS_MEMBERSHIP_V1` flag staging history |
| [Engine 2 doc Debt-Engine-2-004](../engines/engine-2-tenancy.md#debt-engine-2-004--complexity_mode-substrate-positioning) | Engine 2's documentation of `complexity_mode` substrate boundary |
| [Engine 5 doc Debt-Engine-5-002](../engines/engine-5-governance.md#debt-engine-5-002--complexity_mode-consumer-wiring-per-ad-026) | Engine 5's documentation of `complexity_mode` consumer-wiring future work |
| [Engine 7 doc FW-Engine-7-005](../engines/engine-7-capacity.md#fw-engine-7-005--workspace-level-capacity-defaults-via-complexity_mode) | Engine 7's documentation of `complexity_mode` consumer-wiring future work |
| [F-A doc](f-a-audit-trail.md) | Audit emission for flag mutations (FW-F-D-007) |

### What this document is *not*

- **Not** a flag-by-flag rollout history — that's deployment runbook territory.
- **Not** a SaaS-style flag-management product spec — Zephix's flags are operational gates, not customer-tier-toggling product features.
- **Not** an A/B testing framework — out of scope.

### Cross-document navigation

- Foundation siblings: [F-A (Audit)](f-a-audit-trail.md), [F-B (Notifications)](f-b-notifications.md), [F-C (Integrations)](f-c-integrations.md)
- Engine docs: [Engine 2 (Tenancy)](../engines/engine-2-tenancy.md), [Engine 5 (Governance)](../engines/engine-5-governance.md), [Engine 7 (Capacity)](../engines/engine-7-capacity.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of F-D — Capability Registry & Feature Flags architectural document.**
