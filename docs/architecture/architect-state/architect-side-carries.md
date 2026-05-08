# Architect-Side Carries Inventory

**Status**: Phase E1 backend portion synthesis (Capability 9, FINAL of WS-DOC-BE-ENGINES)
**HEAD at authoring**: `8c6f9925` on `docs/engines-be-evaluation-cycle` (worktree at `../ZephixApp-be-docs`)
**Scope**: Cross-document carries surfaced across Engines 2 / 5 / 7 / 8 + Foundations F-A / F-B / F-C / F-D + STRIDE threat model

This document is the **synthesis annex** for Phase E1 backend documentation work. It consolidates Debt / Future-Work / process-improvement / strategic-question items that surfaced across the 8 prior commits, with cross-references to the canonical doc that elaborates each.

**This is not the architect's exhaustive PO question backlog.** The architect tracks an exhaustive strategic-question list (referenced as 46+ items at the close of this session). This document captures the architecture-side carries observable in the doc inventory.

---

## 1. Carries by Category

### 1.1 Architectural Debt (current problems requiring repair)

| ID | Description | Source doc | Severity | Resolution scope |
|---|---|---|---|---|
| Debt-Engine-2-001 | `WorkspacePermissionService` registry vs canonical helper divergence on ADMIN bypass for `change_workspace_owner` | [Engine 2 doc](../engines/engine-2-tenancy.md#debt-engine-2-001--workspacepermissionservice-registry-reconciliation) | Medium | Remove registry entry; canonical helper is single source |
| Debt-Engine-2-002 | F-A success-case audit emission gap on workspace ownership transfer (= Gap-F-A-1) | [Engine 2 doc](../engines/engine-2-tenancy.md#debt-engine-2-002--f-a-success-case-audit-emission-on-destructive-engine-2-mutations) | High (compliance) | Single-file scope: workspace-members.service.ts |
| Debt-Engine-2-003 | Two `PlatformRole` definitions (loose-typed `string` bridge) | [Engine 2 doc](../engines/engine-2-tenancy.md#debt-engine-2-003--two-platformrole-definitions) | Low | Theme C Phase 3 bundle |
| Debt-Engine-2-004 | `complexity_mode` substrate provisioned, no consumers | [Engine 2 doc](../engines/engine-2-tenancy.md#debt-engine-2-004--complexity_mode-substrate-positioning) | Low present-day | Engine 5 / 7 / F-B consumer wiring |
| Debt-Engine-2-005 | Theme C Phase 3 (consumer migration) deferred | [Engine 2 doc](../engines/engine-2-tenancy.md#debt-engine-2-005--theme-c-phase-3-consumer-migration) | Low | Future dispatch |
| Debt-Engine-5-001 | SYSTEM rule pack completion (3 packs / 7 rules; dispatch said 9) | [Engine 5 doc](../engines/engine-5-governance.md#debt-engine-5-001--system-rule-pack-completion-3-packs-7-rules--planned-9) | Low | Either ship 2 more rules or update dispatch reference |
| Debt-Engine-5-005 | `EnforcementMode.ADMIN_OVERRIDE` test coverage gap | [Engine 5 doc](../engines/engine-5-governance.md#debt-engine-5-005--test-coverage-for-enforcementmodeadmin_override) | Medium | Future spec dispatch |
| Debt-Engine-7-001 | `ResourceCalculationService.calculateResourceImpact()` declared dead since 2026-05-05 | [Engine 7 doc](../engines/engine-7-capacity.md#debt-engine-7-001--resourcecalculationservicecalculateresourceimpact-declared-dead) | Low | TASK-ENTITY-DRIFT-EXECUTION-DISPATCH |
| Debt-Engine-7-002 | Resources-module-local `AuditLog` parallel to platform `AuditEvent` | [Engine 7 doc](../engines/engine-7-capacity.md#debt-engine-7-002--resources-module-local-auditlog-entity-vs-platform-auditservice) | Medium | Migrate to platform AuditService |
| Debt-Engine-8-001 | `ProjectBudgetsController` ad-hoc role mapping (sibling RBAC TODO) | [Engine 8 doc](../engines/engine-8-budgets-evm.md#debt-engine-8-001--projectbudgetscontroller-ad-hoc-role-mapping-sibling-rbac-todo) | Medium | Theme C Phase 3 |
| Debt-Engine-8-002 | EarnedValueController + ScheduleBaselinesController ad-hoc role guards | [Engine 8 doc](../engines/engine-8-budgets-evm.md#debt-engine-8-002--earnedvaluecontroller--schedulebaselinescontroller-ad-hoc-role-guards) | Medium | Theme C Phase 3 |
| Debt-Engine-8-003 | Header-derived `x-workspace-role` is client-supplied (Decision C principle violation) | [Engine 8 doc](../engines/engine-8-budgets-evm.md#debt-engine-8-003--header-derived-x-workspace-role-is-client-supplied) | Medium-High (principle) | Theme C Phase 3 (resolves naturally with helper migration) |
| Debt-F-A-001 through 006 | 6 destructive operations in workspace-members.service.ts lacking forensic emission (Gap-F-A-1 through 6) | [F-A doc](../foundations/f-a-audit-trail.md#architectural-debt--future-work-summary-1) | **HIGH (compliance)** | **Single-file scope** |
| Debt-F-A-007 | Retention service implementation absent | [F-A doc](../foundations/f-a-audit-trail.md#debt-f-a-007--retention-service-implementation-absent) | Medium-term | Implement AuditRetentionService |
| Debt-F-A-008 | Resources-module-local AuditLog vs platform AuditEvent (cross-ref Engine 7 Debt-002) | [F-A doc](../foundations/f-a-audit-trail.md#debt-f-a-008--resources-module-local-auditlog-parallel-to-platform-auditevent) | Medium | Bundle with Engine 7 Debt-002 |
| Debt-F-A-009 | `AuditService.record` non-throwing semantics on destructive ops | [F-A doc](../foundations/f-a-audit-trail.md#debt-f-a-009--auditservicerecord-non-throwing-semantics-on-destructive-operations) | Medium-High | Transactional audit via manager parameter |
| Debt-F-B-001 | Silent dispatch failure has no observable signal beyond log | [F-B doc](../foundations/f-b-notifications.md#debt-f-b-001--silent-dispatch-failure-has-no-observable-signal-beyond-log) | Medium | Add metric emission for dispatch failures |
| Debt-F-C-001 | Business-event audit emission on integration mutations (gap-candidate) | [F-C doc](../foundations/f-c-integrations.md#debt-f-c-001--business-event-audit-emission-on-integration-mutations-gap-candidate) | Medium | Audit-trace probe + F-A pattern application |
| Debt-F-D-001 | Out-of-band feature flag reads bypass the registry | [F-D doc](../foundations/f-d-capability-registry.md#debt-f-d-001--out-of-band-feature-flag-reads-bypass-the-registry) | Medium | Add ZEPHIX_RESOURCE_AI_RISK_SCORING_V1 to registry; FW-F-D-008 lint rule |
| Debt-F-D-002 | `ENABLE_TELEMETRY` dual-source read | [F-D doc](../foundations/f-d-capability-registry.md#debt-f-d-002--enable_telemetry-dual-source-read) | Low | Migrate telemetry.service to ConfigService |
| Debt-F-D-003 | `complexity_mode` has zero active consumers | [F-D doc](../foundations/f-d-capability-registry.md#debt-f-d-003--complexity_mode-has-zero-active-consumers) | Low present, medium reputational | FW-F-D-004 consumer wiring |
| Debt-F-D-004 | No flag observability surface in-platform | [F-D doc](../foundations/f-d-capability-registry.md#debt-f-d-004--no-flag-observability-surface-in-platform) | Medium | FW-F-D-003 admin endpoint |
| Debt-F-D-005 | No flag deprecation policy or lifecycle markers | [F-D doc](../foundations/f-d-capability-registry.md#debt-f-d-005--no-flag-deprecation-policy-or-lifecycle-markers) | Medium-term | FW-F-D-002 lifecycle markers + policy |

**Total debt items: 26.**

### 1.2 Forward-Roadmap Items (substrate shipped; surface future)

Substantial inventory. Key items by source doc:

- **Engine 2**: (none designated FW; debt items absorbed differentiation)
- **Engine 5**: FW spans Differentiations 4-6 (multi-option phase-gate decisions; stage-gate-to-funding integration; benefits-realization beyond closure)
- **Engine 7**: 5 FW items — auto-apply leveling, sustainable-pace UX default, cost-of-delay calculations, RACI structured field, complexity_mode capacity defaults
- **Engine 8**: 6 FW items — management reserve column, control-account WBS rollup, stage-gate-to-funding integration, per-resource cost rates, item-level PV refinement, Engine 7 cost-of-delay integration
- **F-A**: 5 FW items — `WORKSPACE_OWNER_CHANGED` constant, compile-time emission policy, transactional audit, retention service, audit-read auditing
- **F-B**: 8 FW items — preference caching, Guest-tier opt-in, Slack channel, Teams channel, forensic audit on URGENT, queue-backed delivery, per-entity subscription, quiet hours
- **F-C**: 10 FW items — KMS envelope encryption, auto-pause threshold, Linear client, GitHub client, Slack/Teams integrations, multi-secret rotation, webhook timestamp tolerance, OAuth flow, rate-limit-aware client
- **F-D**: 8 FW items — consolidate distributed substrate, flag lifecycle markers, admin observability, complexity_mode wiring, per-tenant overrides, flag-OFF semantics docs, flag mutation audit emission, lint rule
- **STRIDE-originated**: 3 new FW items — global rate limiter, coordinated F-A gap closure, audit-read access auditing

**Total FW items: ~50.**

### 1.3 Cross-Cutting Concerns (Phase E2 candidates)

| Concern | Source | Phase E2 priority signal |
|---|---|---|
| F-A audit emission completion (Gap-F-A-1 through 6) | F-A.6 + STRIDE 9.6 | **HIGH (Red severity, compliance-impairing)** — single-file scope, ~1-3 hours |
| Theme C Phase 3 (consumer migration) | Engine 2 + Engine 8 + RBAC bundle | Yellow → Green when complete; bundles 6+ debt items |
| KMS envelope encryption for credentials | F-C FW-F-C-001 | Yellow; single-key compromise = all credentials |
| Global rate limiter for authenticated mutations | STRIDE FW-STRIDE-001 | Yellow DoS amplification |
| Flag observability surface (admin endpoint) | F-D FW-F-D-003 | Closes Lesson #34 staleness pattern structurally |
| `complexity_mode` consumer wiring | Engine 2 / 5 / 7 / F-D coordinated | Cross-doc dependency map already documented; coordinated dispatch ready |
| F-B Slack + Teams notification channels | F-B FW-F-B-003/004 ↔ F-C FW-F-C-005/006 | Bidirectional cross-foundation dependency |
| Compliance posture document for SOC 2 / ISO 27001 readiness | F-A.6 + STRIDE 9.7 | Audit-prep enablement; combines per-engine compliance mappings |

### 1.4 Process Improvements (operational discipline)

| Improvement | Status | Source |
|---|---|---|
| **Mitigation 2 (branch verification before commit)** | **Operating throughout dispatch** — caught 1 cross-stream collision | HALT-DOC-BE-6 + HALT-DOC-BE-7 |
| **Worktree isolation per stream (Lesson #37 canonical structural fix)** | **Active — all Capability 2-9 commits produced from `../ZephixApp-be-docs` worktree** | HALT-DOC-BE-7 architect authorization |
| **Adversarial Gate 4 reviews with mandatory cross-checks (Lesson #41)** | **Operating** — 8 architect Gate 4 reviews this dispatch with 6-8 cross-references each | Architect review pattern locked |
| **Verify-before-specify in dispatch authoring (Lesson #43)** | **Operating** — discovered after Engine 7 (sustainable-pace + cost-of-delay) and Engine 8 (lightly-touched undersold) findings | Lesson #43 canonical |
| **Live-infrastructure probe before trusting documented state (Lesson #34)** | **Codified architecturally** as ADR-F-D-005 | F-D doc Section F-D.5.1 |
| **Cross-document dependency identifiers** | Operating — `complexity_mode` documented across 4 docs with consistent identifiers | F-D Section F-D.4 + Section 1.5 below |
| **Anti-marketing discipline (declared-but-unimplemented honestly)** | Operating throughout dispatch — F-B Slack/Teams TODO, F-C Linear/GitHub declared-but-unimplemented, Engine 7 sustainable-pace claim, Engine 8 PMBOK budget components partial-shipping | Multiple findings per architect Gate 4 reviews |

### 1.5 Cross-Document Architectural Substrate Map

Items documented across multiple docs with consistent identifiers (enables Phase E2 coordination dispatches):

#### `complexity_mode` (4-doc coordination)

| Doc | Identifier | Treatment |
|---|---|---|
| Engine 2 | Debt-Engine-2-004 | Substrate positioning at boundary |
| Engine 5 | Debt-Engine-5-002 | Consumer wiring per AD-026 |
| Engine 7 | FW-Engine-7-005 | Workspace-level capacity defaults |
| F-D | Debt-F-D-003 + ADR-F-D-002 + FW-F-D-004 | Foundation-level position |

#### F-B ↔ F-C Slack/Teams (bidirectional dependency)

| Pair | F-B Side | F-C Side |
|---|---|---|
| Slack channel | FW-F-B-003 | FW-F-C-005 |
| Teams channel | FW-F-B-004 | FW-F-C-006 |

#### F-A audit emission ↔ Engine 1 / 2 / 5 / 8

| Operation | F-A Gap | Engine cross-ref |
|---|---|---|
| Workspace ownership transfer | Gap-F-A-1 | Engine 2 Debt-Engine-2-002 |
| Workspace member role-change (idempotent) | Gap-F-A-3 | Engine 1 + Engine 2 boundary |
| Budget governance audit | (defended) | Engine 8 ADR-Engine-8-005 (canonical positive example) |
| Capacity governance audit | (defended) | Engine 5 + Engine 7 (canonical positive example) |

#### Decision C contract (4-layer enforcement)

| Layer | Site | Cross-ref |
|---|---|---|
| Frontend transport | authContextBridge.ts | Engine 2 ADR-Engine-2-004 |
| Backend interceptor | tenant-context.interceptor.ts | Engine 2 ADR-Engine-2-001 |
| Backend service | assertOrganizationId() | Engine 2 ADR-Engine-2-001 |
| Backend persistence | TenantAwareRepository + guardrail subscriber | Engine 2 ADR-Engine-2-001 |

#### Stage-gate-to-funding-release (cross-engine future surface)

| Engine | Item | Treatment |
|---|---|---|
| Engine 5 | Debt-Engine-5-005 | Audit emission substrate shipped |
| Engine 8 | FW-Engine-8-003 | Engine 8 listener for phase-gate decisions |
| F-A | (audit emission underlies both) | Forensic record-of-record |

---

## 2. Phase E1 → Phase E2 Transition Roadmap

### 2.1 Recommended Phase E2 Priority Sequence

Based on severity classification + remediation scope analysis from STRIDE Section 9.6:

#### Priority 1 (Red severity — close before SOC 2 audit prep)

1. **F-A audit emission completion (FW-STRIDE-002)** — closes Gap-F-A-1 through Gap-F-A-6 in single file (`workspace-members.service.ts`). Adds `WORKSPACE_OWNER_CHANGED` constant. Estimated: 1-3 hour single-PR scope. Unlocks SOC 2 CC7.2 + ISO 27001 A.5.3 + A.12.4.1 readiness path.
2. **Gap-F-A-7 (dashboard publish forensic emission)** — separate scope (dashboard service).
3. **Gap-F-A-8 (template publish forensic emission)** — separate scope (template-center service).

#### Priority 2 (Yellow severity — close opportunistically)

4. **Theme C Phase 3 — Engine 8 controller migrations** — Debt-Engine-8-001/002/003 + Engine 2 Debt-005. Single thematic dispatch covers ProjectBudgetsController, EarnedValueController, ScheduleBaselinesController.
5. **Global rate limiter (FW-STRIDE-001)** — DoS amplification mitigation on authenticated mutation endpoints.
6. **AuditService strict semantics for destructive ops (Debt-F-A-009 + FW-F-A-003)** — transactional audit via `manager` parameter; bundles with Priority 1 audit-emission work.
7. **KMS envelope encryption (FW-F-C-001)** — F-C credential rotation upgrade.
8. **F-D admin observability endpoint (FW-F-D-003)** — closes Lesson #34 staleness pattern structurally.

#### Priority 3 (Cross-cutting concerns — substrate consolidation)

9. **`complexity_mode` consumer wiring** — coordinated dispatch across Engine 5 / 7 / F-B per substrate map (Section 1.5).
10. **Compliance posture document for SOC 2 readiness** — synthesizes per-engine compliance mappings.

### 2.2 Items NOT Recommended for Phase E2

Items intentionally deferred:

- **Per-tenant flag overrides (FW-F-D-005)** — substrate not yet needed at current scale; revisit when SaaS-tier feature differentiation surfaces as commercial driver.
- **A/B testing framework on top of feature flags** — explicitly out of scope per F-D.1.
- **Cost-of-delay calculations (FW-Engine-7-003)** — significant new feature; defer until customer pull surfaces.
- **Multi-vendor integrations (FW-F-C-003 Linear + FW-F-C-004 GitHub)** — Jira shipping is sufficient for current customer base.

### 2.3 Strategic-Shaped Architecture Questions for Architect / PO

Items the architect surfaced during Gate 4 reviews this dispatch (subset of full backlog; architect tracks 46+ exhaustive list):

| Question | Source | Architect's recommended path |
|---|---|---|
| Should F-A doc be shared externally as part of customer/investor materials, or kept internal? | F-A Gate 4 review | Sanitized version may serve enterprise compliance review |
| Should F-C cryptographic posture become prominent commercial differentiation alongside Engine 8 EVM? | F-B+F-C Gate 4 review | Yes — pair with Engine 8 EVM positioning |
| Should cross-foundation dependency documentation pattern (F-B ↔ F-C bidirectional FW) become standing practice? | F-B+F-C Gate 4 review | Yes — extend to all future cross-engine docs |
| Should Lessons #37 / #41 / #43 follow the Lesson #34 maturation path (process discipline → architectural codification + structural fix)? | F-D Gate 4 review | Yes — has implications for dispatch authoring discipline + Gate 4 review protocol + worktree provisioning standard |
| Should we extract a Cross-Engine Architectural Substrate Map as separate document during README index? | F-D Gate 4 review | **Done in this commit** — Section 1.5 above + README cross-engine map |
| Should STRIDE threat model be (a) internal architecture reference only, (b) sanitized for enterprise prospects, or (c) shared with SOC 2 auditor? | STRIDE Gate 4 review | Sanitization + governance requirements differ; PO decision needed |
| Should Phase E2 begin with F-A audit emission completion, rate limiter, cross-cutting concerns, or compliance posture document? | STRIDE Gate 4 review | Architect recommendation: F-A audit emission completion (Priority 1) |

---

## 3. Lesson Catalog Status

This section captures the lessons surfaced or referenced in Phase E1 backend portion. The architect tracks the exhaustive Lesson #1-#46 list; this captures the lessons whose application is observable in the Phase E1 backend documentation.

### 3.1 Canonical lessons (architecturally codified or operationally locked)

| # | Lesson | Codification |
|---|---|---|
| #34 | Live-infrastructure probe before trusting documented state | **Codified as ADR-F-D-005** + structural fix FW-F-D-003. Demonstrated 3-stage maturation: process discipline → canonical practice → architectural codification + structural fix. |
| #35 | Adversarial cross-check discipline at Gate reviews | Operating throughout dispatch — 8 architect Gate 4 reviews × 6-8 cross-references each |
| #37 | Cross-stream parallelism requires worktree isolation, not just branch isolation | **Promoted from provisional after HALT-DOC-BE-7** (second cross-stream collision in same session). Active throughout Capabilities 2-9 via `../ZephixApp-be-docs` worktree. |
| #41 | Adversarial Gate 4 reviews with mandatory content spot-checks | Operating throughout — 8 reviews this dispatch |
| #43 | Architect dispatch differentiation specifications must be verified against shipped code BEFORE issuing dispatch | **Promoted from provisional** after Engine 7 (sustainable-pace + cost-of-delay) and Engine 8 (lightly-touched undersold) findings demonstrated pattern empirically |

### 3.2 Provisional lessons (path to canonical identified)

| # | Lesson | Maturation path |
|---|---|---|
| #44 | Compliance posture documentation requires three distinct layers (shipped substrate inventory + gap inventory + compliance framework mapping) | Earned canonization on F-A doc; promotion when next compliance-related doc demonstrates pattern |
| #45 | Session-learned lessons should mature through 3 stages (provisional process discipline → canonical operating practice → architectural codification + structural fix) | Path forward: apply pattern to Lessons #37 / #41 / #43 (each currently Stage 2; could mature to Stage 3) |
| #46 | Cross-engine threat modeling reveals security gaps individual engine documentation misses; STRIDE consolidation should be capstone of any documentation phase | Pattern strength: 3 new FW items surfaced in STRIDE that individual docs missed (FW-STRIDE-001 rate limiter, FW-STRIDE-002 coordinated F-A closure, FW-STRIDE-003 audit-read auditing). Promotion when next phase demonstrates STRIDE-as-capstone pattern operating from initial dispatch authoring. |

### 3.3 Architect-tracked lesson backlog

Lessons #1 through #33 + interim lessons not directly visible in this dispatch are tracked architect-side. They include earlier-session discipline findings (HALT-RBAC2-1 false-alarm, dispatch authoring patterns, smoke-key handling, etc.) that inform but do not surface as ADRs in Phase E1 backend documentation.

---

## 4. Wording-Precision Carries (Architect Gate 4)

Items flagged for clarification in subsequent docs without re-opening prior commits:

### 4.1 F-A Section F-A.6 single-file remediation scope (resolved in STRIDE)

**Context.** F-A doc Section F-A.6 implied "single-file scope (workspace-members.service.ts)" closes Gap-F-A-1 through Gap-F-A-8. This is accurate for Gap-F-A-1 through Gap-F-A-6 only.

**Resolution applied (STRIDE Section 9.5.3):**
> "Wording-precision note (per architect Gate 4 carry): Single-file remediation scope applies to Gap-F-A-1 through Gap-F-A-6 only. Gap-F-A-7 (dashboard publish) and Gap-F-A-8 (template publish) require additional remediation surfaces (dashboard service + template-center service) — not single-file."

**Status**: Resolved — STRIDE doc + this carries inventory both clarify the scope. F-A doc not re-opened.

### 4.2 Engine 5 naming convention (Debt → FW semantic mapping)

**Context.** Engine 5 doc was authored before architect's Gate 4 decision on `Debt-Engine-N-XXX` vs `FW-Engine-N-XXX` naming convention. Engine 5's `Debt-Engine-5-004` (multi-option phase-gate decision surface), `Debt-Engine-5-005` (stage-gate-to-funding-release integration), `Debt-Engine-5-006` (benefits-realization review surface) are by content forward-roadmap items that should bear `FW-` prefix per the architect's later naming decision.

**Resolution applied (this carries inventory + README naming convention section):**

Engine 5 doc retained existing `Debt-Engine-5-004/005/006` labels (no retroactive edit). Semantic mapping:

| Engine 5 doc identifier | Semantic equivalent under architect Gate 4 naming convention |
|---|---|
| Debt-Engine-5-004 (multi-option phase-gate decision surface) | FW-Engine-5-004 |
| Debt-Engine-5-005 (stage-gate-to-funding-release integration) | FW-Engine-5-005 |
| Debt-Engine-5-006 (benefits-realization review surface) | FW-Engine-5-006 |

**Status**: Resolved by mapping. Engine 5 doc retains its identifiers; cross-references in other docs treat them as FW semantically. README naming convention section formalizes this.

---

## 5. Open Items at End of Phase E1 Backend Portion

### 5.1 Stream coordination (cross-stream)

| Stream | State at end of Phase E1 backend |
|---|---|
| Stream 1 (Cursor) — Phase E1 frontend | PR #270 + #271 already merged into staging-docs-merge — Engine 1 (RBAC), Engine 6 (Dashboards), F-E (Admin Console) docs landed |
| Stream 3 (Claude Desktop) — Phase E1 backend (this dispatch) | 9 commits ready in `docs/engines-be-evaluation-cycle` worktree; PR ready to open against `staging` |

### 5.2 PR opening sequence (FINAL)

After Capability 9 commit lands clean:

1. Push `docs/engines-be-evaluation-cycle` to origin
2. Open PR via `gh pr create --base staging`
3. PR body synthesizes Phase E1 backend completion + Phase E2 readiness
4. 9 commits in PR

### 5.3 Phase E2 entry conditions

Phase E2 cross-cutting concerns work begins from documented foundation:

- **Compliance posture roadmap clear** — Priority 1 (F-A audit emission completion) closes Red-severity items in single-file scope
- **Cross-engine substrate map operating** — `complexity_mode` consumer wiring + F-B/F-C dependency coordinated upfront
- **Theme C Phase 3** — bundles Engine 2 + Engine 8 + RBAC controller migrations
- **Cryptographic upgrades** — KMS envelope encryption + webhook timestamp tolerance + multi-secret rotation as F-C-themed dispatch

---

## 6. Cross-document navigation

- Engine docs: [Engine 2 (Tenancy)](../engines/engine-2-tenancy.md), [Engine 5 (Governance)](../engines/engine-5-governance.md), [Engine 7 (Capacity)](../engines/engine-7-capacity.md), [Engine 8 (Budgets/EVM)](../engines/engine-8-budgets-evm.md)
- Foundations: [F-A (Audit)](../foundations/f-a-audit-trail.md), [F-B (Notifications)](../foundations/f-b-notifications.md), [F-C (Integrations)](../foundations/f-c-integrations.md), [F-D (Capability Registry)](../foundations/f-d-capability-registry.md)
- Security: [STRIDE Threat Model](../security/threat-model-stride.md)
- Index: [README.md](../README.md)

---

**End of Architect-Side Carries Inventory.**
