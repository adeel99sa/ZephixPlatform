# Engine 5 — Governance & Phase Gates

**Status**: Substantively built; Wave9 governance smoke 10/10 baseline (post-PR #260)
**Owner Engine**: Engine 5 (per Blueprint v2 §4)
**Engine Boundary**: Governance rule resolution, condition evaluation, enforcement decisioning, phase-gate submissions, gate approval chains, governance exception override pathway
**HEAD at authoring**: `4ad62fa8` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)

---

## 5.1 Purpose & Scope

Engine 5 is the substrate that answers a single configurable question on every state-mutation event: **"is this transition allowed under the rules that apply to this scope?"** It produces one of three outcomes — `ALLOW`, `WARN`, `BLOCK` — and emits the decision into the audit trail.

### What Engine 5 IS responsible for

- **Governance rule resolution** — given (organizationId, workspaceId, projectId, templateId, entityType), resolve the applicable rule set across the 5-tier scope cascade
- **Condition evaluation** — apply the rule definition's condition list against the candidate entity and actor context
- **Enforcement decisioning** — translate condition results into `ALLOW` / `WARN` / `BLOCK` based on the rule set's `EnforcementMode`
- **Phase-gate submission lifecycle** — submission states (DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, RECALLED) and their permitted transitions
- **Gate approval chains** — chained approver evaluation across multi-stage gates
- **Governance exception override** — opt-out workflow for specific blocked transitions, with audit
- **Capacity governance** — assignment-time evaluation of work-load thresholds (sibling service)

### What Engine 5 is NOT responsible for

- **Tenant scope enforcement** — owned by Engine 2. Engine 5 receives `(organizationId, workspaceId)` from Engine 2 and trusts it.
- **RBAC primitives** — owned by Engine 1. The `ROLE_ALLOWED` and `USER_ALLOWED` condition types defer to Engine 1's role semantics.
- **Audit emission infrastructure** — owned by F-A. Engine 5 *calls* `auditService.record` with the `GOVERNANCE_EVALUATE` action.
- **Work entity lifecycle** — owned by Engine 3. Engine 5 *evaluates* transitions; it does not own task or work-item state machines.
- **Template definition** — owned by Engine 4. Engine 5 evaluates `TEMPLATE`-scoped rule sets but does not own the template surface.
- **Phase definition** — owned by the project / work-management surface. Engine 5 evaluates submissions against gate definitions but does not own phase semantics.

### Engine boundary tests

| Question | Answer is Engine 5 if… | Answer is *not* Engine 5 if… |
|---|---|---|
| "Does this code resolve which rule set applies?" | yes — `GovernanceRuleResolverService` | it consumes the resolved rule set and applies the result |
| "Does this code translate condition outcomes into ALLOW/WARN/BLOCK?" | yes — `GovernanceRuleEngineService` | it surfaces the decision to the user (Engine 3/4/6 territory) |
| "Does this code define what 'Done' means for a task?" | no | yes — Engine 3 owns task state machines |
| "Does this code create the audit row for a governance evaluation?" | no — F-A | yes — Engine 5 *calls* the audit service |

---

## 5.2 Architectural Decisions (Retrospective ADRs)

Six decisions shape the Engine 5 surface. Each is a retrospective ADR documenting the durable architectural choice realized in code.

### ADR-Engine-5-001 — Five-Tier Scope Cascade

**Context.** Governance must be configurable at multiple levels: Zephix-controlled defaults, customer-tenant overrides, workspace-specific tightenings, project exceptions, and template-bundled rule sets. A single-tier scope (organization-only) would force every workspace under an organization to share the same enforcement.

**Decision.** Five tiers, in resolution order:

```
SYSTEM → ORG → WORKSPACE → PROJECT → TEMPLATE
```

Defined in [`governance-rule-set.entity.ts`](zephix-backend/src/modules/governance-rules/entities/governance-rule-set.entity.ts):

```ts
export enum ScopeType {
  SYSTEM = 'SYSTEM',
  ORG = 'ORG',
  WORKSPACE = 'WORKSPACE',
  PROJECT = 'PROJECT',
  TEMPLATE = 'TEMPLATE',
}
```

**Resolution semantics.** [`GovernanceRuleResolverService`](zephix-backend/src/modules/governance-rules/services/governance-rule-resolver.service.ts) resolves the most-specific applicable rule set for a given `(organizationId, workspaceId, projectId, templateId, entityType)` tuple. Caching is layered (resolver-cache spec covers the contract).

**Consequences.**

- **Tenant ownership of governance.** Customers own their org-tier rule sets; Zephix ships SYSTEM defaults but does not impose them (see ADR-Engine-5-003).
- **Template-bundled governance** — ADR-Engine-5-001 explicitly enables a template to ship its own governance rules, which is consumed by Engine 4 (templates) without coupling.
- **Cost.** Five tiers means rule-set resolution is hot-path on many mutations. The resolver-cache and inputs-hash machinery exist specifically to make this affordable. See [`inputs-hash.ts`](zephix-backend/src/modules/governance-rules/engine/inputs-hash.ts).

---

### ADR-Engine-5-002 — Four-Tier Enforcement Mode

**Context.** "Pass / fail" is too coarse for a governed enterprise PM platform. An organization rolling out a new policy needs to observe ("does this rule actually fire on real workflows?") before enforcing; some transitions need an admin escape hatch even after enforcement begins.

**Decision.** Four enforcement modes per rule set:

```ts
export enum EnforcementMode {
  OFF = 'OFF',                      // rule set is dormant; resolver skips it
  WARN = 'WARN',                    // condition failures emit reasons, transition allowed
  BLOCK = 'BLOCK',                  // condition failures emit reasons, transition rejected
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE', // BLOCK semantics with override pathway via GovernanceException
}
```

**Consequences.**

- **OFF as a first-class state** — adoption is staged: ship the rule, observe, switch to WARN, then BLOCK.
- **WARN ≠ ignore.** Even WARN evaluations write a `GOVERNANCE_EVALUATE` audit row with the failed conditions. The decision is forensic-quality even when the transition was allowed.
- **ADMIN_OVERRIDE is its own state.** This pairs with the [`governance-exceptions`](zephix-backend/src/modules/governance-exceptions/) module — see ADR-Engine-5-004.

---

### ADR-Engine-5-003 — Advisory Governance Philosophy (WARN as Canonical MVP Mode)

**Context.** Two governance philosophies were available:

- **Strict mode** — every governance rule defaults to BLOCK; users must satisfy conditions or the transition is rejected.
- **Advisory mode** — every governance rule defaults to WARN; users see the rationale but the transition is permitted; the audit trail records the decision.

**Decision.** Adopt **advisory mode** as the canonical Zephix governance philosophy for MVP. SYSTEM rule packs ship with `EnforcementMode.OFF`; customers opt into WARN; BLOCK is opt-in beyond that.

The phrasing is locked in [`capacity-governance.service.ts:20-22`](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L20):

> "This aligns with Zephix's advisory governance model: inform the decision-maker, record the decision, don't silently allow."

**Consequences.**

- **Ergonomics over enforcement at MVP.** A new customer's first impression is "Zephix tells me about my governance posture" — not "Zephix blocks my work."
- **Forensic completeness preserved.** Audit emission happens regardless of whether the transition was allowed.
- **Capacity governance is the canonical example.** [`CapacityGovernanceService`](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts) ships in WARN mode at a 15-active-task threshold (`DEFAULT_MAX_ACTIVE_TASKS`). Always allows; always emits.

---

### ADR-Engine-5-004 — Governance Exception as Override Pathway

**Context.** ADMIN_OVERRIDE enforcement mode rejects a transition unless a sanctioned exception exists. The exception lifecycle requires a formal request artifact, a pending status awaiting admin approval, and audit emission on creation, approval, and use.

**Decision.** Exceptions are first-class entities in their own module — [`governance-exceptions/`](zephix-backend/src/modules/governance-exceptions/) — not attributes on the evaluation row. Each exception:

- Carries `(organizationId, workspaceId, projectId, exceptionType, reason, requestedByUserId, status)` as durable columns
- Persists `metadata` JSONB for transition-specific context (taskId, toStatus, etc.)
- Emits `GOVERNANCE_EVALUATE` audit on creation ([`governance-exceptions.service.ts:44`](zephix-backend/src/modules/governance-exceptions/governance-exceptions.service.ts#L44))
- Supports lookup by transition signature ([`findPendingGovernanceRuleForTaskTransition`](zephix-backend/src/modules/governance-exceptions/governance-exceptions.service.ts#L71)) to dedupe retries

**Consequences.**

- **Override is a workflow, not a flag.** Users cannot bypass governance silently; even an exception leaves a paper trail.
- **Module separation respects the engine boundary.** Exceptions live in their own module so the rule engine can be deleted/replaced without losing the override surface.
- **The GovernanceRuleEngine is `@Optional()` on the exception repository** ([`governance-rule-engine.service.ts:62-65`](zephix-backend/src/modules/governance-rules/services/governance-rule-engine.service.ts#L62)) — non-breaking if exceptions are unwired (defense-in-depth coupling).

---

### ADR-Engine-5-005 — Capacity Governance as a Sibling Service, Not a Rule-Engine Consumer

**Context.** Capacity governance is conceptually a governance rule ("user X cannot have more than N active tasks"). Two implementations were possible: encode capacity as a `ConditionType` in the rule engine, or build a sibling service alongside it.

**Decision.** Sibling service. [`CapacityGovernanceService`](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts) lives in `work-management/services/`, not in `governance-rules/`. It is wired into `createTask`, `updateTask`, and `bulkUpdateStatus` directly.

**Consequences.**

- **Capacity is a workspace-property check**, not a transition condition — counting active tasks for a user requires a database query, not an entity-attribute predicate.
- **Both paths emit `GOVERNANCE_EVALUATE`** with `metadata.governanceType = 'CAPACITY'` vs. `'EXCEPTION_CREATED'` — analytics can distinguish, but the audit constant is uniform.
- **Future unification is possible** by adding a `RELATED_COUNT_LTE` condition type that runs the count internally. Not scoped for MVP.

---

### ADR-Engine-5-006 — Workspace `complexity_mode` as a Governance Substrate Knob

**Context.** Different customer maturity levels want different governance defaults. A simple workspace differs from an advanced one. Encoding this as per-rule-set configuration is high-friction.

**Decision.** Per AD-026, the workspace entity carries a `complexity_mode` enum:

```sql
-- migration 18000000000080
ADD COLUMN complexity_mode workspace_complexity_mode_enum NOT NULL DEFAULT 'simple'
```

Three modes: `simple` / `standard` / `advanced`. The substrate is provisioned; consumer wiring into governance rule defaults is **future work** (positioned as F-D substrate).

**Consequences.**

- **Schema-stable.** The column exists; future feature work can read it without a migration.
- **Currently a no-op for governance defaults.** Engine 5 does not yet branch on `complexity_mode`. Tracked as Debt-Engine-5-002.
- **Cross-engine substrate.** `complexity_mode` is *physically* an Engine 2 surface (workspace property) but *semantically* an F-D capability gate. See [F-D doc Section F-D.3](../foundations/f-d-capability-registry.md).

---

## 5.3 Current Implementation State

### Module structure

```
governance-rules/
├── controllers/governance-rules.controller.ts         # admin REST
├── dto/governance-rules.dto.ts
├── engine/
│   ├── condition-evaluators.ts                        # 8 ConditionType evaluators
│   ├── default-rule-seeds.ts                          # 3 SYSTEM packs, 7 rules
│   ├── inputs-hash.ts                                 # cache key derivation
│   └── snapshot-builder.ts                            # entity snapshot for evaluation
├── entities/
│   ├── governance-rule-set.entity.ts                  # ScopeType, GovernanceEntityType, EnforcementMode enums
│   ├── governance-rule.entity.ts                      # ConditionType, ConditionSeverity, RuleDefinition
│   ├── governance-rule-active-version.entity.ts       # version pinning
│   └── governance-evaluation.entity.ts                # decision audit row
├── services/
│   ├── governance-rule-engine.service.ts              # evaluation orchestrator
│   ├── governance-rule-resolver.service.ts            # 5-tier resolver + cache
│   ├── governance-rules-admin.service.ts              # CRUD on rule sets
│   └── governance-template.service.ts                 # template-scoped rule packaging
└── governance-rules.module.ts

governance-exceptions/
├── controllers/governance-exceptions.controller.ts
├── entities/governance-exception.entity.ts
├── governance-exceptions.service.ts                   # create + list + lookup
└── governance-exceptions.module.ts

work-management/services/
├── capacity-governance.service.ts                     # sibling capacity evaluator
├── phase-gate-evaluator.service.ts                    # gate submission evaluator
├── gate-approval-chain.service.ts                     # multi-stage approver chain
└── gate-approval-engine.service.ts                    # chain execution
```

### SYSTEM rule inventory

3 packs, **7 rules** total (the dispatch's stated count of "9 SYSTEM rules" referred to a planned set; the implemented set is 7. Difference is documented as Debt-Engine-5-001 below — pack-completion item, not a divergence from intent):

| Pack | Rule code | Severity | Trigger |
|---|---|---|---|
| Pack 1 — Task Completion Guards | `TASK_DONE_REQUIRES_ASSIGNEE` | ERROR | `toStatus = DONE` |
| | `TASK_DONE_REQUIRES_AC` | ERROR | `toStatus = DONE` |
| | `TASK_DONE_ZERO_REMAINING` | WARNING | `toStatus = DONE` |
| | `TASK_IN_PROGRESS_REQUIRES_START_DATE` | WARNING | `toStatus = IN_PROGRESS` |
| Pack 2 — Change Request Approval Guards | `CR_APPROVED_REQUIRES_APPROVALS` | ERROR | CR transition to APPROVED |
| | `CR_IMPLEMENTED_REQUIRES_PLAN` | ERROR | CR transition to IMPLEMENTED |
| Pack 3 — Phase Gate Guards | `GATE_REQUIRES_SUBMISSION_APPROVED` | ERROR | gate transition |

All 7 ship with `EnforcementMode.OFF` per ADR-Engine-5-003. Customers opt in.

### Phase gate evaluation

[`PhaseGateEvaluatorService`](zephix-backend/src/modules/work-management/services/phase-gate-evaluator.service.ts) is the gate-specific equivalent of the rule engine. It evaluates submissions in a fixed order (per architect spec, lines 62-66):

1. `mergeResourceConflictBlockers()` — pulls active resource conflicts as BLOCKER items
2. `mergeQualityWarnings()` — pulls quality-policy violations as WARNING items
3. Chain-aware evaluation — if a `GateApprovalChain` exists, runs through `GateApprovalEngineService`

Severity: `BLOCKER` / `WARNING` / `INFO`. Result returns `{ canApprove, items, chainState }`. The current shape supports a binary approve/reject decision; the architectural enabler for richer decision modes is Section 5.5.3 differentiation territory.

### Capacity governance

[`CapacityGovernanceService.evaluateAssignment`](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L68) is wired into `createTask`, `updateTask`, `bulkUpdateStatus`. Threshold: 15 active tasks per (user, workspace) — TODO/IN_PROGRESS statuses counted. Mode: WARN. Project must have `capacityEnabled = true`.

### Wave9 governance smoke baseline

Post-PR #260 (Decision C contract closure for tenant context), the Wave9 governance smoke run baseline is **10/10**. Recorded in [`proofs/phase5a/wave9/`](../proofs/phase5a/wave9/).

### Audit emission state

Engine 5 emission is **clean** for all rule-engine and capacity-governance evaluations:

- [`capacity-governance.service.ts:129`](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L129) — emits `GOVERNANCE_EVALUATE` with full metadata
- [`governance-exceptions.service.ts:44`](zephix-backend/src/modules/governance-exceptions/governance-exceptions.service.ts#L44) — emits `GOVERNANCE_EVALUATE` with `governanceType: 'EXCEPTION_CREATED'`
- The rule engine path emits via the evaluation entity persistence (`GovernanceEvaluation`)

This contrasts with the Engine 2 audit emission gap on `changeOwner()` (see [Engine 2 doc Section 2.3](engine-2-tenancy.md#23-current-implementation-state) and [F-A doc Section F-A.3](../foundations/f-a-audit-trail.md)). Engine 5's emission discipline is the canonical positive example.

---

## 5.4 Integration Patterns

### Engine 5 ↔ Engine 2 (Tenancy)

- Engine 5 services accept `(organizationId, workspaceId)` from controllers; values come from Engine 2's tenant context.
- Resolver and exception lookups both filter by `organizationId` (strict) and optionally `workspaceId`.
- No direct call into Engine 2 services; Engine 5 trusts the upstream context.

### Engine 5 ↔ Engine 1 (RBAC)

- `ConditionType.ROLE_ALLOWED` and `ConditionType.USER_ALLOWED` defer to Engine 1 role primitives.
- The `actor.platformRole` and `actor.workspaceRole` fields on `EvaluateParams` ([governance-rule-engine.service.ts:43-47](zephix-backend/src/modules/governance-rules/services/governance-rule-engine.service.ts#L43)) are populated upstream by Engine 1's permission machinery.
- Engine 5 does not interpret roles itself.

### Engine 5 ↔ Engine 3 (Work Management)

- Engine 3 calls `governanceRuleEngineService.evaluate(…)` immediately before applying a state transition.
- The transition either proceeds (`ALLOW` / `WARN`) or is rejected with the structured reasons (`BLOCK` / `ADMIN_OVERRIDE` without exception).
- `CapacityGovernanceService` is invoked *after* the transition decision is made but *before* persistence — the WARN payload rides on the response.

### Engine 5 ↔ Engine 4 (Templates)

- Engine 4 templates can carry their own `TEMPLATE`-scoped rule sets via `governance-template.service.ts`.
- When a template is applied to create a project, Engine 4 transcribes the template's rule set onto the new project (via the `PROJECT` scope).

### Engine 5 ↔ Engine 6 (Dashboards)

- Governance evaluations are aggregated for dashboard widgets.
- The `governance_evaluations` table is the source; Engine 6 owns the read path.
- Retention: see [governance-evaluations-retention.md](../governance-evaluations-retention.md).

### Engine 5 ↔ F-A (Audit Trail)

- Every evaluation emits `AuditAction.GOVERNANCE_EVALUATE` with rich metadata.
- This is the canonical positive example of F-A integration — the contrast Engine 5 specifically does not exhibit is the gap on Engine 2 destructive ops.

### Engine 5 ↔ F-D (Capability Registry)

- `complexity_mode` is the F-D substrate that should drive default `EnforcementMode` selection. Wiring is future work.

---

## 5.5 Practitioner Discipline + Competitive Positioning

This section frames Engine 5 against three things in order: what robust governance discipline actually requires of a B2B governed PM platform; what existing platforms in this space do (and don't do); and how Zephix's architectural decisions produce defensible differentiation.

### 5.5.1 — What Discipline Requires

A B2B governed PM platform serves enterprises where the governance question — "should this transition happen, given the rules our organization has chosen to enforce?" — is a recurring operational concern, not a one-time setup.

Robust governance discipline requires the following non-negotiables:

- **Phase gates are analytical decision points, not approval workflows.** A phase gate is the moment when an organization decides whether to advance, recycle (redo with corrections), or kill an investment. Treating it as a binary "approve/reject" workflow flattens a three-option (sometimes four-option, with explicit "hold") decision into a yes/no — and silently encourages the cultural pattern of advancing under-prepared work because rejecting feels political. Discipline requires the platform to expose all decision options as first-class outcomes, not just the path to approval.
- **Governance is contextual, not absolute.** What belongs in a governance rule for a regulated-industry program is not what belongs in a governance rule for an internal-tooling team's sprint. Discipline requires multi-level tailoring — defaults at the platform level, opt-in tightening at the organization level, situational overrides at the workspace and project levels — not a single global rule set that every customer must accept or escape.
- **Stage-gate decisions link to staged investment release.** In disciplined PM, gates aren't ceremonial; they release funding for the next phase. The mechanism by which the gate decision propagates to the budget allocation is part of governance, not a downstream finance concern. A platform that treats gates as pure approval workflows separates the gate decision from the budget release and produces governance theater.
- **Benefits realization is tracked beyond project closure.** Disciplined investment governance does not stop at "project completed." It includes a benefits-realization review — typically 3-12 months after close — where the original investment justification is re-tested against actual outcomes. The platform must retain the governance evaluations, gate decisions, and audit trail past project closure to support this; deleting historical state at close erases the basis for the BR review.
- **WARN mode is not a weakness; BLOCK mode is not a virtue.** A platform that defaults to BLOCK creates two failure modes: customer ergonomics (users blocked from doing work they need to do) and audit corruption (users routinely use overrides, hollowing the audit trail's signal). A platform that defaults to OFF/WARN creates one observable mode (some rules are observed, not yet enforced) and lets customers stage adoption: ship the rule, observe its hit rate against real workflow, then graduate to BLOCK only for the conditions where blocking is justified. Discipline requires the staging.
- **Configurable per industry regulation.** A FedRAMP-touching customer's governance rule set is structurally different from a HIPAA-touching customer's set, which is structurally different from a PCI-touching customer's set. The platform must support per-tenant rule-set composition, not a one-size-fits-all built-in compliance pack. Rule packs may ship as templates; they must not be the only mode.

What discipline explicitly forbids:

- Conflating gate approvals with task transitions (different decision shapes).
- Hard-coding the gate-decision options as boolean (loses recycle/kill semantics).
- Storing governance state in mutable columns on the entity (forensic state must be in append-only audit rows).
- Allowing the platform's own SYSTEM-tier rules to be on-by-default (every customer becomes a Zephix governance subject without consent).
- Silent enforcement (a rule fired and rejected the transition, but the audit trail does not record it).

### 5.5.2 — What Existing Platforms Do (and Don't Do)

#### Atlassian Jira

Jira's governance surface is workflow validators and conditions: each workflow transition can be guarded by validators (must-pass), and conditions (visibility predicates). Custom validators are implemented as Forge or Connect apps; built-in validators cover field-required, role-required, and similar.

[Source: support.atlassian.com/jira-cloud-administration/docs/configure-workflow-rules/ — accessed 2026-05-07]

- **Strength.** Mature workflow ecosystem; granular per-transition guarding; large marketplace of custom validators.
- **Miss.** Governance is encoded as workflow attributes — to know "what governance applies to this transition" you read the workflow scheme attached to the project. There is no first-class "governance" concept above the workflow. Phase-gate semantics are layered on top via custom workflow patterns; multi-option (advance/recycle/kill) gate decisions are not first-class.
- **Where Zephix differs.** Engine 5's rule engine *intercepts* transitions without modifying the entity state machine. The state machine is Engine 3's concern (work-task statuses); the governance is Engine 5's concern (rule sets, evaluations, audit). Separation rather than entanglement.

#### Microsoft Project for the Web / Project Online (Project Server) and Primavera P6

Microsoft's enterprise tier exposes phase-gate workflows via Project Online with SharePoint-backed approval flows; Power Automate flows can implement complex gate logic. Oracle Primavera P6 has native gate definitions in its enterprise project structure.

- **Strength (P6).** Native phase-gate concept; tied into earned-value and schedule baselines; deep enterprise PM heritage in construction and capital projects.
- **Strength (Project Online).** SharePoint integration for gate document repositories; Power Automate for approval routing.
- **Miss.** Both treat gate approvals as workflow events with binary outcome. Multi-option gate decisions (advance/recycle/kill) are encoded in workflow branching rather than as first-class decision states. Benefits-realization tracking exists in P6's enterprise tier but is configured per-customer, not platform-default.
- **Where Zephix differs.** Engine 5 currently returns `{ canApprove, items, chainState }` — a binary shape today, but the architecture (governance rule engine + governance exceptions + audit emission discipline) is the substrate for first-class multi-option decisions without retrofit. Section 5.5.3 enumerates this as differentiation by enabler.

#### Asana

Asana's enterprise tier supports approval tasks (single-approver typical) and proofing workflows (creative review). Goals (OKRs) provide a strategic-context layer.

[Source: asana.com/guide/help/projects/proofing — accessed 2026-05-07]

- **Strength.** Clean approval task UX; Goals integration for strategic alignment; mature for cross-functional non-technical teams.
- **Miss.** No native phase-gate concept; no governance rule engine; no audit-trail-as-first-class discipline (audit log API exists but isn't the centerpiece). Asana is positioned for marketing/operations/cross-functional, not for governed-PM.
- **Where Zephix differs.** Different segment. Asana is a credible competitor for the "we want approval workflows" customer; not for the "we have a regulated phase-gate program" customer.

#### Linear

Linear's project model is light on governance: no approval workflows, no gate concept, no rule engine. Issue lifecycle is engineering-team flat: triage → backlog → started → in review → done.

[Source: linear.app/docs/project — accessed 2026-05-07]

- **Strength.** Engineering velocity and ergonomics; clean state machine for software work.
- **Miss.** Out-of-scope by design for governed PM. Linear's market is engineering teams, not multi-program portfolio governance.
- **Where Zephix differs.** Different segment entirely. Customers who outgrow Linear's flat model and need program-level governance need a different tool.

#### ClickUp

ClickUp positions custom statuses, custom fields, and conditional automations as the governance toolkit — extensive flexibility, no opinion about discipline.

- **Strength.** Deep customization; conditional automations can implement many governance patterns; strong fit for cross-functional teams that prioritize speed.
- **Miss.** Governance as an architectural property is not the platform's stance. The "ship fast, customize later" pitch is the explicit anti-pattern for the regulated-program customer.
- **Where Zephix differs.** Zephix's segment is exactly the customer who has outgrown the "customize until it works" approach and needs governance encoded as architectural primitives (rule engine, scope cascade, exception override) rather than per-tenant automation flows.

### 5.5.3 — Zephix's Differentiation

Engine 5's architectural decisions enable differentiation against the surveyed competitive set. Where shipped features deliver the differentiation, the docs cite shipped artifacts. Where the differentiation is positioned but the surface is future work, the docs cite the **architectural enabler** that is shipped — anchored in a current ADR — and clearly label the surface as future. No marketing positioning is asserted without an architectural anchor.

#### Differentiation 1 — Governance as a first-class engine, not a workflow attribute

The 5-tier scope cascade (ADR-Engine-5-001) and the 4-tier enforcement mode (ADR-Engine-5-002) are shipped: rule sets at SYSTEM/ORG/WORKSPACE/PROJECT/TEMPLATE, with OFF/WARN/BLOCK/ADMIN_OVERRIDE resolution. This is structurally different from Jira's "governance lives in workflow schemes" model. A customer asking "what governs this transition?" gets a single answer from the resolver, not a composition of attached workflow + scheme + validator + condition.

Anchored in: [governance-rule-set.entity.ts](zephix-backend/src/modules/governance-rules/entities/governance-rule-set.entity.ts), [governance-rule-resolver.service.ts](zephix-backend/src/modules/governance-rules/services/governance-rule-resolver.service.ts), Wave9 baseline 10/10.

#### Differentiation 2 — Advisory governance philosophy with forensic-quality emission

ADR-Engine-5-003 (advisory mode as canonical MVP) plus the audit emission discipline (every evaluation writes a `GOVERNANCE_EVALUATE` row regardless of outcome) gives Zephix a posture that competitors structurally lack: WARN-mode customers get full forensic evidence without blocked workflows; BLOCK-mode customers get the same audit trail. The forensic completeness is not a configuration option; it is an architectural property.

This is the inverse of the Jira pattern where governance is implemented in customer-supplied custom validators that may or may not emit useful audit trails depending on the validator's quality. Zephix's emission is built into the engine.

Anchored in: [capacity-governance.service.ts:129](zephix-backend/src/modules/work-management/services/capacity-governance.service.ts#L129) emission, [governance-evaluation.entity.ts](zephix-backend/src/modules/governance-rules/entities/governance-evaluation.entity.ts) durable rows, [governance-evaluations-retention.md](../governance-evaluations-retention.md) retention contract.

#### Differentiation 3 — Override pathway as a first-class workflow, not a flag

ADR-Engine-5-004 (governance exception override) ships an entire module for the override workflow: request → pending → admin review → application → audit emission. Competitors typically expose override as an admin-permission flag or a "skip validation" checkbox. Zephix's override leaves a paper trail of who needed the override, why, when, and against which rule.

This is the ISO 27001 A.5.3 alternative-compliance pattern (audit trail as substitute for full segregation in resource-constrained orgs) implemented as architecture, not as a customer-built workaround.

Anchored in: [governance-exceptions module](zephix-backend/src/modules/governance-exceptions/), [governance-exceptions.service.ts:44](zephix-backend/src/modules/governance-exceptions/governance-exceptions.service.ts#L44) audit emission.

#### Differentiation 4 — Architectural enabler for first-class multi-option phase-gate decisions

The current `PhaseGateEvaluatorService` returns `{ canApprove, items, chainState }` — a binary approve/reject shape. The discipline (Section 5.5.1) requires three-option (advance/recycle/kill) and ideally four-option (with explicit hold) decisions. The current shape is the *binary* surface; the architectural substrate that enables a richer decision shape without retrofit is:

- The governance evaluation row ([governance-evaluation.entity.ts](zephix-backend/src/modules/governance-rules/entities/governance-evaluation.entity.ts)) has a `decision` column typed as `EvaluationDecision` enum. Adding RECYCLE / KILL as enum values is additive; existing ALLOW / WARN / BLOCK records are not affected.
- The `EvaluationReason` field is structured (not a string) — recycle and kill decisions can carry their own structured reasons.
- The audit emission is by `AuditAction.GOVERNANCE_EVALUATE` regardless of decision shape — analytics need not change.

So the differentiation positioning is: *the architecture supports first-class multi-option gate decisions with additive change; Zephix can ship them when the product surface needs them.* This is not a shipped feature; it is a shipped architectural enabler that is grounded in current code (ADR-Engine-5-001 through ADR-Engine-5-004 jointly).

Future-work item tracked in Section 5.6.

#### Differentiation 5 — Architectural enabler for stage-gate funding release

Stage-gate decisions linking to staged funding release is a discipline requirement (Section 5.5.1) and a positioning claim. Currently shipped: gate evaluation, exception override, audit emission. Currently NOT shipped: a finance/budget integration that releases the next phase's allocation when a gate decision advances.

The architectural enabler is real: F-A audit emission is the persistence-of-record mechanism for "this gate advanced at time T, by actor A, with reason R." A future Engine 8 (Budgets/EVM) integration consumes that emission and triggers the staged release. Engine 5's emission is the substrate; the integration is future Engine 8 work documented in [Engine 8 doc](engine-8-budgets-evm.md).

Differentiation positioning: *the architectural foundation for stage-gate-to-funding release exists in audit emission discipline; the surface integration is future.* No fictional shipped feature claimed.

#### Differentiation 6 — Architectural enabler for benefits-realization tracking beyond closure

Discipline requirement: governance state retained past project closure for the benefits-realization review (typically 3-12 months post-close). Currently shipped: durable governance evaluation rows + retention policy ([governance-evaluations-retention.md](../governance-evaluations-retention.md)) + audit table that does not delete on project closure. Currently NOT shipped: a UI / reporting surface for the BR review.

The substrate is real and shipped; the surface is future Engine 6 (Dashboards) work. Differentiation positioning: *Zephix's audit retention preserves the basis for benefits-realization review; competitors that delete project-scoped state at closure cannot retroactively support BR.*

#### Differentiation 7 — Per-tenant rule-set composition, not built-in compliance pack

The 5-tier scope cascade (ADR-Engine-5-001) lets each customer compose their own rule sets at ORG / WORKSPACE / PROJECT scope. Zephix ships SYSTEM rule packs (the 7 rules at OFF default) but does not impose them. A FedRAMP customer composes one rule set; a HIPAA customer composes a different one; both run on the same engine without forks.

Anchored in: [governance-rules-admin.service.ts](zephix-backend/src/modules/governance-rules/services/governance-rules-admin.service.ts) admin CRUD on rule sets, [default-rule-seeds.ts](zephix-backend/src/modules/governance-rules/engine/default-rule-seeds.ts) showing OFF default.

### Section 5.5 summary

The differentiation is structural: governance as a first-class engine (not a workflow attribute), advisory mode with forensic emission, override as first-class workflow, multi-option decision shape as additive enabler (not yet shipped surface), stage-gate-to-funding-release substrate (not yet shipped integration), benefits-realization retention substrate (not yet shipped surface), per-tenant composition over built-in pack. Each differentiation either points to a shipped artifact or honestly labels a shipped enabler with a clearly future surface.

---

## 5.6 Technical Debt + Future Work

### Debt-Engine-5-001 — SYSTEM rule pack completion

**State.** [`default-rule-seeds.ts`](zephix-backend/src/modules/governance-rules/engine/default-rule-seeds.ts) ships 3 packs with 7 rules. The dispatch document referenced "9 SYSTEM rules"; the gap is two unimplemented rules — most likely additional Phase Gate or Change Request rules.

**Risk.** Low. Customers opt into rule packs; the inventory is honest about what's available.

**Resolution path.** Either complete the planned 9-rule set or update the dispatch reference to the actual 7. Tracked as a doc/code reconciliation item.

### Debt-Engine-5-002 — `complexity_mode` consumer wiring (per AD-026)

**State.** Workspace `complexity_mode` enum is provisioned; Engine 5 does not yet read it to select default `EnforcementMode`.

**Risk.** None present-day; column has a default of `'simple'` and Engine 5 currently behaves identically across modes.

**Resolution path.** Add a default-mode lookup in `GovernanceRuleResolverService` keyed on the workspace's `complexity_mode`. Surface elaborated in [F-D doc Section F-D.6](../foundations/f-d-capability-registry.md).

### Debt-Engine-5-003 — Capacity governance unification with rule engine

**State.** Per ADR-Engine-5-005, capacity is a sibling service. A `RELATED_COUNT_LTE` `ConditionType` would let it move into the rule engine and inherit the resolver, the audit row, and the override pathway.

**Risk.** Low. Both paths emit `GOVERNANCE_EVALUATE`; the duplication is ergonomic, not forensic.

**Resolution path.** Add `RELATED_COUNT_LTE` to the condition-evaluators with a query-budget guard.

### Debt-Engine-5-004 — Multi-option phase-gate decision surface

**State.** The architectural enabler is shipped (Section 5.5.3 Differentiation 4). The product surface — exposing RECYCLE and KILL as first-class gate decisions — is not. `PhaseGateEvaluatorService` returns binary `canApprove`.

**Risk.** Differentiation positioning depends on closing this. Currently honestly labeled as enabler-only.

**Resolution path.** Extend `EvaluationDecision` enum with RECYCLE / KILL values; extend `PhaseGateEvaluatorService` return shape; add Engine 6 dashboard surface for decision distribution. Coordinate with product to confirm the decision shape (3-option vs 4-option) before code.

### Debt-Engine-5-005 — Stage-gate-to-funding-release integration

**State.** Audit emission is the substrate; Engine 8 (Budgets/EVM) integration is the future surface.

**Risk.** Differentiation positioning depends on closing this. Currently honestly labeled as substrate-only.

**Resolution path.** Engine 8 work item — consume `GOVERNANCE_EVALUATE` + gate-decision metadata to trigger phase-budget release. See [Engine 8 doc](engine-8-budgets-evm.md) Section 8.6.

### Debt-Engine-5-006 — Benefits-realization review surface

**State.** Audit retention preserves data; Engine 6 dashboard surface is the future work.

**Resolution path.** Engine 6 work item — surface benefits-realization review dashboard fed from `governance_evaluations` + project-closure events past closure date.

### Debt-Engine-5-007 — Test coverage for `EnforcementMode.ADMIN_OVERRIDE`

**State.** Spec coverage exists for OFF/WARN/BLOCK paths but ADMIN_OVERRIDE has limited explicit coverage in `governance-rule-engine.service.spec.ts`.

**Risk.** Medium. ADMIN_OVERRIDE depends on the governance-exceptions module; un-covered code path on a destructive flow.

**Resolution path.** Author dedicated specs for the override pathway when next touching the rule engine.

### Architectural debt summary

| ID | Severity | Owner stream | Surface elaborated |
|---|---|---|---|
| Debt-Engine-5-001 | Low | Engine 5 | This doc Section 5.6 |
| Debt-Engine-5-002 | Low | Engine 5 → F-D | [F-D doc F-D.6](../foundations/f-d-capability-registry.md) |
| Debt-Engine-5-003 | Low | Engine 5 | This doc Section 5.6 |
| Debt-Engine-5-004 | Medium | Engine 5 + Engine 6 | This doc Section 5.6 + Engine 6 dispatch |
| Debt-Engine-5-005 | Medium | Engine 5 + Engine 8 | [Engine 8 doc](engine-8-budgets-evm.md) Section 8.6 |
| Debt-Engine-5-006 | Low | Engine 5 + Engine 6 | Engine 6 dispatch |
| Debt-Engine-5-007 | Medium | Engine 5 | Future spec dispatch |

---

## 5.7 Architecture Decision Record History

### ADRs originating in this document

| ADR | Title | Status | Anchor PR/artifact |
|---|---|---|---|
| ADR-Engine-5-001 | Five-Tier Scope Cascade | Accepted | Phase 2A foundation |
| ADR-Engine-5-002 | Four-Tier Enforcement Mode | Accepted | Phase 2A foundation |
| ADR-Engine-5-003 | Advisory Governance Philosophy (WARN canonical) | Accepted | [phase2a-authority-hardening-proof.md](../phase2a-authority-hardening-proof.md) |
| ADR-Engine-5-004 | Governance Exception as Override Pathway | Accepted | governance-exceptions module landed |
| ADR-Engine-5-005 | Capacity Governance as Sibling Service | Accepted | Phase 2A capacity governance closure |
| ADR-Engine-5-006 | Workspace `complexity_mode` Substrate (per AD-026) | Accepted (substrate); consumer wiring deferred | [migration 18000000000080](zephix-backend/src/migrations/18000000000080-AddComplexityModeToWorkspaces.ts) |

### Cross-references to existing architectural artifacts

| Document | Relationship to Engine 5 |
|---|---|
| [phase2a-authority-hardening-plan.md](../phase2a-authority-hardening-plan.md), [phase2a-authority-hardening-proof.md](../phase2a-authority-hardening-proof.md) | Phase 2A capacity governance: empirical anchor for ADR-Engine-5-003 and ADR-Engine-5-005. |
| [phase2e-capacity-proof.md](../phase2e-capacity-proof.md) | Capacity governance proof artifact. |
| [governance-evaluations-retention.md](../governance-evaluations-retention.md) | Retention policy for `governance_evaluations` table; preserves the basis for Differentiation 6 (benefits-realization). |
| [phase3b-audit-proof.md](../phase3b-audit-proof.md) | Audit trail proof; documents the F-A discipline that Engine 5 follows. |
| [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](../AD-027-patch3-critical-path-rescoping.md) | AD-027 critical-path enumeration; governance-rules controllers and governance-exceptions controllers are within the AD-027 scope. |
| [AD-029-template-module-unification.md](../AD-029-template-module-unification.md) | Template module unification; intersects with `governance-template.service.ts` and the `TEMPLATE`-scoped rule sets. |
| [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md) | Workspace module activation; the `complexity_mode` column landed via this AD. |
| [feedback_template_scope_architecture](../../../.claude/projects/-Users-malikadeel-Downloads-ZephixApp/memory/feedback_template_scope_architecture.md) | Three-tier template scope rule (SYSTEM / ORG / WORKSPACE) — Engine 5's `TEMPLATE`-scoped rule sets respect this. |
| [Engine 2 doc](engine-2-tenancy.md) | Tenant context that Engine 5 consumes. |
| [F-A doc](../foundations/f-a-audit-trail.md) | Audit-trail emission patterns; Engine 5 is the canonical positive example. |
| [F-D doc](../foundations/f-d-capability-registry.md) | `complexity_mode` substrate; Engine 5 is the most likely first consumer (Debt-Engine-5-002). |
| [Engine 8 doc](engine-8-budgets-evm.md) | Stage-gate-to-funding-release integration territory (Debt-Engine-5-005). |

### What this document is *not*

- **Not** a re-statement of the rule-set CRUD admin surface — see `governance-rules-admin.service.ts`.
- **Not** a re-statement of the gate-approval-chain UX — that's an Engine 6 / front-end concern.
- **Not** the catalog of every governance evaluation that has ever fired — see [governance-evaluations-retention.md](../governance-evaluations-retention.md) for the retention contract.

### Cross-document navigation

- Sibling engine docs: [Engine 2 (Tenancy)](engine-2-tenancy.md), [Engine 7 (Capacity)](engine-7-capacity.md), [Engine 8 (Budgets/EVM)](engine-8-budgets-evm.md)
- Foundation docs: [F-A (Audit)](../foundations/f-a-audit-trail.md), [F-B (Notifications)](../foundations/f-b-notifications.md), [F-C (Integrations)](../foundations/f-c-integrations.md), [F-D (Capability Registry)](../foundations/f-d-capability-registry.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Architect state: [Architect-side Carries Inventory](../architect-state/architect-side-carries.md)

---

**End of Engine 5 — Governance & Phase Gates architectural document.**
