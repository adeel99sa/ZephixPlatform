# Engine 7 — Resources & Capacity

**Status**: Substantively built (resources module + work-management capacity stack); Phase 2E recommendation engine landed
**Owner Engine**: Engine 7 (per Blueprint v2 §4)
**Engine Boundary**: Resource entity model, allocation tracking, daily capacity, multi-band risk scoring, heat-map analytics, demand modeling, capacity leveling recommendations
**HEAD at authoring**: `32d82e26` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

**Naming convention note (per architect Gate 4):** This document uses two prefixes in Section 7.6:
- **`Debt-Engine-7-XXX`** — current architectural debt requiring repair (e.g., declared-dead methods)
- **`FW-Engine-7-XXX`** — future-work positioning where the substrate exists but the surface is forward roadmap

---

## 7.1 Purpose & Scope

Engine 7 is the substrate that answers two questions for any user × workspace × date range:

1. **What is this user expected to be doing?** (demand model: tasks, allocations, schedule)
2. **How does that compare to what they can do?** (capacity model: hours per day, working calendar, allocation percentages)

Engine 7 produces structured outputs — utilization series, overallocation entries, risk scores, leveling recommendations — that are consumed by Engine 6 (dashboards), Engine 5 (governance), and the Engine 3 (work-management) controllers that gate task assignment.

### What Engine 7 IS responsible for

- **Resource identity** — `Resource` entity with workspace scope, capacity-hours-per-week default, skills, role, active flag
- **Allocation tracking** — `ResourceAllocation` entity capturing project-resource bookings across date ranges
- **Daily capacity granularity** — `UserDailyCapacity` entity recording per-user-per-day allocation percentages
- **Conflict detection** — `ResourceConflict` entity for overlapping or contested allocations
- **Daily load aggregation** — `ResourceDailyLoad` entity for pre-computed daily roll-ups
- **Demand modeling** — task schedule + allocation derivation; classification of modeled vs. unmodeled hours with reasons
- **Capacity analytics** — utilization computation (demand / capacity), per-day series, peak detection, threshold-driven overallocation flagging
- **Multi-band risk scoring** — point-weighted severity scoring across 80/100/120/150% capacity bands
- **Heat-map data** — query-driven, tenant-aware, default 90-day window
- **Read-only leveling recommendations** — task-shift suggestions to resolve overallocations (advisory; no auto-persist)
- **Capacity governance** — sibling service for assignment-time enforcement (cross-cuts to Engine 5; see ADR-Engine-7-006)

### What Engine 7 is NOT responsible for

- **Tenant scope enforcement** — owned by Engine 2. Engine 7 services use `TenantAwareRepository` and `TenantContextService.assertOrganizationId()`.
- **Task lifecycle / scheduling** — owned by Engine 3 (work-management). Engine 7 reads task schedule data; it does not author the schedule.
- **Critical-path computation** — owned by `CriticalPathEngineService` in work-management; Engine 7's leveling service *consumes* its output for float-aware shift recommendations.
- **Audit emission infrastructure** — owned by F-A. Engine 7's capacity-governance sibling *calls* `auditService.record`.
- **Writing leveling decisions** — Engine 7 produces *recommendations*; persistence/application is operator-driven via Engine 3 surfaces.
- **Time tracking** — actuals vs. plan is out of scope for current Engine 7. Shipped scope is forward-looking demand vs. capacity.

### Engine boundary tests

| Question | Answer is Engine 7 if… | Answer is *not* Engine 7 if… |
|---|---|---|
| "Does this code compute utilization (demand/capacity)?" | yes — `CapacityAnalyticsService` | it consumes utilization to render a UI or trigger a workflow |
| "Does this code classify a day as overallocated?" | yes — `CapacityAnalyticsService.computeOverallocations` | it acts on the classification (governance, alert, dashboard tile) |
| "Does this code score resource risk?" | yes — `ResourceRiskScoreService` | it surfaces the score (Engine 6 dashboards) |
| "Does this code persist a leveling decision?" | no — leveling is read-only | yes — Engine 3 task-shift application |

---

## 7.2 Architectural Decisions (Retrospective ADRs)

Six decisions shape Engine 7. Each is a retrospective ADR documenting the durable choice realized in code.

### ADR-Engine-7-001 — Two-Module Topology: `resources/` + `work-management/services/` capacity stack

**Context.** Capacity concerns appear in two places organically:

- **Resource-centric**: who is this person, what are their skills, what is their week-by-week capacity, what is their cross-project allocation history, what is their risk profile?
- **Work-centric**: at this date in this workspace, what is the demand from tasks, what is the capacity of the assignees, where are the overallocations, can the schedule be shifted?

Both are real concerns; collapsing them into one module produces a "god-module" that owns identity *and* analytics *and* recommendations.

**Decision.** Two modules, intentional separation:

- [`zephix-backend/src/modules/resources/`](zephix-backend/src/modules/resources/) — resource identity + allocation + risk + heat-map + timeline (resource-centric)
- [`zephix-backend/src/modules/work-management/services/`](zephix-backend/src/modules/work-management/services/) — capacity-analytics, capacity-leveling, capacity-calendar, demand-model, capacity-governance (work-centric)

**Consequences.**

- **Two import surfaces.** Engine 6 dashboards import from one or the other depending on the angle (resource detail page vs. workspace heat-map).
- **Cross-module dependencies are explicit.** `CapacityLevelingService` imports `CapacityAnalyticsService` + `CapacityCalendarService` + `DemandModelService` from work-management; it does *not* reach into `resources/` for raw allocation data — it goes through analytics.
- **Cost.** Two test paths, two service registries, two places for a reader to look. Mitigated by the boundary tests in 7.1 above.

---

### ADR-Engine-7-002 — Read-Only Leveling Recommendations (No Auto-Persist)

**Context.** When the system detects an overallocation, two postures were available:

- **(a) Auto-leveling** — automatically shift tasks to resolve the overallocation; persist the shifts; notify the assignees.
- **(b) Read-only recommendations** — produce a structured list of recommended shifts; do not persist; surface to the operator via Engine 6 dashboards or admin tooling for explicit application.

**Decision.** **Option (b)** — read-only. Documented in the service header at [`capacity-leveling.service.ts:23-26`](zephix-backend/src/modules/work-management/services/capacity-leveling.service.ts#L23):

> "Phase 2E: Capacity Leveling Service — Read-only recommendation engine. Identifies overloaded days and suggests task shifts to resolve overallocations. Does NOT write to the database."

**Consequences.**

- **Operator agency preserved.** The system advises; the operator decides. This aligns with the Zephix advisory governance philosophy (see [Engine 5 doc ADR-Engine-5-003](engine-5-governance.md#adr-engine-5-003--advisory-governance-philosophy-warn-as-canonical-mvp-mode)).
- **Recommendation shape is structured** — `LevelingRecommendation` carries `taskId`, `currentStartDate`, `recommendedStartDate`, `shiftDays`, `reason`, `isCriticalPath`, `totalFloatMinutes`. Operator sees the why, not just the what.
- **Critical-path-aware.** Recommendations consult `CriticalPathEngineService` for total-float data; recommendations preferentially shift tasks with float, not those on the critical path.
- **Cost.** No automation path for high-volume scenarios. Tracked as `FW-Engine-7-001` (auto-apply with operator approval).

---

### ADR-Engine-7-003 — Multi-Band Risk Scoring (Non-Linear Weighting)

**Context.** Capacity risk is not a linear function of utilization. A user at 105% for one day in a quarter is meaningfully different from a user at 105% every day for a quarter, which is meaningfully different from a user at 160% for one critical day. A single-axis "% utilization" scalar loses this distinction.

**Decision.** Multi-axis risk scoring with explicit bands:

- **Band 1 (0-10 points): 80%-100%** — yellow zone; sustainable-pace concern surfaces but not yet overallocated
- **Band 2 (20-30 points): 100%-120%** — overallocated, manageable
- **Band 3 (30-40 points): 120%-150%** — overallocated, critical
- **Band 4 (40 points): >150%** — critical over-allocation, peak severity
- **Duration weighting (0-30 points)**: proportional to days above 100%
- **Critical-day weighting (0-20 points)**: 2 points per day above 150%
- **Concurrent-project complexity (0-10 points)**: ≥5 projects = 10 pts, ≥3 = 5 pts
- **Conflict penalty (0-10 points + severity bonus)**: existing `ResourceConflict` rows weighted

Implemented in [`resource-risk-score.service.ts`](zephix-backend/src/modules/resources/services/resource-risk-score.service.ts) — `computeRiskScore` is a pure function (no DB calls, no side effects).

Final severity bands: **LOW** (<40), **MEDIUM** (40-69), **HIGH** (≥70). Capped at 100.

**Consequences.**

- **80% is a first-class signal.** Even though the analytics service's enforcement threshold is 100% (see ADR-Engine-7-005), the risk score recognizes 80-100% as a non-trivial yellow zone. This is the architectural ground for sustainable-pace differentiation (Section 7.5.3).
- **Risk score is forensic-grade.** Pure-function computation means the same inputs produce the same score; reproducible across audits.
- **Top-3 factors surfaced.** The score returns `factors[]` with structured codes (`MAX_OVER_150`, `DAYS_OVER_120`, etc.) and human messages — operator can understand *why* a person is HIGH risk, not just that they are.

---

### ADR-Engine-7-004 — User-Day Granularity for Capacity Tracking

**Context.** Capacity could be tracked at week, day, or hour granularity. Day is the inflection point: weekly is too coarse for sprint-level work; hourly is too fine for human estimation.

**Decision.** User-day primary key on the canonical capacity table:

```ts
@Entity('user_daily_capacity')
export class UserDailyCapacity {
  @PrimaryColumn() organizationId: string;
  @PrimaryColumn() userId: string;
  @PrimaryColumn({ type: 'date' }) capacityDate: Date;
  @Column({ default: 0 }) allocatedPercentage: number;
}
```

Per `Resource` entity, the per-resource baseline is `capacityHoursPerWeek: 40` (default; configurable per resource).

**Consequences.**

- **Composite primary key prevents duplicate-day-rows** — the schema itself enforces one row per (org, user, date).
- **Daily granularity feeds heat-map and leveling** — both work in date-keyed dictionaries, not week buckets.
- **Working-calendar honored separately** — `CapacityCalendarService` exports `DEFAULT_CAPACITY_HOURS` and the calendar logic (weekends, holidays, custom non-working days) is a dedicated service, not encoded in the entity.

---

### ADR-Engine-7-005 — `DEFAULT_UTILIZATION_THRESHOLD = 1.0` (100%) for Hard Overallocation Detection

**Context.** The `CapacityAnalyticsService` needs a default threshold for classifying a day as "overallocated." Two principled options:

- **(a) 100% (`1.0`)** — strict definition: any day where demand exceeds capacity is overallocated.
- **(b) 80% (`0.8`)** — sustainable-pace definition: any day above sustainable load is overallocated.

**Decision.** Default is `1.0` ([`capacity-analytics.service.ts:13`](zephix-backend/src/modules/work-management/services/capacity-analytics.service.ts#L13)):

```ts
/** Default utilization threshold — configurable per query */
export const DEFAULT_UTILIZATION_THRESHOLD = 1.0;
```

The threshold is **configurable per query** (`opts.threshold` flows through `CapacityAnalyticsService.clampThreshold()`). Tenants can pass `0.8` for sustainable-pace classification on their queries; the default is the strict 100% line.

**Consequences.**

- **The 80% sustainable-pace concern surfaces in the risk score** (ADR-Engine-7-003 Band 1: 80-100% gives 0-10 risk points), not in the overallocation classification.
- **Two distinct signals available**: hard overallocation (>100%, default) and sustainable-pace concern (>80%, opt-in via threshold parameter).
- **Differentiation positioning** depends on this nuance: shipped behavior is multi-band awareness in risk-score; sustainable-pace as default classification is `FW-Engine-7-002`. See Section 7.5.3.

---

### ADR-Engine-7-006 — Capacity Governance via Sibling Service (cross-references Engine 5 ADR-005)

**Context.** Capacity-at-assignment-time is a governance question ("does assigning this task to this user breach capacity policy?"), but it requires a database count, not an entity-attribute predicate.

**Decision.** Capacity governance is a sibling service to the rule engine, not a `ConditionType` consumer. Already documented as [Engine 5 ADR-Engine-5-005](engine-5-governance.md#adr-engine-5-005--capacity-governance-as-a-sibling-service-not-a-rule-engine-consumer); recorded here as Engine 7's cross-cut acknowledgment.

**Consequences for Engine 7:**

- **Engine 7 owns the threshold and audit emission** for capacity governance (`DEFAULT_MAX_ACTIVE_TASKS = 15` in [capacity-governance.service.ts:41](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L41); audit emission at line 129).
- **Uniform `GOVERNANCE_EVALUATE` audit constant** — capacity governance and rule-engine governance both emit the same action; analytics distinguish via `metadata.governanceType`.
- **WARN mode is canonical** — capacity governance always allows; attaches `_governanceWarning` if over threshold. Operator sees, decides, proceeds.

---

## 7.3 Current Implementation State

### Resources module ([zephix-backend/src/modules/resources/](zephix-backend/src/modules/resources/))

**Entities:**

| Entity | Role |
|---|---|
| `Resource` | Identity + workspace scope + `capacityHoursPerWeek` (default 40) + skills + role |
| `ResourceAllocation` | Project-resource booking with start/end dates, allocation type, units, booking source |
| `ResourceConflict` | Overlapping/contested allocations; carries severity (`low` / `medium` / `high` / `critical`) |
| `ResourceDailyLoad` | Pre-computed daily roll-ups |
| `UserDailyCapacity` | Composite (org, user, date) primary key + `allocatedPercentage` (per ADR-Engine-7-004) |
| `AuditLog` | Resources-module-local audit log (see also F-A integration) |

**Services:**

| Service | Status | Notes |
|---|---|---|
| `ResourceHeatMapService` | Shipped | Tenant-aware, 90-day default window, query-driven; respects feature flag via `WorkspaceAccessService` |
| `ResourceRiskScoreService` | Shipped | Multi-band scoring per ADR-Engine-7-003; `computeRiskScore` is a pure function |
| `ResourceTimelineService` | Shipped | Timeline visualization data |
| `ResourceCalculationService.calculateResourceImpact()` | **Declared dead** | FIXME comment at top of file; returns 0; broken since 2026-05-05 task-entity-drift removal. See `Debt-Engine-7-001` |
| `ResourceCalculationService.calculateTotalResourceLoad()` | Status uncertain | Same file, separate method; not flagged dead |
| `ResourceConflictService` | Shipped (file present) | Conflict detection logic |
| `ResourceValidationService` | Shipped (file present) | Allocation validation |
| `ResourcesService` | Shipped | Orchestrator; `utilizationPercentage` computed at [line 708](zephix-backend/src/modules/resources/resources.service.ts#L708) |

**DTOs:** `capacity-summary-query`, `create-allocation`, `create-resource`, `detect-conflicts`, `heat-map-query`, `resource-list-query`, `update-allocation`.

**Enums:** `allocation-type`, `booking-source`, `units-type`.

### Work-management capacity stack ([zephix-backend/src/modules/work-management/services/](zephix-backend/src/modules/work-management/services/))

| Service | Role | Anchor |
|---|---|---|
| `CapacityAnalyticsService` | Per-user daily utilization, overallocation detection, peak tracking | `DEFAULT_UTILIZATION_THRESHOLD = 1.0` ([line 13](zephix-backend/src/modules/work-management/services/capacity-analytics.service.ts#L13)) |
| `CapacityLevelingService` | Read-only leveling recommendations (Phase 2E) | Header at [lines 23-26](zephix-backend/src/modules/work-management/services/capacity-leveling.service.ts#L23) |
| `CapacityCalendarService` | Working-calendar (weekends, holidays, custom) | Exports `DEFAULT_CAPACITY_HOURS` |
| `DemandModelService` | Daily demand from tasks + allocations; classification of modeled / unmodeled hours with reasons | Phase 2E |
| `CapacityGovernanceService` | Assignment-time governance (sibling to rule engine; emits `GOVERNANCE_EVALUATE`) | `DEFAULT_MAX_ACTIVE_TASKS = 15` ([line 41](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L41)); audit emission [line 129](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L129) |

### Phase 2E proof anchor

Phase 2E (capacity governance + capacity leveling + demand model) was proven in [phase2e-capacity-proof.md](../phase2e-capacity-proof.md). The leveling service header explicitly cites Phase 2E as its origin.

### Risk-score formula (verified at HEAD)

The `computeRiskScore` pure-function calculation, sanitized:

```
baseScore = 0
if maxAllocPct > 150: baseScore += 40
elif maxAllocPct > 120: baseScore += 30 + (max - 120)/3        // 30-40 pts
elif maxAllocPct > 100: baseScore += 20 + (max - 100)/2        // 20-30 pts
elif maxAllocPct > 80:  baseScore += (max - 80)/2              // 0-10 pts (yellow band)

baseScore += min(30, daysAbove100/totalDays * 30)              // duration weighting
baseScore += min(20, daysAbove150 * 2)                          // critical-day
baseScore += min(10, daysAbove120 * 0.5)                        // moderate-critical
if maxConcurrentProjects ≥ 5: baseScore += 10
elif ≥ 3: baseScore += 5
+ conflict penalty (existing conflicts × 2, capped at 10; severity bonus)

riskScore = min(100, round(baseScore))
severity = LOW (<40) | MEDIUM (<70) | HIGH (≥70)
```

The `factors[]` array surfaces the top 3 reasons with structured codes (`MAX_OVER_150`, `DAYS_OVER_150`, `DAYS_OVER_120`, `DAYS_OVER_100`, etc.) and human messages.

---

## 7.4 Integration Patterns

### Engine 7 ↔ Engine 2 (Tenancy)

- All Engine 7 services use `TenantAwareRepository` for resource entities (when accessed via DI factory) or `tenantContextService.assertOrganizationId()` for explicit checks.
- `ResourceHeatMapService` consults `WorkspaceAccessService.getAccessibleWorkspaceIds` for membership filtering — respects `ZEPHIX_WS_MEMBERSHIP_V1` flag.

### Engine 7 ↔ Engine 3 (Work Management)

- `DemandModelService` reads `WorkTask` schedule + `WorkResourceAllocation` to derive daily demand.
- `CapacityLevelingService` reads `WorkTask` + `WorkTaskDependency` and consults `CriticalPathEngineService` for float-aware shift recommendations.
- `CapacityGovernanceService` is invoked by Engine 3 task mutation paths (create / update / bulk-update) before persistence.

### Engine 7 ↔ Engine 5 (Governance)

- Capacity governance is the canonical sibling-service example (per Engine 5 ADR-005 + Engine 7 ADR-006).
- Audit emission discipline shared: uniform `GOVERNANCE_EVALUATE` action, distinguished by metadata.

### Engine 7 ↔ Engine 6 (Dashboards)

- Engine 6 consumes `ResourceHeatMapService` data, `ResourceRiskScoreService` outputs, and `CapacityAnalyticsService` series.
- Read path only; Engine 7 emits structured outputs that Engine 6 visualizes.

### Engine 7 ↔ F-A (Audit Trail)

- Capacity-governance evaluations emit `GOVERNANCE_EVALUATE` (durable forensic).
- Resources-module-local `AuditLog` entity coexists with the platform-wide `AuditService`. See [F-A doc Section F-A.4](../foundations/f-a-audit-trail.md) for the unification posture.

---

## 7.5 Practitioner Discipline + Competitive Positioning

This section frames Engine 7 against three things in order: what robust capacity discipline actually requires of a B2B governed PM platform; what existing platforms in this space do (and don't do); and how Zephix's architectural decisions produce defensible differentiation.

### 7.5.1 — What Discipline Requires

Capacity is the most-misused concept in PM software. Most platforms treat it as a single utilization scalar — "this person is at 87% this week" — and stop there. That treatment loses the practitioner-discipline insights that make capacity a useful governance signal rather than a vanity metric.

Robust capacity discipline requires the following non-negotiables:

- **100% utilization is an anti-pattern.** Queueing theory is unambiguous: as utilization approaches 100%, queue size grows non-linearly; small increases in load past ~70-80% produce outsized increases in delay. A platform that pushes users toward 100% is not optimizing for throughput; it is optimizing for the *appearance* of efficiency at the cost of actual delivery. Discipline requires the platform to recognize 80% as a yellow zone — not "fine, no signal" — and to make the recognition visible.
- **Capacity tracking must be daily, not weekly.** Sprint and weekly aggregates hide the days where one person carried 14 hours of demand against their 8-hour capacity. Daily granularity exposes the spike; weekly granularity averages it away. Discipline requires the data model to track per-day, even if the surfacing UI rolls up to weekly.
- **Overallocation is multi-axis, not scalar.** "How overallocated?" requires three orthogonal answers: how much (peak %), how often (days above threshold / total), how critical (peaks above 150% on critical-path days). A single scalar collapses these and loses the diagnostic power. Discipline requires multi-band scoring.
- **Resource histograms expose overallocation as a visible problem.** Numbers in tables hide spikes; histograms / heat-maps make spikes obvious. The visualization surface is part of the discipline, not optional.
- **RACI clarity is foundational to ownership decisions.** "Who is accountable for this work being done?" must be a structured field, not a comment in a description. Capacity decisions absent RACI clarity reassign work to people who aren't accountable, which doesn't actually reduce load on the accountable person.
- **Cost of delay typically exceeds cost of idle workers.** A common practitioner failure: treating idle capacity as the expensive thing and treating delay as free. The math is usually inverted: a one-week project delay on a $1M revenue project costs more than a worker idle for a week. Discipline requires the platform to expose cost of delay as a first-class signal so operators can reason about the tradeoff.
- **Sustainable pace is the anchor; resource leveling is the method.** "Sustainable pace" is the discipline-level concept: humans deliver more, more reliably, when not run at peak. "Resource leveling" is the operational method to achieve sustainable pace — shifting non-critical-path work into available capacity. Discipline requires the platform to support both: the principle (visible 80% awareness) and the method (leveling recommendations with critical-path awareness).
- **Recommendations, not auto-leveling.** Auto-leveling without operator approval erases context the platform doesn't have (urgency, dependency outside the system, customer commitments). Discipline requires the platform to recommend, not act.

What discipline explicitly forbids:

- Treating capacity as a single weekly utilization scalar.
- Defaulting overallocation classification to >100% only (loses the 70-80% queueing-theory signal entirely).
- Auto-leveling that mutates schedules without operator review.
- Encoding RACI as free-form description text (loses structure for queries and reports).
- Treating idle capacity as the only cost worth optimizing.

### 7.5.2 — What Existing Platforms Do (and Don't Do)

#### Resource Guru

Resource Guru positions as a remote-first capacity-planning tool with availability bars, heat-map views, clash management, and waiting-list workflows.

[Source: resourceguruapp.com/features/capacity-planning-software — accessed 2026-05-07]

- **Strength.** Simple visual UI, drag-and-drop scheduling, native heat-map showing over- vs. under-utilized resources, billable / non-billable utilization split, organizational hierarchies, booking-approver workflow.
- **Miss.** Capacity model is calendar-driven and booking-centric; less native fit for project-management workflows where the capacity question emerges from task assignments rather than explicit bookings. No first-class governance integration; the resource-management layer doesn't drive PM lifecycle decisions.
- **Where Zephix differs.** Engine 7's demand model derives from task schedule + assignment, not from explicit bookings. The capacity-governance integration (ADR-Engine-7-006) wires the capacity signal into the assignment mutation directly.

#### Float

Float provides real-time team availability, scheduling-conflict detection, workload balancing, and forecasting tools with billable/non-billable tracking.

[Source: float.com/product/capacity-planning — accessed 2026-05-07]

- **Strength.** Long-term forecasting, billable-vs-non-billable reporting, real-time team availability, scheduling-conflict detection.
- **Miss.** Like Resource Guru, the capacity model is allocation-and-scheduling-centric. Native PM lifecycle integration (task transitions, governance gates, audit emission) is not the architectural posture.
- **Where Zephix differs.** Engine 7's analytics output (overallocation entries, risk scores, leveling recommendations) feeds Engine 5 (governance) and Engine 6 (dashboards) as structured signals — capacity is a substrate for governed PM, not a standalone scheduling concern.

#### Atlassian Jira (Tempo, Capacity Insights, and similar Marketplace apps)

Native Jira does not ship capacity planning; the capability is delivered via Marketplace apps — Tempo (timesheets + planning), Capacity Insights, Resource Hub, etc.

[Source: atlassian.com/marketplace — accessed 2026-05-07]

- **Strength.** Mature Jira ecosystem; multiple competing capacity-planning apps with different opinions; integration with the Jira workflow ecosystem.
- **Miss.** Capacity is an integration concern, not a native concept. Customers compose their own stack (which app + which integration glue + which data residency posture). Audit-trail uniformity across the composed stack is a customer concern, not a platform property. The "Jira admin who understands the system" pattern from Engine 5's analysis applies here too.
- **Where Zephix differs.** Capacity is a native engine in Zephix, not a marketplace add-on. Audit emission, governance integration, and tenant scoping are platform properties, not per-app concerns.

#### Microsoft Project (Project Online, Project for the Web)

Microsoft Project includes resource leveling as a scheduling-engine output: the leveling algorithm produces a leveled schedule that resolves overallocations within the schedule constraints.

- **Strength.** Mature scheduling engine; leveling is a first-class scheduling concept; deep enterprise PM heritage.
- **Miss.** Leveling is automated (the algorithm produces the leveled schedule); operator agency is in the *configuration* of the leveling rules, not in per-recommendation review. Treats overallocation classification as binary; multi-band signals are not first-class.
- **Where Zephix differs.** Engine 7's leveling is read-only recommendations (ADR-Engine-7-002) — the operator reviews each recommendation. Multi-band risk scoring (ADR-Engine-7-003) gives nuanced classification rather than binary.

#### ClickUp

ClickUp provides Workload view and Capacity tracking as part of the Business and Enterprise tiers; resource allocation is configured per workspace.

[Source: clickup.com/features/workload — accessed 2026-05-07]

- **Strength.** Visual workload view, configurable per workspace, integrated with the broader ClickUp task model.
- **Miss.** Like ClickUp's governance posture (see [Engine 5 doc 5.5.2](engine-5-governance.md#552--what-existing-platforms-do-and-dont-do)), capacity is a flexibility-first feature rather than an architectural primitive. No multi-band risk scoring, no native leveling recommendations with critical-path awareness, no forensic-quality audit on capacity-governance evaluations.
- **Where Zephix differs.** Different segment and different posture. ClickUp is a credible alternative for "I want a workload view"; it is not a credible alternative for "I need capacity-as-governance with audit."

### 7.5.3 — Zephix's Differentiation

Engine 7's architectural decisions enable differentiation against the surveyed competitive set. Where shipped features deliver the differentiation, the docs cite shipped artifacts. Where the differentiation is positioned but the surface is forward roadmap, the docs cite the **architectural enabler** that is shipped — anchored in a current ADR — and clearly label the surface as future via `FW-Engine-7-XXX`. No marketing positioning is asserted without an architectural anchor.

#### Differentiation 1 — Multi-band capacity awareness, not single-axis overallocation

The risk-score machinery (ADR-Engine-7-003) recognizes 80%-100% as a yellow zone (0-10 risk points), 100-120% as overallocated (20-30 pts), 120-150% as critical (30-40 pts), and >150% as peak severity (40 pts). This is structurally different from competitors whose overallocation classification is binary (OK / overallocated at >100%).

**Shipped.** Anchored in: [resource-risk-score.service.ts](zephix-backend/src/modules/resources/services/resource-risk-score.service.ts) `computeRiskScore` pure function.

#### Differentiation 2 — Read-only leveling recommendations with critical-path awareness

ADR-Engine-7-002 (read-only recommendations) plus integration with `CriticalPathEngineService` produces leveling suggestions that preferentially shift tasks with float, not those on the critical path. The recommendation shape is structured (`taskId`, `currentStartDate`, `recommendedStartDate`, `shiftDays`, `reason`, `isCriticalPath`, `totalFloatMinutes`) — the operator sees the why, not just the what.

This is the inverse of MS Project's auto-leveling pattern: the system advises; the operator decides.

**Shipped.** Anchored in: [capacity-leveling.service.ts](zephix-backend/src/modules/work-management/services/capacity-leveling.service.ts) Phase 2E.

#### Differentiation 3 — Native overallocation detection, not feature-add reporting

Engine 7's heat-map, risk-score, demand-model, and analytics services are first-party Zephix services. Customers do not compose a stack of marketplace apps to get capacity planning. Audit emission, tenant scoping, and governance integration are platform properties.

This contrasts directly with Jira's marketplace-driven model where capacity capability quality varies by which app the customer chose.

**Shipped.** Anchored in: [resources/](zephix-backend/src/modules/resources/) module + [work-management/services/](zephix-backend/src/modules/work-management/services/) capacity stack.

#### Differentiation 4 — Capacity-as-governance with uniform audit emission

ADR-Engine-7-006 + Engine 5 ADR-Engine-5-005: capacity governance emits `GOVERNANCE_EVALUATE` audit on every assignment-time evaluation, uniform with rule-engine governance. The `metadata.governanceType` field distinguishes capacity vs. rule-engine origin; the audit constant is unified.

This produces forensic-quality records of capacity decisions that Resource Guru / Float / ClickUp do not architecturally guarantee.

**Shipped.** Anchored in: [capacity-governance.service.ts:129](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L129) audit emission.

#### Differentiation 5 — Architectural enabler for sustainable-pace default classification (FW-Engine-7-002)

The discipline (Section 7.5.1) calls 80% the yellow zone. The shipped behavior is:

- The risk-score machinery already recognizes 80% as a soft-warning band (Differentiation 1, shipped).
- The `CapacityAnalyticsService` overallocation **classification** default is `DEFAULT_UTILIZATION_THRESHOLD = 1.0` (100%) per ADR-Engine-7-005.
- The threshold is **per-query configurable** — tenants can pass `0.8` to opt into sustainable-pace classification on their queries.

Differentiation positioning: *the architecture enables sustainable-pace classification at the query level; the shipped default is 100% (strict overallocation); a UX-level sustainable-pace default with operator-visible explanation is forward roadmap as `FW-Engine-7-002`.*

**Shipped enabler; surface FW.** Anchored enabler in: [capacity-analytics.service.ts:13 + clampThreshold](zephix-backend/src/modules/work-management/services/capacity-analytics.service.ts#L13). FW item: `FW-Engine-7-002`.

#### Differentiation 6 — Architectural enabler for cost-of-delay calculations (FW-Engine-7-003)

The discipline (Section 7.5.1) names cost of delay as a first-class signal that should drive operator decisions. The shipped behavior is:

- No cost-of-delay calculation exists in the Engine 7 codebase today (verified via `grep "cost.of.delay\|costOfDelay"` — zero matches in resources/ and work-management/services/).
- The **architectural enablers** that exist: durable allocation entities, daily capacity granularity (ADR-Engine-7-004), and audit retention (preserves the basis for retrospective cost-of-delay computation).

Differentiation positioning: *the architectural foundation for cost-of-delay calculations exists in durable persistence + daily granularity + retention discipline. The calculation surface is forward roadmap as `FW-Engine-7-003`.* **No fictional shipped feature claimed.**

**Substrate enabler only; surface FW.** Anchored enablers in: [user-daily-capacity.entity.ts](zephix-backend/src/modules/resources/entities/user-daily-capacity.entity.ts), [resource-daily-load.entity.ts](zephix-backend/src/modules/resources/entities/resource-daily-load.entity.ts). FW item: `FW-Engine-7-003`.

#### Differentiation 7 — Demand modeling with explicit unmodeled-classification

The `DemandModelService` produces `entries[]` with structured `source` field (`task_estimate` / `task_duration_spread` / `allocation_fallback`) AND tracks `demandUnmodeledHours` with explicit reasons (`noAssignee`, `noDates`, `capacityDisabled`). This makes data-quality issues visible: customers see *how much demand we couldn't model and why*, not a silent best-effort number.

Resource Guru and Float track what is allocated; ClickUp tracks what is assigned. None of them surface the *unmodeled* slice as a first-class quality signal.

**Shipped.** Anchored in: [demand-model.service.ts](zephix-backend/src/modules/work-management/services/demand-model.service.ts) `DemandModelResult` shape.

### Section 7.5 summary

Differentiations 1, 2, 3, 4, 7 are shipped; Differentiations 5, 6 are honestly labeled as architectural enablers with `FW-Engine-7-XXX` surface items. Two architect-positioning claims that did not match shipped reality (sustainable-pace 80% as default; cost-of-delay calculations) were correctly classified as forward roadmap rather than perpetuated as fact. Adversarial cross-check discipline applied per HALT-DOC-BE-3.

---

## 7.6 Technical Debt + Future Work

### Debt-Engine-7-001 — `ResourceCalculationService.calculateResourceImpact()` declared dead

**State.** The method is FIXME'd in-code as dead since 2026-05-05 (task-entity-drift removal of `assignedResources`, `startDate`, `endDate` columns). Returns 0 unconditionally. Dead-by-transitivity: only consumed by legacy `tasks.service.ts` which is itself FIXME'd as dead (Engine 3 LegacyTasksGuard returns 410 Gone on `/tasks` writes).

**Risk.** Low present-day (no live caller produces a real value); medium reputational (a dead method in a service named "Calculation" is misleading to readers).

**Resolution path.** Either replace with a `WorkTask`-based calculation OR delete the service entirely if `/tasks` API is fully retired. Tracked in [docs/dispatches/TASK-ENTITY-DRIFT-EXECUTION-DISPATCH.md](../../dispatches/TASK-ENTITY-DRIFT-EXECUTION-DISPATCH.md).

### Debt-Engine-7-002 — Resources-module-local `AuditLog` entity vs. platform `AuditService`

**State.** The resources module ships its own `AuditLog` entity ([entities/audit-log.entity.ts](zephix-backend/src/modules/resources/entities/audit-log.entity.ts)) that coexists with the platform-wide `AuditService`. Two audit surfaces in the same module risks divergent retention, query, and export behavior.

**Risk.** Medium. A future compliance audit may surface inconsistencies between the two stores.

**Resolution path.** Reconcile to one audit surface (likely retire the local `AuditLog` and migrate to platform `AuditService`). See [F-A doc Section F-A.4](../foundations/f-a-audit-trail.md) for the unification posture.

### FW-Engine-7-001 — Auto-apply leveling recommendations with operator approval

**State.** Per ADR-Engine-7-002, leveling is read-only by design. A future surface could auto-apply recommendations after explicit operator approval (one-click apply) without violating the no-silent-mutate principle.

**Risk.** None present-day.

**Resolution path.** Engine 3 surface for "apply recommendation" mutation that consumes `LevelingRecommendation` and applies the shift; Engine 7 emits audit on application.

### FW-Engine-7-002 — Sustainable-pace default classification (UX-level)

**State.** Architectural enabler shipped (Differentiation 5): risk-score yellow band + per-query threshold configurability. The forward surface is a tenant-level default that classifies overallocation at 80% by default with explicit "this is a sustainable-pace flag, not a hard overallocation" UX framing.

**Risk.** Low. The default change should be opt-in to avoid surprising existing customers.

**Resolution path.** Add tenant-level setting (potentially via F-D capability registry) for `overallocationThreshold` defaulting to `0.8` for new tenants and grandfathered to `1.0` for existing. UX surface in Engine 6 dashboards distinguishes the two signals.

### FW-Engine-7-003 — Cost-of-delay calculations

**State.** Substrate enabler shipped (Differentiation 6): durable persistence + daily granularity + audit retention. No calculation surface exists.

**Risk.** None present-day; the absence is honest. Differentiation positioning depends on closing this for the segment that uses cost-of-delay as a first-class portfolio decision input.

**Resolution path.** Define cost-of-delay model (Reinertsen-style WSJF or similar), expose as a service computing `costOfDelay` per project + per gate decision; surface in Engine 6 dashboards and integrate with Engine 5 governance evaluations + Engine 8 (Budgets/EVM).

### FW-Engine-7-004 — RACI as first-class structured field

**State.** Project ownership exists (`deliveryOwnerUserId` on project entity); work-item assignee exists. Full RACI (Responsible / Accountable / Consulted / Informed) as structured fields is not yet first-class.

**Resolution path.** Schema extension on project + work-item entities, surfaced in Engine 6 dashboards. Coordinate with [AD-024 attributes architecture](../AD-024-work-item-attributes-architecture.md) — RACI may be expressed via the EAV substrate rather than direct columns.

### FW-Engine-7-005 — Workspace-level capacity defaults via `complexity_mode`

**State.** Workspace `complexity_mode` (per AD-026) is an Engine 2 substrate that Engine 7 does not yet consume. A `simple` workspace might default to 100% threshold; a `standard` workspace to 80%; an `advanced` workspace to a customer-defined value.

**Resolution path.** Read `complexity_mode` in `CapacityAnalyticsService.clampThreshold()`. Coordinated with [F-D doc Section F-D.6](../foundations/f-d-capability-registry.md).

### Architectural debt + future-work summary

| ID | Type | Severity | Owner stream | Surface elaborated |
|---|---|---|---|---|
| Debt-Engine-7-001 | Debt | Low | Engine 7 + Engine 3 (legacy tasks) | This doc + TASK-ENTITY-DRIFT dispatch |
| Debt-Engine-7-002 | Debt | Medium | Engine 7 → F-A | [F-A doc F-A.4](../foundations/f-a-audit-trail.md) |
| FW-Engine-7-001 | Future Work | — | Engine 7 + Engine 3 | This doc Section 7.6 |
| FW-Engine-7-002 | Future Work | — | Engine 7 + Engine 6 + F-D | This doc + F-D doc |
| FW-Engine-7-003 | Future Work | — | Engine 7 + Engine 5 + Engine 8 | This doc + Engine 8 doc |
| FW-Engine-7-004 | Future Work | — | Engine 7 + Engine 3 + AD-024 | AD-024 + this doc |
| FW-Engine-7-005 | Future Work | — | Engine 7 + F-D | This doc + F-D doc |

---

## 7.7 Architecture Decision Record History

### ADRs originating in this document

| ADR | Title | Status | Anchor PR/artifact |
|---|---|---|---|
| ADR-Engine-7-001 | Two-Module Topology (resources + work-management capacity) | Accepted | Pre-existing organic separation |
| ADR-Engine-7-002 | Read-Only Leveling Recommendations | Accepted | Phase 2E |
| ADR-Engine-7-003 | Multi-Band Risk Scoring | Accepted | resource-risk-score.service.ts |
| ADR-Engine-7-004 | User-Day Granularity for Capacity Tracking | Accepted | user-daily-capacity entity |
| ADR-Engine-7-005 | Default Utilization Threshold = 1.0 (configurable) | Accepted | capacity-analytics.service.ts:13 |
| ADR-Engine-7-006 | Capacity Governance via Sibling Service | Accepted (cross-references Engine 5 ADR-005) | Phase 2A capacity governance closure |

### Cross-references to existing architectural artifacts

| Document | Relationship to Engine 7 |
|---|---|
| [phase2a-authority-hardening-proof.md](../phase2a-authority-hardening-proof.md) | Phase 2A capacity governance proof; anchors ADR-Engine-7-006. |
| [phase2e-capacity-proof.md](../phase2e-capacity-proof.md) | Phase 2E capacity stack (analytics + leveling + demand model) proof; anchors ADR-Engine-7-002 and ADR-Engine-7-003. |
| [phase3b-audit-proof.md](../phase3b-audit-proof.md) | Audit-trail proof; Engine 7's capacity-governance emission discipline aligns. |
| [AD-024-work-item-attributes-architecture.md](../AD-024-work-item-attributes-architecture.md) | EAV substrate for FW-Engine-7-004 (RACI as structured field). |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](../AD-027-patch3-critical-path-rescoping.md) | AD-027 critical-path enumeration; resources controllers and work-management capacity controllers within scope. |
| [AD-028-frontend-work-management-unification.md](../AD-028-frontend-work-management-unification.md) | Frontend unification; Engine 7's outputs feed Engine 6 / front-end consumers per AD-028 patterns. |
| [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md) | `ZEPHIX_WS_MEMBERSHIP_V1` flag staging; `ResourceHeatMapService` respects via `WorkspaceAccessService`. |
| [V21_RECONCILIATION_2026-05-04.md](../V21_RECONCILIATION_2026-05-04.md) | V21 architecture reconciliation; Engine 7 boundary confirmed. |
| [governance-evaluations-retention.md](../governance-evaluations-retention.md) | Retention policy that preserves the substrate for FW-Engine-7-003 cost-of-delay retrospective computation. |
| [Engine 2 doc](engine-2-tenancy.md) | Tenant context that Engine 7 consumes; defense-in-depth via TenantAwareRepository. |
| [Engine 5 doc](engine-5-governance.md) | Capacity governance ↔ rule engine sibling architecture (ADR-Engine-5-005 ↔ ADR-Engine-7-006). |
| [Engine 8 doc](engine-8-budgets-evm.md) | Cost-of-delay (FW-Engine-7-003) integration territory; budget allocation linkage. |
| [F-A doc](../foundations/f-a-audit-trail.md) | Audit emission patterns; capacity-governance is a positive example. Local AuditLog reconciliation in Section F-A.4. |
| [F-D doc](../foundations/f-d-capability-registry.md) | `complexity_mode` substrate; Engine 7 is candidate consumer (FW-Engine-7-005). |

### What this document is *not*

- **Not** a re-statement of the resource CRUD admin surface — see resources controllers.
- **Not** a re-statement of the leveling-recommendations UI — that's an Engine 6 / front-end concern.
- **Not** a time-tracking spec — actuals vs. plan is out of scope for shipped Engine 7; see [V21_RECONCILIATION](../V21_RECONCILIATION_2026-05-04.md) for the in-or-out determination.

### Cross-document navigation

- Sibling engine docs: [Engine 2 (Tenancy)](engine-2-tenancy.md), [Engine 5 (Governance)](engine-5-governance.md), [Engine 8 (Budgets/EVM)](engine-8-budgets-evm.md)
- Foundation docs: [F-A (Audit)](../foundations/f-a-audit-trail.md), [F-B (Notifications)](../foundations/f-b-notifications.md), [F-C (Integrations)](../foundations/f-c-integrations.md), [F-D (Capability Registry)](../foundations/f-d-capability-registry.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of Engine 7 — Resources & Capacity architectural document.**
