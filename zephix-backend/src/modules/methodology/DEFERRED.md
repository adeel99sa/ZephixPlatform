# Methodology Module — Deferred Items

Items intentionally deferred from the MVP milestone. Each is a known gap with
a defined integration point for when it becomes needed.

## 1. Sprint-Complete Governance Hook

**What**: Fire governance engine evaluation when a sprint is completed.
**Why deferred**: No governance policy rules currently target sprint closure events.
Adding the hook without rules would be dead code.
**Integration point**: `IterationsService.completeIteration()` —
add `GovernanceRulesService.evaluateEvent('sprint_complete', ...)` after
the sprint status change.
**When to build**: When a governance rule type is added that triggers on sprint closure
(e.g., "sprint cannot close with > 20% carryover").

## 2. Phase-Complete Governance Hook (Beyond Gate Approval)

**What**: Fire governance engine evaluation when a phase is completed,
in addition to the existing gate approval check.
**Why deferred**: The gate approval check covers the primary enforcement need.
Additional governance rules on phase completion require new rule types.
**Integration point**: `WorkPhasesService.completePhase()` —
add `GovernanceRulesService.evaluateEvent('phase_complete', ...)` after
the phase status update.
**When to build**: When governance rule types are added that target phase closure
(e.g., "phase cannot close with open blockers").

## 3. Ceremony / Communication Cadence Config

**What**: Scheduled ceremonies (standups, retrospectives, demos) and
communication templates per methodology.
**Why deferred**: No scheduling or notification primitives exist in the platform yet.
Adding ceremony config without execution capability would be config theater.
**Integration point**: `MethodologyConfig.ceremonies` field + a new
`CeremonySchedulerService` once the notification system is built.

## 4. Quality Policies / Definition of Done Library

**What**: Reusable DoD templates and quality gate policies at the org/workspace level.
**Why deferred**: DoD is currently a JSONB array on Project — not a first-class
entity with governance or workflow integration.
**Integration point**: New `DefinitionOfDone` entity + `QualityPolicyService`.
Wire into task completion and sprint completion when both primitives exist.

## 5. Resource Model Nuances

**What**: Per-methodology resource allocation strategies (dedicated teams vs.
cross-functional vs. role-based pools).
**Why deferred**: The existing resource allocation system works at the
project-resource level. Methodology-driven allocation strategies require
deeper integration with capacity planning.
**Integration point**: `MethodologyConfig.resources` field + enhancement to
`ResourceAllocationService`.

## 6. Budgeting Structures Beyond On/Off

**What**: Detailed budget breakdown models per methodology (e.g., sprint-level
budgets for Scrum, phase-level budgets for Waterfall).
**Why deferred**: Cost tracking is currently a single project-level budget.
Sub-project budget allocation requires new entities.
**Integration point**: `MethodologyConfig.budgeting` field + new
`BudgetAllocationEntity` per phase/sprint.

## 8. Feature Enforcement Gaps (API-level)

`MethodologyConstraintsService` provides assertion methods for all capability
flags, but they are not yet wired into all feature controllers. Current state:

| Feature | Enforced? | Where | Gaps |
|---------|-----------|-------|------|
| Sprints | YES | `IterationsService.assertIterationsEnabled` | None — all CRUD enforced |
| Phase gates | YES | `WorkPhasesService.completePhase` | None |
| Earned Value | PARTIAL | `EarnedValueService` checks `project.earnedValueEnabled` | `GET earned-value/history` does not check |
| Baselines | NO | — | All 5 endpoints (create, list, get, activate, compare) |
| Cost tracking | PARTIAL | `ProjectCostService` zeroes summary; rollup filters | `GET/PATCH budget` does not check |
| Change requests | NO | — | All 9 endpoints (CRUD + submit/approve/reject/implement) |
| Capacity | NO | Utilization partially filters via demand model | Calendar, leveling, resources capacity |

**How to wire**: Inject `MethodologyConstraintsService` into each feature
service. Call the appropriate assertion at the top of write operations.
Read operations can optionally check or return empty results with a flag.

**Priority order**:
1. Change requests — creates data that implies governance capability
2. Baselines — creates persisted snapshots that reference project state
3. Budget write — allows cost allocation when cost tracking is off
4. Capacity endpoints — lower risk, mostly informational

## 7. Dual Source of Truth Deprecation

**What**: Remove legacy boolean governance flags from the Project entity
once all services read from `methodologyConfig`.
**Why deferred**: Services still read legacy flags in some paths.
`MethodologyConfigSyncService` keeps them in sync during the transition.
**When to build**: After a full audit confirms every read path uses
`methodologyConfig` directly, remove the legacy columns via migration.
