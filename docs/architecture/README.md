# Zephix Architecture Documentation

This folder contains canonical architecture documentation for the Zephix platform.

**Phase E1 status (2026-05-07)**: Frontend + backend documentation complete. This README is the navigation hub for engine architecture docs, foundation docs, security analysis, and Phase E2 transition.

---

## Phase E1 Documentation Inventory

### Engine architecture docs

Engine docs live in [engines/](engines/). Each follows the 7-section template (Purpose & Scope / ADRs / Current Implementation State / Integration Patterns / Practitioner Discipline + Competitive Positioning / Technical Debt + Future Work / ADR History).

| Engine | Status | Doc | Origin |
|---|---|---|---|
| Engine 1 (RBAC) | Documented | `engines/engine-1-rbac.md` | PR #270 + #271 reframe (frontend dispatch) |
| Engine 2 (Tenancy & Workspaces) | Documented | [engines/engine-2-tenancy.md](engines/engine-2-tenancy.md) | WS-DOC-BE-ENGINES Commit 1 |
| Engine 5 (Governance & Phase Gates) | Documented | [engines/engine-5-governance.md](engines/engine-5-governance.md) | WS-DOC-BE-ENGINES Commit 2 |
| Engine 6 (Dashboards & KPIs) | Documented | `engines/engine-6-dashboards-kpis.md` | PR #270 + #271 reframe |
| Engine 7 (Resources & Capacity) | Documented | [engines/engine-7-capacity.md](engines/engine-7-capacity.md) | WS-DOC-BE-ENGINES Commit 3 |
| Engine 8 (Budgets & EVM) | Documented | [engines/engine-8-budgets-evm.md](engines/engine-8-budgets-evm.md) | WS-DOC-BE-ENGINES Commit 4 |

### Foundation docs

Foundation docs live in [foundations/](foundations/). Same 7-section template.

| Foundation | Status | Doc | Origin |
|---|---|---|---|
| F-A (Audit Trail) | Documented + gap-explicit | [foundations/f-a-audit-trail.md](foundations/f-a-audit-trail.md) | WS-DOC-BE-ENGINES Commit 5 |
| F-B (Notifications) | Documented | [foundations/f-b-notifications.md](foundations/f-b-notifications.md) | WS-DOC-BE-ENGINES Commit 6 (bundled) |
| F-C (Integrations) | Documented | [foundations/f-c-integrations.md](foundations/f-c-integrations.md) | WS-DOC-BE-ENGINES Commit 6 (bundled) |
| F-D (Capability Registry & Feature Flags) | Documented (distributed substrate) | [foundations/f-d-capability-registry.md](foundations/f-d-capability-registry.md) | WS-DOC-BE-ENGINES Commit 7 |
| F-E (Admin Console) | Documented | `foundations/f-e-admin-console.md` | PR #270 + #271 reframe |

### Security analysis

| Document | Status | Origin |
|---|---|---|
| [STRIDE Threat Model](security/threat-model-stride.md) | Documented | WS-DOC-BE-ENGINES Commit 8 |

### Architect state

| Document | Purpose |
|---|---|
| [architect-state/architect-side-carries.md](architect-state/architect-side-carries.md) | Synthesis annex: cross-document Debt + FW + process improvements + Phase E2 transition roadmap |

### Existing AD / PDR / V21 / RBAC artifacts (cross-referenced throughout Phase E1)

The Phase E1 docs synthesize from + cross-reference the following existing artifacts (do not duplicate):

- AD-027 — [AD-027_LOCKED.md](AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](AD-027-patch3-critical-path-rescoping.md): Authorization-decision audit; controller route enumeration
- AD-028 — [AD-028-frontend-work-management-unification.md](AD-028-frontend-work-management-unification.md): Frontend unification
- AD-029 — [AD-029-template-module-unification.md](AD-029-template-module-unification.md): Template module unification
- AD-030 — [AD-030-workspace-module-activation.md](AD-030-workspace-module-activation.md): Workspace module activation flag staging
- RBAC architecture — [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md), [RBAC_ROLE_SYSTEM_V1.md](RBAC_ROLE_SYSTEM_V1.md), [RBAC_ROLE_SYSTEM_V2_CLEANUP.md](RBAC_ROLE_SYSTEM_V2_CLEANUP.md)
- PDR — [PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md](PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md): Tenancy assurance lane
- V21 reconciliation — [V21_RECONCILIATION_2026-05-04.md](V21_RECONCILIATION_2026-05-04.md), [V21_CURRENT_STATE_AUDIT.md](V21_CURRENT_STATE_AUDIT.md)
- Governance retention — [governance-evaluations-retention.md](governance-evaluations-retention.md)
- Phase 2A authority hardening — [phase2a-authority-hardening-plan.md](phase2a-authority-hardening-plan.md), [phase2a-authority-hardening-proof.md](phase2a-authority-hardening-proof.md)
- Phase 2E capacity — [phase2e-capacity-proof.md](phase2e-capacity-proof.md)
- Phase 3B audit — [phase3b-audit-proof.md](phase3b-audit-proof.md)

---

## Naming Conventions

Phase E1 docs use two prefix conventions for technical-debt + future-work items:

### `Debt-Engine-N-XXX` / `Debt-F-X-XXX`

Current architectural problems requiring repair. Implies: shipped state has a defect that should be fixed.

Examples: `Debt-Engine-2-001` (registry vs canonical helper divergence), `Debt-F-A-001` through `Debt-F-A-006` (forensic emission gaps).

### `FW-Engine-N-XXX` / `FW-F-X-XXX` / `FW-STRIDE-XXX`

Forward-roadmap items where shipped substrate enables a future surface. Implies: architecture is ready; product surface is not yet shipped.

Examples: `FW-Engine-7-002` (sustainable-pace UX-level default), `FW-F-A-001` (`WORKSPACE_OWNER_CHANGED` constant addition), `FW-STRIDE-001` (global rate limiter).

### Engine 5 special case (semantic mapping)

Engine 5 doc was authored before the architect's Gate 4 decision on `Debt-` vs `FW-` naming convention. Engine 5's `Debt-Engine-5-004 / 005 / 006` are by content forward-roadmap items.

| Engine 5 doc identifier | Semantic equivalent under current convention |
|---|---|
| `Debt-Engine-5-004` (multi-option phase-gate decision surface) | `FW-Engine-5-004` |
| `Debt-Engine-5-005` (stage-gate-to-funding-release integration) | `FW-Engine-5-005` |
| `Debt-Engine-5-006` (benefits-realization review surface) | `FW-Engine-5-006` |

Engine 5 doc retains its identifiers (no retroactive edit per architect Gate 4 decision); cross-references in other docs and this README treat them as FW semantically.

---

## Wording-Precision Notes

### F-A.6 single-file remediation scope clarification

[F-A doc Section F-A.6](foundations/f-a-audit-trail.md#f-a6-technical-debt--future-work--compliance-escalation) implies "single-file scope (`workspace-members.service.ts`) moves Zephix from partial to full compliance" — this is **accurate for Gap-F-A-1 through Gap-F-A-6 only**.

| Gap | Remediation surface |
|---|---|
| Gap-F-A-1 through Gap-F-A-6 | **Single-file scope**: `workspace-members.service.ts` |
| Gap-F-A-7 | Dashboard service (separate file) |
| Gap-F-A-8 | Template-center service (separate file) |

This clarification is also documented in [STRIDE Section 9.5.3](security/threat-model-stride.md#953-repudiation--primary-red-severity-territory) and [architect-side-carries.md Section 4.1](architect-state/architect-side-carries.md#41-f-a-section-f-a6-single-file-remediation-scope-resolved-in-stride).

---

## Cross-Engine Architectural Substrate Map

Items documented across multiple docs with consistent identifiers — enables Phase E2 coordination dispatches without re-discovery.

### `complexity_mode` (4-doc coordination, per AD-026 migration `18000000000080`)

The workspace-level capability tier (`SIMPLE` / `STANDARD` / `ADVANCED`) is documented across:

- [Engine 2 doc Debt-Engine-2-004](engines/engine-2-tenancy.md#debt-engine-2-004--complexity_mode-substrate-positioning) — substrate positioning at Engine 2 ↔ F-D boundary
- [Engine 5 doc Debt-Engine-5-002](engines/engine-5-governance.md#debt-engine-5-002--complexity_mode-consumer-wiring-per-ad-026) — consumer wiring for governance defaults
- [Engine 7 doc FW-Engine-7-005](engines/engine-7-capacity.md#fw-engine-7-005--workspace-level-capacity-defaults-via-complexity_mode) — capacity threshold defaults
- [F-D doc ADR-F-D-002 + Debt-F-D-003 + FW-F-D-004](foundations/f-d-capability-registry.md#adr-f-d-002--complexity_mode-as-tenant-scoped-capability-primitive-per-ad-026) — foundation-level position

Phase E2 consumer-wiring dispatch already has dependency map documented.

### F-B ↔ F-C Slack/Teams (bidirectional foundation dependency)

| Channel | F-B side | F-C side |
|---|---|---|
| Slack | [FW-F-B-003](foundations/f-b-notifications.md#fw-f-b-003--slack-channel-implementation) | [FW-F-C-005](foundations/f-c-integrations.md#fw-f-c-005--slack-integration-for-f-b-fw-f-b-003-dependency) |
| Teams | [FW-F-B-004](foundations/f-b-notifications.md#fw-f-b-004--teams-channel-implementation) | [FW-F-C-006](foundations/f-c-integrations.md#fw-f-c-006--microsoft-teams-integration-for-f-b-fw-f-b-004-dependency) |

When Phase E2 plans Slack/Teams work, both sides reference each other.

### F-A audit emission across destructive operations

Cross-references between F-A gap inventory and engine docs' destructive-operation Debt items:

| F-A Gap | Engine cross-ref |
|---|---|
| [Gap-F-A-1](foundations/f-a-audit-trail.md) (workspace ownership transfer) | [Engine 2 Debt-Engine-2-002](engines/engine-2-tenancy.md#debt-engine-2-002--f-a-success-case-audit-emission-on-destructive-engine-2-mutations) |
| Gap-F-A-2 through 6 (workspace member operations) | F-A bundles in single-file scope |
| Gap-F-A-7 (dashboard publish) | Dashboard service (Engine 6 frontend doc territory) |
| Gap-F-A-8 (template publish) | Template-center service |

### Decision C contract (4-layer enforcement)

Documented in [Engine 2 ADR-Engine-2-001](engines/engine-2-tenancy.md#adr-engine-2-001--decision-c-http-contract-for-missing-tenant-context) with cross-references to [F-A ADR-F-A-005](foundations/f-a-audit-trail.md#adr-f-a-005--decision-c-contract-integration-via-guard-audit-filter--interceptor) and [F-C ADR-F-C-005](foundations/f-c-integrations.md#adr-f-c-005--decision-c-contract-closure-across-6-sites-pr-264). Defense-in-depth across:

1. Frontend transport (`authContextBridge.ts`)
2. Backend interceptor (`tenant-context.interceptor.ts`)
3. Backend service (`assertOrganizationId()`)
4. Backend persistence (`TenantAwareRepository` + guardrail subscriber)

### Stage-gate-to-funding-release (cross-engine future surface)

| Engine | Item | Treatment |
|---|---|---|
| [Engine 5 Debt-Engine-5-005](engines/engine-5-governance.md#debt-engine-5-005--stage-gate-to-funding-release-integration) | Audit emission substrate shipped | Substrate |
| [Engine 8 FW-Engine-8-003](engines/engine-8-budgets-evm.md#fw-engine-8-003--stage-gate-to-funding-release-integration) | Engine 8 listener for phase-gate decisions | Future surface |

---

## Phase E1 → Phase E2 Transition Roadmap

### Recommended Phase E2 Priority Sequence

Per [architect-side-carries.md Section 2.1](architect-state/architect-side-carries.md#21-recommended-phase-e2-priority-sequence) + [STRIDE Section 9.6](security/threat-model-stride.md#96-mitigations--improvement-plan):

#### Priority 1 (Red severity — close before SOC 2 audit prep)

1. **F-A audit emission completion (FW-STRIDE-002)** — closes [Gap-F-A-1 through Gap-F-A-6](foundations/f-a-audit-trail.md#gap-inventory--destructive-operations-with-analytics-emission-but-no-forensic-emission) in single file. Adds `WORKSPACE_OWNER_CHANGED` to `AuditAction` enum. Single-PR scope; ~1-3 hours estimate. **Unlocks SOC 2 CC7.2 + ISO 27001 A.5.3 + A.12.4.1 readiness path.**
2. Gap-F-A-7 (dashboard publish forensic emission) — separate scope.
3. Gap-F-A-8 (template publish forensic emission) — separate scope.

#### Priority 2 (Yellow severity — close opportunistically)

4. **Theme C Phase 3** — Engine 8 controller migrations (Debt-Engine-8-001/002/003) + Engine 2 Debt-005.
5. **Global rate limiter (FW-STRIDE-001)** — DoS amplification mitigation on authenticated mutation endpoints.
6. **AuditService strict semantics for destructive ops (Debt-F-A-009 + FW-F-A-003)** — bundles with Priority 1.
7. **KMS envelope encryption (FW-F-C-001)** — F-C credential rotation upgrade.
8. **F-D admin observability endpoint (FW-F-D-003)** — closes Lesson #34 staleness pattern structurally.

#### Priority 3 (Cross-cutting)

9. **`complexity_mode` consumer wiring** — coordinated dispatch (Engine 5 + 7 + F-B per substrate map).
10. **Compliance posture document** for SOC 2 readiness — synthesizes per-engine compliance mappings.

---

## Lesson Catalog Status

Phase E1 backend portion captured these lessons; the architect tracks the exhaustive Lesson #1-#46 list. See [architect-side-carries.md Section 3](architect-state/architect-side-carries.md#3-lesson-catalog-status) for full status.

### Canonical (architecturally codified or operationally locked)

- **#34** — Live-infrastructure probe before trusting documented state. Codified as [F-D ADR-F-D-005](foundations/f-d-capability-registry.md#adr-f-d-005--live-infrastructure-probe-discipline-lesson-34-application) + structural fix FW-F-D-003.
- **#35** — Adversarial cross-check discipline at Gate reviews.
- **#37** — Cross-stream parallelism requires worktree isolation. Promoted from provisional after HALT-DOC-BE-7. Active throughout Capabilities 2-9 via `../ZephixApp-be-docs` worktree.
- **#41** — Adversarial Gate 4 reviews with mandatory content spot-checks.
- **#43** — Architect dispatch differentiation specifications must be verified against shipped code BEFORE issuing dispatch.

### Provisional (path to canonical identified)

- **#44** — Compliance posture documentation 3-layer pattern.
- **#45** — Session-learned lessons mature through 3 stages (provisional → canonical → architectural codification + structural fix).
- **#46** — Cross-engine threat modeling reveals security gaps individual engine documentation misses; STRIDE consolidation as documentation-phase capstone.

---

## Pilot Operations Package (historical — preserved)

The following pilot-operations docs were authored prior to Phase E1 documentation work and are preserved for historical reference. They are NOT part of Phase E1 architecture inventory.

- **../guides/PILOT_WEEK3_RUNBOOK.md** — Daily controlled-pilot execution contract and stop conditions
- **../guides/PILOT_SUCCESS_CRITERIA.md** — KPI thresholds and PASS/WARN/FAIL decision rules
- **../guides/PILOT_DAILY_MONITORING_CHECKLIST.md** — Morning/live/evening pilot checks
- **../guides/PILOT_ISSUE_TRIAGE_MODEL.md** — Severity, SLA, and escalation model for pilot incidents
- **proofs/pilot/WEEK3_PILOT_EXECUTION_LOG.md** — Append-only pilot evidence ledger

---

## Guidelines for Updating Phase E1 Docs

- **Engine + foundation docs follow the 7-section template.** Adding new sections requires architect approval to avoid template drift.
- **ADRs are append-only.** Decisions made retrospectively get a new ADR identifier; superseded ADRs are marked Superseded with link to the replacement.
- **File:line evidence is required** for current-implementation-state claims. "Shipped" without anchor is incomplete.
- **Cross-document carries propagate.** When updating one doc, check whether cross-references in other docs need updating.
- **Anti-marketing discipline holds.** No claim of "comprehensive coverage" without anchor; honest classification of gaps; FW vs Debt naming convention enforced.
- **Adversarial cross-check before commit.** Mitigation 2 (branch verification) + verify shipped state vs claimed state.

---

## Cross-document navigation summary

- **Engine docs**: [Engine 2](engines/engine-2-tenancy.md) · [Engine 5](engines/engine-5-governance.md) · [Engine 7](engines/engine-7-capacity.md) · [Engine 8](engines/engine-8-budgets-evm.md) (Engine 1 + 6 in companion frontend docs)
- **Foundations**: [F-A](foundations/f-a-audit-trail.md) · [F-B](foundations/f-b-notifications.md) · [F-C](foundations/f-c-integrations.md) · [F-D](foundations/f-d-capability-registry.md) (F-E in companion frontend docs)
- **Security**: [STRIDE Threat Model](security/threat-model-stride.md)
- **Architect state**: [architect-side-carries.md](architect-state/architect-side-carries.md)

---

**End of Phase E1 architecture documentation README.**
