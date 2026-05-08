# Engine 8 — Budgets & EVM

**Status**: Substantively built; full PMBOK EVM shipped (Phase 2B + earlier baseline work); Phase 2 frontend migration landed (BaselinePanel + EarnedValuePanel + EarnedValueChart)
**Owner Engine**: Engine 8 (per Blueprint v2 §4)
**Engine Boundary**: Project budget tracking (cost baseline + contingency + approved-change + forecast), schedule baseline machinery, EVM computation (BAC/PV/EV/AC + CPI/SPI/EAC/ETC/VAC), durable EVM snapshots, budget governance with advisory threshold
**HEAD at authoring**: `a90e1515` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

**Adversarial-discipline note (per architect Lesson #41 + #43):** During substrate probe, the architect's framing "Engine 8 lightly touched in prior session work" was found to undersell the shipped reality. Full PMBOK EVM formulas (PV/EV/AC + CPI/SPI/EAC/ETC/VAC) are shipped with durable snapshot persistence, role-gated controllers, and frontend consumers. This document honors the shipped reality, not the prior framing.

**Naming convention (per architect Gate 4 decision):**
- `Debt-Engine-8-XXX` — current architectural debt requiring repair
- `FW-Engine-8-XXX` — forward-roadmap items where shipped substrate enables a future surface

---

## 8.1 Purpose & Scope

Engine 8 is the substrate that answers the project performance measurement question integrating scope, schedule, and cost: **"is this project on track to deliver the planned scope, on the planned schedule, at the planned cost?"** The PMBOK EVM technique is the discipline; Engine 8 is the implementation.

### What Engine 8 IS responsible for

- **Project budget tracking** — `ProjectBudgetEntity` with structured cost columns (baseline, revised, contingency, approved-change, forecast)
- **Schedule baseline machinery** — `ScheduleBaseline` + `ScheduleBaselineItem` entities; create / activate / compare lifecycle
- **EVM computation (real-time)** — `EarnedValueService.computeEarnedValue()` returns BAC, PV, EV, AC, CPI, SPI, EAC, ETC, VAC against an active baseline
- **EVM snapshot persistence** — `EarnedValueSnapshot` entity with atomic upsert + pessimistic lock; one snapshot per (project, as-of-date)
- **EVM history / time series** — historical snapshots query for trend analysis
- **Budget governance** — `BudgetGovernanceService` (Phase 2B) WARN-mode evaluation at 20% baseline-change threshold
- **Cost computation** — `ProjectCostService` for `actualCost` / `costVariance` / `forecastAtCompletion` summaries
- **Per-project EVM gating** — `costTrackingEnabled` + `earnedValueEnabled` flags on project entity (opt-in by project, not global)

### What Engine 8 is NOT responsible for

- **Tenant scope enforcement** — owned by Engine 2.
- **Task lifecycle / work breakdown** — owned by Engine 3 (work-management). Engine 8 *consumes* `WorkTask.actualHours` and `WorkTask.percentComplete` for AC and EV computation.
- **Resource calendars / capacity** — owned by Engine 7. Engine 8 reads task estimates; it does not own the working calendar.
- **Audit emission infrastructure** — owned by F-A. Engine 8 *calls* `auditService.record` from `BudgetGovernanceService` and `BaselineService`.
- **Funding workflow / treasury integration** — out of scope (this is the FW-Engine-5-005 stage-gate-to-funding-release territory).
- **Custom cost rate schedules** — current shipped behavior is `flatLaborRatePerHour` per project. Time-varying rate cards are forward roadmap.

### Engine boundary tests

| Question | Answer is Engine 8 if… | Answer is *not* Engine 8 if… |
|---|---|---|
| "Does this code compute PV/EV/AC?" | yes — `EarnedValueService` | it consumes the metrics for visualization |
| "Does this code persist a baseline?" | yes — `BaselineService` + `ScheduleBaseline` entity | it consumes baseline data for schedule comparison |
| "Does this code WARN on a budget change?" | yes — `BudgetGovernanceService` Phase 2B | it acts on the warning (Engine 6 dashboard tile) |
| "Does this code track who paid the invoice?" | no — out of scope | yes — financial system integration (FW territory) |

---

## 8.2 Architectural Decisions (Retrospective ADRs)

Six decisions shape Engine 8.

### ADR-Engine-8-001 — EVM Substrate Lives in `work-management/`, Not in `budgets/`

**Context.** Two organic homes for EVM machinery were possible:

- **(a)** In the `budgets/` module (alongside `ProjectBudgetEntity` and `BudgetGovernanceService`).
- **(b)** In `work-management/services/` (alongside `WorkTask`, `ScheduleBaseline`, and the work entities EVM reads from).

**Decision.** Option (b) — EVM lives in [`work-management/services/earned-value.service.ts`](zephix-backend/src/modules/work-management/services/earned-value.service.ts) and [`work-management/services/baseline.service.ts`](zephix-backend/src/modules/work-management/services/baseline.service.ts). The `budgets/` module owns tenant-facing budget *data*; work-management owns *computation* over that data.

**Consequences.**

- **EVM has direct access to `WorkTask`** (for `actualHours`, `percentComplete`) without cross-module repository injection.
- **EVM controllers live in work-management** ([`controllers/earned-value.controller.ts`](zephix-backend/src/modules/work-management/controllers/earned-value.controller.ts), [`controllers/schedule-baselines.controller.ts`](zephix-backend/src/modules/work-management/controllers/schedule-baselines.controller.ts)). Routes:
  - `GET /work/workspaces/:wid/projects/:pid/earned-value` (live compute)
  - `POST /work/workspaces/:wid/projects/:pid/earned-value/snapshot` (persist)
  - `GET /work/workspaces/:wid/projects/:pid/earned-value/history`
  - `POST projects/:pid/baselines`, `GET projects/:pid/baselines`, `POST baselines/:bid/activate`, `GET baselines/:bid/compare`
- **The `budgets/` module is the slim tenant-facing surface** — `ProjectBudgetEntity`, `ProjectBudgetsService`, `ProjectBudgetsController` (`GET/PATCH /work/workspaces/:wid/projects/:pid/budget`), `BudgetGovernanceService`.
- **Engine 8's "boundary" is conceptual**, not enforced by module separation. Reader must look in two places. Documented here so the reader doesn't search in the wrong module.

---

### ADR-Engine-8-002 — Per-Project EVM Enable Flags (Opt-In, Not Default)

**Context.** Not every project needs EVM. Internal IT projects, lightweight feature work, exploratory teams — these don't need PMBOK-grade performance measurement, and forcing them through it produces friction without value.

**Decision.** Two enable flags on the project entity gate EVM:

```ts
// zephix-backend/src/modules/projects/entities/project.entity.ts
costTrackingEnabled: boolean;     // line 137
earnedValueEnabled: boolean;      // line 147
```

`EarnedValueService.computeEarnedValue()` rejects projects with either flag off (lines 58-63), throwing `BadRequestException`. The default for both flags is opt-in — projects that need EVM enable it explicitly.

**Consequences.**

- **No silent EVM** — projects without the flags get a clear 400 response, not a misleading zeroed result.
- **Two-flag granularity** — a project can have cost tracking without earned value (track AC only) or both (full EVM). Earned value cannot be enabled without cost tracking.
- **Tenant ergonomics** — customers who don't need EVM are not forced to think about it.

---

### ADR-Engine-8-003 — Time-Phased Linear PV with Duration-Weighted EV

**Context.** PMBOK EVM allows several PV computation styles:

- **(a) Single end-of-project planned cost** — simplest, loses time-phased signal
- **(b) Linear time-phased PV** — interpolates PV across each baseline item's planned duration
- **(c) S-curve / non-linear PV** — accounts for ramp-up + ramp-down patterns
- **(d) Resource-loaded PV** — computed from per-resource time-phased loading

**Decision.** Option (b) — linear time-phased PV ([earned-value.service.ts:107-133](zephix-backend/src/modules/work-management/services/earned-value.service.ts#L107)), with EV duration-weighted by baseline-item duration ([lines 135-144](zephix-backend/src/modules/work-management/services/earned-value.service.ts#L135)).

```
weight_i      = baselineItem_i.durationMinutes / totalBaselineDuration
itemBAC_i     = projectBAC * weight_i

PV_i  = if (asOf >= itemEnd):    itemBAC_i             // fully planned
        if (asOf <= itemStart):  0                     // not yet planned
        else:                    itemBAC_i * (elapsed / totalDuration)

EV_i  = itemBAC_i * (task.percentComplete / 100)
```

PV summed across all baseline items; EV summed similarly.

**Consequences.**

- **Defensible PMBOK semantics** — linear time-phased PV is the standard intermediate-rigor choice. Single-EOP would lose time-phased SPI signal; S-curve / resource-loaded require additional modeling that current scope doesn't support.
- **Item-level weighting matters** — a 1-day task and a 3-month task contribute proportionally to PV/EV. Non-weighted EV would drown the long task's percent-complete signal in the short tasks' all-or-nothing flips.
- **Performance-watched** — service logs computation time at >1s and warns at >5000 tasks ([lines 168-178](zephix-backend/src/modules/work-management/services/earned-value.service.ts#L168)).
- **Honest about edge cases** — items without `plannedStartAt`/`plannedEndAt` are treated as fully planned (line 116). This is a pragmatic default; tracked as `FW-Engine-8-005` (item-level PV refinement).

---

### ADR-Engine-8-004 — Atomic Snapshot Persistence with Pessimistic Write Lock

**Context.** EVM snapshots are time-stamped point-in-time records (one per project per as-of-date). Concurrent requests to snapshot the same (project, asOfDate) without coordination would produce duplicate rows or last-write-wins corruption.

**Decision.** Atomic upsert wrapped in a transaction with `pessimistic_write` lock ([earned-value.service.ts:192-219](zephix-backend/src/modules/work-management/services/earned-value.service.ts#L192)):

```ts
return this.dataSource.transaction(async (manager) => {
  const existing = await manager.findOne(EarnedValueSnapshot, {
    where: { projectId, asOfDate },
    lock: { mode: 'pessimistic_write' },
  });
  if (existing) { Object.assign(existing, result); return manager.save(...); }
  return manager.save(EarnedValueSnapshot, manager.create(...));
});
```

The schema enforces `@Unique(['projectId', 'asOfDate'])` on `EarnedValueSnapshot` so the upsert-or-update semantics are also database-enforced.

**Consequences.**

- **Forensic-quality.** Snapshots cannot double-write under concurrent requests; the row lock + unique constraint produce one canonical record per (project, as-of-date).
- **Idempotent re-snapshot.** Calling snapshot twice for the same date updates in place; analytics queries against the snapshot table do not see duplicates.
- **Cost.** Slight contention on hot-path snapshot writes for the same (project, date). Not a real concern at expected volumes (snapshot is a periodic forecast operation, not a hot-path write).

---

### ADR-Engine-8-005 — Phase 2B Budget Governance with WARN-Mode 20% Threshold

**Context.** Budget mutations need governance — a 50% jump in baseline budget is a meaningful event that should leave a forensic record, not a silent overwrite. Two postures:

- **Strict** — block any mutation above threshold; require explicit approval workflow.
- **Advisory** — warn on threshold breach; allow the mutation; record the decision.

**Decision.** Advisory ([budget-governance.service.ts:9-22](zephix-backend/src/modules/budgets/services/budget-governance.service.ts#L9)) — Phase 2B WARN at 20% baseline change (`DEFAULT_CHANGE_THRESHOLD_PERCENT = 20`), aligned with the Zephix advisory governance philosophy ([Engine 5 ADR-Engine-5-003](engine-5-governance.md#adr-engine-5-003--advisory-governance-philosophy-warn-as-canonical-mvp-mode)).

```ts
// budget-governance.service.ts:9-22 (sanitized)
/**
 * Phase 2B: Budget Governance Service
 *
 * Evaluates budget mutations against threshold policy.
 * Follows ADR-007 governed mutation pattern: auth → scope → policy → domain → audit.
 *
 * MVP policy: WARN mode
 * - If a budget field change exceeds 20% of baseline, attach warning
 * - The mutation still proceeds (warn, not block)
 * - The governance decision is recorded as an audit event
 */
```

**Consequences.**

- **Uniform governance posture across Engines 5, 7, 8.** Capacity governance, rule engine governance, and budget governance all default to WARN; all emit audit; all let operators decide.
- **Same audit constant** (`AuditAction.GOVERNANCE_EVALUATE`) across all governance subsystems — analytics and forensic queries are uniform.
- **Per-field evaluation** — budget governance returns `evaluations[]` with structured per-field info (baseline / revised / contingency / approved-change / forecast).

---

### ADR-Engine-8-006 — Decomposed Project Budget Entity (5 Cost Columns, Not One Scalar)

**Context.** "Project budget" could be a single number, but PMBOK budget management distinguishes:

- **Cost baseline** — the approved version of the time-phased project budget
- **Revised budget** — the working budget after approved changes
- **Contingency reserve** — funds for "known unknowns" within the project's scope
- **Approved change budget** — explicit additions from change-control board
- **Forecast at completion (EAC)** — current best estimate of total cost at completion

A single scalar collapses these and loses the distinction.

**Decision.** Five structured columns on [`ProjectBudgetEntity`](zephix-backend/src/modules/budgets/entities/project-budget.entity.ts):

```ts
baselineBudget         numeric(12,2)  // cost baseline
revisedBudget          numeric(12,2)  // baseline + approved changes
contingency            numeric(12,2)  // contingency reserve
approvedChangeBudget   numeric(12,2)  // approved CR additions
forecastAtCompletion   numeric(12,2)  // current EAC
```

**Consequences.**

- **Three of the four PMBOK budget components are present** — cost baseline, contingency reserve, and approved-change-budget are explicit columns. Forecast (EAC) is also explicit; `revisedBudget` is the operational "current" view.
- **Two PMBOK components are NOT yet shipped**: management reserve (separate from contingency in PMBOK; covers "unknown unknowns" outside project scope) and control accounts (WBS-aligned cost-rollup nodes). Tracked as `FW-Engine-8-001` and `FW-Engine-8-002`.
- **String type for decimals** — columns are stored as `numeric(12,2)` and the DTO validates against `^\d+(\.\d{1,2})?$` to preserve cent-precision without floating-point drift.

---

## 8.3 Current Implementation State

### Module structure (cross-module — per ADR-Engine-8-001)

```
budgets/                                                      # tenant-facing budget data
├── controllers/project-budgets.controller.ts                # GET / PATCH budget
├── entities/project-budget.entity.ts                        # 5 cost columns
├── services/budget-governance.service.ts                    # Phase 2B WARN-mode 20% threshold
├── services/project-budgets.service.ts                      # CRUD + governance integration
└── budgets.module.ts

work-management/                                              # EVM computation + baselines
├── controllers/earned-value.controller.ts                   # 3 EVM routes
├── controllers/schedule-baselines.controller.ts             # baseline lifecycle routes
├── entities/earned-value-snapshot.entity.ts                 # PV/EV/AC + derived metrics persisted
├── entities/schedule-baseline.entity.ts                     # baseline parent
├── entities/schedule-baseline-item.entity.ts                # per-task baseline rows
├── services/earned-value.service.ts                         # EVM computation + snapshot
├── services/baseline.service.ts                             # baseline lifecycle + audit
└── services/project-cost.service.ts                         # actualCost / costVariance / forecast
```

### EVM computation surface (verified at HEAD)

`EarnedValueService.computeEarnedValue()` returns the full PMBOK metric set:

| Metric | Symbol | Formula (sanitized from earned-value.service.ts) | Line |
|---|---|---|---|
| Budget at Completion | BAC | `project.budget` | 90 |
| Planned Value | PV | Σ over baseline items: `itemBAC × (elapsed / totalDuration)` (linear time-phased; fully planned past end-date; zero before start-date) | 107-133 |
| Earned Value | EV | Σ over baseline items: `itemBAC × (task.percentComplete / 100)` | 135-144 |
| Actual Cost | AC | Σ over tasks: `task.actualHours × project.flatLaborRatePerHour` | 146-150 |
| Cost Performance Index | CPI | `EV / AC` (null if AC = 0) | 153 |
| Schedule Performance Index | SPI | `EV / PV` (null if PV = 0) | 154 |
| Estimate at Completion | EAC | `BAC / CPI` (null if CPI ≤ 0) | 155 |
| Estimate to Complete | ETC | `EAC - AC` | 156 |
| Variance at Completion | VAC | `BAC - EAC` | 157 |

All formulas verified at HEAD. Performance-watched (warn at >1s computation, >5000 tasks).

### EVM snapshot durable persistence

`EarnedValueSnapshot` entity columns: `id, organizationId, workspaceId, projectId, baselineId (nullable), asOfDate, pv, ev, ac, cpi, spi, eac, etc, vac, bac, createdAt`. `@Unique(['projectId', 'asOfDate'])` schema constraint plus pessimistic-write transaction lock per ADR-Engine-8-004.

### REST controller routes (verified at HEAD)

**EarnedValueController** ([earned-value.controller.ts](zephix-backend/src/modules/work-management/controllers/earned-value.controller.ts)):

- `GET /work/workspaces/:wid/projects/:pid/earned-value?asOfDate=…&baselineId=…` — live compute (does not persist)
- `POST /work/workspaces/:wid/projects/:pid/earned-value/snapshot` — compute + persist (atomic upsert)
- `GET /work/workspaces/:wid/projects/:pid/earned-value/history?from=…&to=…` — historical snapshots

**ScheduleBaselinesController** ([schedule-baselines.controller.ts](zephix-backend/src/modules/work-management/controllers/schedule-baselines.controller.ts)):

- `POST /work/workspaces/:wid/projects/:pid/baselines` — create baseline
- `GET /work/workspaces/:wid/projects/:pid/baselines` — list
- `GET /work/workspaces/:wid/baselines/:bid` — single
- `POST /work/workspaces/:wid/baselines/:bid/activate` — set active
- `GET /work/workspaces/:wid/baselines/:bid/compare` — diff against current

**ProjectBudgetsController** ([project-budgets.controller.ts](zephix-backend/src/modules/budgets/controllers/project-budgets.controller.ts)):

- `GET /work/workspaces/:wid/projects/:pid/budget` — fetch budget data
- `PATCH /work/workspaces/:wid/projects/:pid/budget` — update budget data (governance evaluates pre-persist)

### Authorization gating (current state — see Section 8.6 for debt)

All three controllers gate on workspace-role + platform-role with **ad-hoc role mapping**, not the canonical `getEffectiveWorkspaceRole` helper:

- **EarnedValueController** uses private `requireOwnerOrAdmin(workspaceRole, platformRole)` — accepts `workspace_owner` OR `delivery_owner` OR Platform `ADMIN`
- **ScheduleBaselinesController** uses `isOwnerOrAdmin(workspaceRole, platformRole)` — same shape
- **ProjectBudgetsController** has the canonical sibling RBAC TODO at [line 39-46](zephix-backend/src/modules/budgets/controllers/project-budgets.controller.ts#L39): explicitly notes "Replace with `WorkspaceAccessService.getEffectiveWorkspaceRole()` once workspace-level role resolution is available"

Tracked as `Debt-Engine-8-001` (project-budgets) and `Debt-Engine-8-002` (earned-value + schedule-baselines — the same pattern, different controllers).

### Frontend consumer (Engine 6 wiring shipped)

Engine 6 dashboard surface for EVM is shipped:

- [zephix-frontend/src/components/pm/shared/EarnedValueChart.tsx](zephix-frontend/src/components/pm/shared/EarnedValueChart.tsx) — EVM trend chart
- [zephix-frontend/src/features/projects/components/EarnedValuePanel.tsx](zephix-frontend/src/features/projects/components/EarnedValuePanel.tsx) — project-level EVM panel
- [zephix-frontend/src/features/projects/components/BaselinePanel.tsx](zephix-frontend/src/features/projects/components/BaselinePanel.tsx) — baseline lifecycle UI

These are referenced in the dispatch as "Phase 2 migrated" — the migration was the lift to the canonical AuthContext / canonical Axios client; the underlying functionality predates the migration.

### Project entity EVM-related columns (verified at HEAD)

| Column | Line | Role |
|---|---|---|
| `budget` | [99](zephix-backend/src/modules/projects/entities/project.entity.ts#L99) | BAC source |
| `flatLaborRatePerHour` | [130](zephix-backend/src/modules/projects/entities/project.entity.ts#L130) | Rate for AC computation |
| `costTrackingEnabled` | [137](zephix-backend/src/modules/projects/entities/project.entity.ts#L137) | EVM gate flag (cost) |
| `earnedValueEnabled` | [147](zephix-backend/src/modules/projects/entities/project.entity.ts#L147) | EVM gate flag (full EV) |

---

## 8.4 Integration Patterns

### Engine 8 ↔ Engine 2 (Tenancy)

- Engine 8 services accept `(organizationId, workspaceId, projectId)` from controllers; values come from Engine 2's tenant context.
- All persistence is workspace-scoped via `WHERE organizationId = … AND workspaceId = …` predicates.

### Engine 8 ↔ Engine 1 (RBAC)

- Three controllers currently use ad-hoc role mapping (not canonical helper) — see Debt items in Section 8.6.
- Migration to `getEffectiveWorkspaceRole` is part of Theme C remediation (cross-references [Engine 2 ADR-Engine-2-002](engine-2-tenancy.md#adr-engine-2-002--canonical-workspace-role-helper-geteffectiveworkspacerole)).

### Engine 8 ↔ Engine 3 (Work Management)

- `EarnedValueService` reads `WorkTask.percentComplete` (for EV) and `WorkTask.actualHours` (for AC).
- `BaselineService` snapshots `WorkTask` schedule into `ScheduleBaselineItem` rows when a baseline is created.

### Engine 8 ↔ Engine 5 (Governance)

- Budget governance follows the same advisory pattern as rule-engine + capacity governance.
- Stage-gate-to-funding-release integration is FW (cross-reference [Engine 5 Differentiation 5](engine-5-governance.md#553--zephixs-differentiation) + Debt-Engine-5-005). When implemented, Engine 5 governance evaluations on phase-gate decisions consume Engine 8 budget allocations to release the next phase's funding.

### Engine 8 ↔ Engine 6 (Dashboards)

- Frontend EVM consumers shipped: `EarnedValueChart`, `EarnedValuePanel`, `BaselinePanel`.
- Read path: dashboards consume `GET /earned-value`, `GET /earned-value/history`, `GET /baselines`, etc.
- Engine 8 produces structured outputs; Engine 6 visualizes.

### Engine 8 ↔ Engine 7 (Capacity)

- `ProjectCostService` consumes `WorkTask.actualHours` similarly to `EarnedValueService`. Capacity (Engine 7) and cost (Engine 8) share the underlying actuals.
- FW: `FW-Engine-7-003` (cost-of-delay) is the future surface that integrates Engine 7's daily capacity granularity with Engine 8's project cost computation.

### Engine 8 ↔ F-A (Audit Trail)

- `BudgetGovernanceService` emits `AuditAction.GOVERNANCE_EVALUATE` (uniform with Engines 5 + 7).
- `BaselineService` emits audit on baseline creation + activation ([baseline.service.ts:113, 174](zephix-backend/src/modules/work-management/services/baseline.service.ts#L113)).

---

## 8.5 Practitioner Discipline + Competitive Positioning

### 8.5.1 — What Discipline Requires

EVM is a structured discipline, not "budget tracking with a chart." Most platforms conflate the two and produce a budget visualization that practitioners cannot use for project performance measurement. The discipline distinguishes them.

Robust EVM discipline requires the following non-negotiables:

- **EVM is a tri-axis integration of scope, schedule, and cost.** A platform that tracks budget without baseline is tracking spend; that is not EVM. A platform that tracks schedule without budget is tracking time; that is not EVM. EVM specifically requires the project's planned-value time-series to be computed against the schedule baseline so that PV ≠ AC ≠ EV is the normal state and the differences mean something.
- **PV / EV / AC must be computed from the same baseline.** "Earned value" computed against the current schedule (not the baseline) is performance theater. The baseline is a forensic record of *what was planned*; deviations from it are the signal. Re-baselining is a deliberate event, not a silent re-anchor.
- **Performance indices must be derived metrics, not separate inputs.** CPI = EV / AC. SPI = EV / PV. EAC = BAC / CPI. If a platform lets users set CPI directly, that platform doesn't understand EVM. The whole point is that the indices are *computed*, exposing reality the user might not want to see.
- **Forecasting is part of EVM, not extra.** EAC + ETC + VAC are not optional add-ons. They are the forecasting outputs that turn historical performance into predicted outcome. A platform that computes CPI/SPI but not EAC has stopped halfway.
- **Snapshots must be durable, atomic, and idempotent.** EVM is a time-series discipline — last week's snapshot is part of the forensic record. Snapshots that overwrite silently, or that allow concurrent writes to corrupt, defeat the time-series.
- **PMBOK budget components are structurally distinct, not summed into one number.** Cost baseline, revised budget, contingency reserve, management reserve, control accounts: each plays a different role in the budget management process. Collapsing them into a single budget number loses the management primitives — operators cannot answer "did we have to draw on contingency?" or "is the management reserve still intact?" if everything is one scalar.
- **EVM is opt-in per project, not universal.** Lightweight projects don't need EVM. Forcing every project through EVM produces friction without value, and dilutes the EVM signal where it does matter.
- **Cost rates are a first-class input, not a derivation.** AC = actual hours × rate. The rate is a project-level decision (or per-resource, in more sophisticated models). A platform that hardcodes a rate, or hides it in configuration, loses the operator's ability to reason about cost variance.
- **Performance measurement is auditable.** Every snapshot is a forensic record. The mutation that re-baselined a project is a forensic record. Budget governance decisions are forensic records. Without audit, EVM degrades into theater.

What discipline explicitly forbids:

- Computing EV against the current schedule rather than the baseline (cardinal sin).
- Letting users edit CPI / SPI / EAC directly.
- Treating "budget" as a single mutable number with no history.
- Snapshotting without atomicity (race-prone duplicate rows).
- Auto-rebaselining when the schedule slips (silent forensic loss).

### 8.5.2 — What Existing Platforms Do (and Don't Do)

#### Microsoft Project (Project Online / Project for the Web) and Oracle Primavera P6

Microsoft Project ships native EVM via the desktop / Project Server tier with full PV/EV/AC + CPI/SPI/EAC/ETC computation against baselines. Primavera P6 has the deepest enterprise EVM heritage — earned value tracking is integrated with the schedule engine and resource leveling.

[Source: learn.microsoft.com/en-us/project/earned-value-analysis-fundamentals — accessed 2026-05-07]

- **Strength.** Mature EVM engines; integrated with schedule baselines; familiar to PMP-credentialed operators; deep customization of cost accrual methods.
- **Miss.** Configuration weight; the EVM surface is part of a thick PM tool that smaller teams can't justify. Audit-trail uniformity across user customizations is a tenant concern, not a platform property.
- **Where Zephix differs.** EVM is opt-in per project (not project-default), audit emission is uniform across governance subsystems, and the configuration surface is a controller endpoint (not desktop dialog navigation).

#### Atlassian Jira (with Tempo Cost Tracker, Tempo Planner, etc.)

Jira does not ship native EVM. Earned-value-like reporting is delivered via Marketplace apps — Tempo (timesheets + planning), Cost Tracker, Jira Align (portfolio tier).

[Source: marketplace.atlassian.com/categories/it-asset-management — accessed 2026-05-07]

- **Strength.** Multiple competing apps; integration with Jira's project + issue model; mature ecosystem for time tracking.
- **Miss.** EVM is an integration concern, not a native concept. Different apps implement different formulas; cross-tenant audit-trail uniformity is not a platform guarantee.
- **Where Zephix differs.** EVM is a first-party engine. Formula consistency (PV linear time-phased, EV duration-weighted, CPI/SPI/EAC/ETC/VAC) is a platform property, not per-app variance.

#### ClickUp

ClickUp tracks project budgets via custom fields and has a Time Tracking feature; no native EVM.

[Source: help.clickup.com/hc/en-us/articles/6303441317143-Track-project-budgets — accessed 2026-05-07]

- **Strength.** Flexible custom fields; integrated time tracking; broad PM-adjacent feature set.
- **Miss.** Budget tracking ≠ EVM. No PV computation, no baseline machinery, no CPI/SPI/EAC. The "budget tracking" affordance is a custom-field summation, not a discipline-grade performance measurement system.
- **Where Zephix differs.** Engine 8 ships full PMBOK EVM, not custom-field budget summation.

#### Asana

Asana provides project budget visualizations in the enterprise tier with cost-per-task and budget-vs-actual reports.

[Source: asana.com/guide/help/premium/portfolio-budgets — accessed 2026-05-07]

- **Strength.** Clean budget-vs-actual visualizations; integrated with Asana's portfolio model; portfolio-level rollup.
- **Miss.** Budget visualizations ≠ EVM. No baseline-anchored PV/EV/AC, no performance indices, no forecasting outputs.
- **Where Zephix differs.** Engine 8 is EVM-grade, not budget-visualization-grade.

#### Linear

Linear has no native budget capability. Out of governance/budget scope by design.

- **Strength.** Engineering velocity focus; appropriate for the segment.
- **Miss.** Out of scope for any budget-aware customer.
- **Where Zephix differs.** Different segment.

### 8.5.3 — Zephix's Differentiation

Engine 8's architectural decisions enable concrete differentiation. Differentiations 1-5 are shipped (anchored in current code); Differentiations 6-7 are honestly labeled as architectural enablers with `FW-Engine-8-XXX` surface.

#### Differentiation 1 — Full PMBOK EVM formulas as a first-party engine

`EarnedValueService.computeEarnedValue()` produces all 9 PMBOK EVM metrics — BAC, PV, EV, AC, CPI, SPI, EAC, ETC, VAC — from the same baseline. PV is linear time-phased; EV is duration-weighted; AC is actual-hours × rate. This is not budget-tracking visualization; it is discipline-grade performance measurement.

This differentiates Engine 8 directly against ClickUp / Asana (no native EVM) and against Jira (EVM via Marketplace apps with formula variance).

**Shipped.** Anchored in: [earned-value.service.ts:42-181](zephix-backend/src/modules/work-management/services/earned-value.service.ts#L42); formulas verified at HEAD.

#### Differentiation 2 — Linear time-phased PV with duration-weighted EV (intermediate-rigor PMBOK)

The PV / EV computation uses linear time-phased PV and duration-weighted EV per ADR-Engine-8-003. This is the intermediate-rigor PMBOK choice — more sophisticated than single-end-of-project PV (which loses time-phased SPI signal) and equally defensible to S-curve / resource-loaded PV (which require modeling Engine 8 doesn't currently offer).

**Shipped.** Anchored in: [earned-value.service.ts:107-144](zephix-backend/src/modules/work-management/services/earned-value.service.ts#L107).

#### Differentiation 3 — Forensic-quality EVM snapshots (atomic, idempotent, schema-enforced)

Per ADR-Engine-8-004: snapshot upsert is wrapped in a transaction with pessimistic-write lock; the schema enforces `@Unique(['projectId', 'asOfDate'])`. This produces forensic-quality time-series records — concurrent snapshot requests cannot duplicate rows; re-snapshotting an existing date updates in place; the snapshot table is the canonical historical record.

**Shipped.** Anchored in: [earned-value.service.ts:192-219](zephix-backend/src/modules/work-management/services/earned-value.service.ts#L192) + [earned-value-snapshot.entity.ts](zephix-backend/src/modules/work-management/entities/earned-value-snapshot.entity.ts) `@Unique` constraint.

#### Differentiation 4 — Decomposed budget components (3 of 4 PMBOK structural primitives)

`ProjectBudgetEntity` exposes 5 structured cost columns: cost baseline, revised budget, contingency reserve, approved-change budget, forecast at completion. Three of the four PMBOK structural budget primitives are present (cost baseline, contingency, approved-change-budget); the fourth (management reserve) is `FW-Engine-8-001`.

This differentiates Engine 8 directly against platforms (ClickUp, Asana) that treat budget as a single scalar.

**Shipped (3 of 4 PMBOK structural primitives).** Anchored in: [project-budget.entity.ts](zephix-backend/src/modules/budgets/entities/project-budget.entity.ts) columns 22-35.

#### Differentiation 5 — Uniform advisory governance across cost, schedule, and capacity

ADR-Engine-8-005 (budget governance Phase 2B WARN at 20% threshold) plus the uniform `AuditAction.GOVERNANCE_EVALUATE` audit constant means Engine 8's budget governance, Engine 5's rule-engine + exception governance, and Engine 7's capacity governance all follow the same advisory pattern: WARN by default, allow the mutation, emit forensic audit.

This is uniformity-as-architectural-property — competitors who layer governance on per-feature don't have this consistency.

**Shipped.** Anchored in: [budget-governance.service.ts:9-22](zephix-backend/src/modules/budgets/services/budget-governance.service.ts#L9) + uniform audit emission.

#### Differentiation 6 — Architectural enabler for management reserve as a structural primitive (FW-Engine-8-001)

PMBOK distinguishes contingency reserve (within project scope; addresses "known unknowns") from management reserve (outside project scope at the management level; addresses "unknown unknowns"). The shipped behavior includes contingency as a structured column; management reserve does not yet have a dedicated column.

The architectural enabler is real: `ProjectBudgetEntity` is already a decomposed structure (5 columns); adding `managementReserve` is additive (column-add migration, no schema redesign). The differentiation positioning depends on shipping it for customers who require full PMBOK structural fidelity.

**Substrate enabler shipped; surface FW.** Anchored enabler in: [project-budget.entity.ts](zephix-backend/src/modules/budgets/entities/project-budget.entity.ts) decomposed entity. FW: `FW-Engine-8-001`.

#### Differentiation 7 — Architectural enabler for control-account WBS rollup (FW-Engine-8-002)

PMBOK control accounts are work-breakdown-structure-aligned cost-aggregation nodes — a project's budget rolls up across the WBS through control accounts. The shipped behavior tracks budget at the project level only; WBS-aligned control-account aggregation is not built.

The architectural enablers exist: project-level budget data is in place; the work-management module has `WorkTask` hierarchy that can serve as the WBS substrate; the EVM computation already handles per-task decomposition (`baselineItems` is effectively a flat WBS today).

**Substrate enabler shipped; surface FW.** Anchored enablers in: project-budget entity + WorkTask hierarchy + baseline item decomposition. FW: `FW-Engine-8-002`.

### Section 8.5 summary

Differentiations 1-5 are shipped: full PMBOK EVM formulas, linear time-phased PV, forensic snapshot persistence, decomposed budget components (3 of 4 PMBOK primitives), uniform advisory governance. Differentiations 6-7 are honestly labeled as architectural enablers (decomposed entity is additive-extensible; WBS substrate exists) with FW surface for customers requiring full PMBOK structural fidelity.

Adversarial cross-check: the architect's prior framing of "Engine 8 lightly touched" was found to undersell shipped reality. Adversarial discipline applied per HALT-DOC-BE-3 + Lesson #41 — substantive shipped state documented honestly without aspirational marketing.

---

## 8.6 Technical Debt + Future Work

### Debt-Engine-8-001 — `ProjectBudgetsController` ad-hoc role mapping (sibling RBAC TODO)

**State.** [project-budgets.controller.ts:39-46](zephix-backend/src/modules/budgets/controllers/project-budgets.controller.ts#L39) carries a verbatim TODO:

> `// TODO: Replace with WorkspaceAccessService.getEffectiveWorkspaceRole()`
> `// once workspace-level role resolution is available. Currently maps`
> `// platformRole which is NOT the same as workspace membership role.`

The controller maps `platformRole` to a workspace-role-shaped enum (`OWNER` / `ADMIN` / `MEMBER` / `GUEST`) for the service layer. This is the architect-side carry confirmed across two independent recons.

**Risk.** Medium. The mapping is conservative (Platform `MEMBER` becomes workspace `MEMBER`) but does not reflect actual workspace membership. A user who is workspace_owner of a workspace they're not in (impossible state) is not a real risk; a user who is Platform MEMBER but workspace_owner of one workspace is treated as MEMBER everywhere — under-privileged from the workspace's perspective.

**Resolution path.** Inject `WorkspaceAccessService`; replace the platformRole mapping with `getEffectiveWorkspaceRole({ userId, orgId, platformRole, workspaceId })`. Coordinated with [Engine 2 Debt-Engine-2-005](engine-2-tenancy.md#debt-engine-2-005--theme-c-phase-3-consumer-migration) (Theme C Phase 3).

### Debt-Engine-8-002 — `EarnedValueController` + `ScheduleBaselinesController` ad-hoc role guards

**State.** Both controllers use private `requireOwnerOrAdmin(workspaceRole, platformRole)` / `isOwnerOrAdmin(workspaceRole, platformRole)` helpers that read `req.headers['x-workspace-role']` directly and accept `workspace_owner`, `delivery_owner`, or Platform `ADMIN`. This bypasses the canonical helper in the same way Debt-Engine-8-001 does — different controllers, same pattern.

**Risk.** Medium. Similar shape to Debt-Engine-8-001; same migration target.

**Resolution path.** Migrate both controllers to `WorkspaceAccessService.getEffectiveWorkspaceRole`. Bundle with Debt-Engine-8-001 in the same Theme C Phase 3 batch.

### Debt-Engine-8-003 — Header-derived `x-workspace-role` is client-supplied

**State.** Both `EarnedValueController` and `ScheduleBaselinesController` read `req.headers['x-workspace-role']` and gate on its value. Per the Engine 2 Decision C contract discipline (Section 2.5.1: "Identity-grounded tenant context, not client-supplied"), client-supplied role headers are forgeable.

**Risk.** Medium-High in principle (client could spoof `x-workspace-role: workspace_owner`); mitigated in practice by JWT-bound `req.user.organizationId` plus the controllers' Platform ADMIN bypass also requiring JWT ADMIN claim. But the workspace-role check itself is unverified against actual membership.

**Resolution path.** Ties to Debt-Engine-8-002 — replacing with `getEffectiveWorkspaceRole` resolves this naturally because the helper derives the role from membership, not from headers.

### FW-Engine-8-001 — Management reserve as first-class structural primitive

**State.** Architectural enabler shipped (Differentiation 6): `ProjectBudgetEntity` is already decomposed into 5 cost columns; adding `managementReserve` is column-additive.

**Resolution path.** Migration adds `management_reserve numeric(12,2) default 0`; DTO + service updates to handle the new field; Engine 6 dashboard surface updates to distinguish contingency vs. management reserve in budget visualization.

### FW-Engine-8-002 — Control-account WBS rollup

**State.** Substrate enablers shipped (Differentiation 7): project-level budget data, WorkTask hierarchy, baseline-item decomposition. Control-account-level aggregation is FW.

**Resolution path.** Define WBS-control-account model (likely a new entity: `BudgetControlAccount` keyed to a WBS node); aggregate cost rollup across the control-account tree; surface in Engine 6 EVM dashboard.

### FW-Engine-8-003 — Stage-gate-to-funding-release integration

**State.** Cross-references [Engine 5 Differentiation 5 + Debt-Engine-5-005](engine-5-governance.md#553--zephixs-differentiation). Engine 8's role: when a phase-gate decision advances a project, the next-phase budget allocation should release programmatically (set `revisedBudget` += approved amount; emit audit).

**Resolution path.** Engine 5 phase-gate decision → audit emission → Engine 8 listener → `ProjectBudgetsService.update`. The integration is event-driven; substrate (audit emission, governance evaluation) is shipped on both sides.

### FW-Engine-8-004 — Per-resource (rather than flat) cost rates

**State.** Current shipped behavior: `flatLaborRatePerHour` per project. The PMBOK-mature posture is per-resource cost rates with optional time-varying schedules (e.g., a senior engineer's rate increases when they're promoted).

**Resolution path.** New entity (`ResourceCostRate` keyed to user × workspace × effective-date); `EarnedValueService.computeEarnedValue` AC computation iterates through resource-time pairs rather than `actualHours × flatRate`.

### FW-Engine-8-005 — Item-level PV refinement for items without planned start/end

**State.** Per ADR-Engine-8-003 consequences: baseline items without `plannedStartAt` / `plannedEndAt` are treated as fully planned (`pv += itemBAC` at line 116). This is a pragmatic default; in practice, items without dates are usually administrative tasks that should not count toward planned value.

**Resolution path.** Surface a project-level setting for "items without dates count as: 0 / weighted-average / fully-planned"; default to 0 for new projects (more conservative); grandfather existing projects to current behavior.

### FW-Engine-8-006 — Engine 7 cost-of-delay integration

**State.** Cross-references [Engine 7 Differentiation 6 + FW-Engine-7-003](engine-7-capacity.md#553--zephixs-differentiation). When cost-of-delay computation lands in Engine 7, Engine 8 is the consumer for cost-of-delay-aware budget forecasting.

**Resolution path.** Engine 7 ships cost-of-delay; Engine 8's EAC computation incorporates delay-cost component; dashboard surfaces "EAC + cost of delay if not resolved by date X."

### Architectural debt + future-work summary

| ID | Type | Severity | Owner stream | Surface elaborated |
|---|---|---|---|---|
| Debt-Engine-8-001 | Debt | Medium | Engine 8 + Engine 1 | This doc + Theme C Phase 3 |
| Debt-Engine-8-002 | Debt | Medium | Engine 8 + Engine 1 | This doc + Theme C Phase 3 |
| Debt-Engine-8-003 | Debt | Medium-High (principle) | Engine 8 + Engine 1 + Engine 2 | This doc + Decision C discipline |
| FW-Engine-8-001 | Future Work | — | Engine 8 + Engine 6 | This doc Section 8.6 |
| FW-Engine-8-002 | Future Work | — | Engine 8 + Engine 3 + Engine 6 | This doc Section 8.6 |
| FW-Engine-8-003 | Future Work | — | Engine 5 + Engine 8 | [Engine 5 Debt-005](engine-5-governance.md#debt-engine-5-005--stage-gate-to-funding-release-integration) |
| FW-Engine-8-004 | Future Work | — | Engine 8 + Engine 7 | This doc Section 8.6 |
| FW-Engine-8-005 | Future Work | — | Engine 8 | This doc Section 8.6 |
| FW-Engine-8-006 | Future Work | — | Engine 7 + Engine 8 | [Engine 7 FW-003](engine-7-capacity.md#fw-engine-7-003--cost-of-delay-calculations) |

---

## 8.7 Architecture Decision Record History

### ADRs originating in this document

| ADR | Title | Status | Anchor PR/artifact |
|---|---|---|---|
| ADR-Engine-8-001 | EVM Substrate in `work-management/`, Not in `budgets/` | Accepted | Pre-existing module separation |
| ADR-Engine-8-002 | Per-Project EVM Enable Flags (Opt-In) | Accepted | project.entity.ts:137, 147 |
| ADR-Engine-8-003 | Linear Time-Phased PV + Duration-Weighted EV | Accepted | earned-value.service.ts:107-144 |
| ADR-Engine-8-004 | Atomic Snapshot Persistence with Pessimistic Write Lock | Accepted | earned-value.service.ts:192-219 |
| ADR-Engine-8-005 | Phase 2B Budget Governance WARN-Mode 20% Threshold | Accepted | budget-governance.service.ts:9-22 |
| ADR-Engine-8-006 | Decomposed Project Budget Entity (5 Cost Columns) | Accepted | project-budget.entity.ts:22-35 |

### Cross-references to existing architectural artifacts

| Document | Relationship to Engine 8 |
|---|---|
| [phase2a-authority-hardening-proof.md](../phase2a-authority-hardening-proof.md) | Phase 2A authority hardening — sibling to the Phase 2B budget governance posture. |
| [phase2e-capacity-proof.md](../phase2e-capacity-proof.md) | Phase 2E capacity stack — Engine 7 sibling; underwrites cross-engine actuals (`actualHours`) shared by Engines 7 + 8. |
| [phase3b-audit-proof.md](../phase3b-audit-proof.md) | Audit-trail proof; budget governance + baseline service emission discipline aligns. |
| [governance-evaluations-retention.md](../governance-evaluations-retention.md) | Retention policy preserving the substrate for cost-of-delay (FW-Engine-8-006) retrospective computation. |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](../AD-027-patch3-critical-path-rescoping.md) | AD-027 critical-path enumeration; budget controllers + EVM controllers within scope. |
| [AD-028-frontend-work-management-unification.md](../AD-028-frontend-work-management-unification.md) | Frontend unification; BaselinePanel + EarnedValuePanel + EarnedValueChart migrated under this AD. |
| [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md) | Workspace module activation; relevant to controllers' workspace-scoped routing. |
| [V21_RECONCILIATION_2026-05-04.md](../V21_RECONCILIATION_2026-05-04.md) | V21 reconciliation; Engine 8 boundary confirmed. |
| [Engine 2 doc](engine-2-tenancy.md) | Tenant context Engine 8 consumes; Decision C contract relevant for Debt-Engine-8-003 (header-derived role) reconciliation. |
| [Engine 5 doc](engine-5-governance.md) | Governance philosophy uniformity; FW-Engine-8-003 stage-gate-to-funding-release integration. |
| [Engine 7 doc](engine-7-capacity.md) | Shared `actualHours` consumption; FW-Engine-8-006 cost-of-delay integration. |
| [F-A doc](../foundations/f-a-audit-trail.md) | Audit emission patterns; Engine 8 budget-governance + baseline service positive examples. |

### What this document is *not*

- **Not** a re-statement of the budget CRUD admin surface — see `ProjectBudgetsService` and DTOs.
- **Not** a re-statement of the EVM dashboard UX — that's an Engine 6 concern (frontend visualization).
- **Not** a financial-system integration spec — out of scope; tracked as future work bracket if customer need surfaces.

### Cross-document navigation

- Sibling engine docs: [Engine 2 (Tenancy)](engine-2-tenancy.md), [Engine 5 (Governance)](engine-5-governance.md), [Engine 7 (Capacity)](engine-7-capacity.md)
- Foundation docs: [F-A (Audit)](../foundations/f-a-audit-trail.md), [F-B (Notifications)](../foundations/f-b-notifications.md), [F-C (Integrations)](../foundations/f-c-integrations.md), [F-D (Capability Registry)](../foundations/f-d-capability-registry.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of Engine 8 — Budgets & EVM architectural document.**
