# Engine 6 — Dashboards & KPIs

**Status:** Living architecture note — spans backend KPI domain and frontend dashboard shells.  
**Classification:** Engineering reference — no secrets, credentials, or customer data.  
**Blueprint alignment:** Tier 2 — Engine 6 (Dashboards & KPIs).

---

## 6.1 — Purpose & Scope

Engine 6 delivers **measurable performance signals** (KPI definitions, computed values, rollups) and **consumable dashboards** (layout, widgets, filters) so operators can monitor portfolios, workspaces, and projects without ad hoc spreadsheets.

**Engine 6 does not:**

- Own identity or coarse RBAC (**Engine 1**); dashboard visibility must still respect server-side guards.
- Own tenancy boundaries (**Engine 2**); aggregates must scope by organization/workspace as enforced by APIs.
- Replace full-blown enterprise BI governance (**Tableau/Looker**-class LCNC); Zephix prioritizes **embedded** operational dashboards first.

**Boundaries:**

| Adjacent | Relationship |
|----------|--------------|
| Engine 3 | Work-management entities feed KPI calculators (tasks, schedules). |
| Engine 4 | Templates seed KPI requirements on projects. |
| Engine 7 / 8 | Resource utilization and EVM metrics intersect KPI calculators. |
| Foundation F-D | Feature flags / capability registry may gate dashboard widgets. |

---

## 6.2 — Architectural Decisions (Retrospective ADRs)

### ADR-Engine-6-001 — KPI schema extension without forking Template Center definitions

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive; evidence in repo proofs). |
| **Context** | KPI data originated in **Template Center** (`kpi_definitions`, `project_kpis`, `kpi_values`). Wave 4A required richer definitions for operational analytics without breaking existing template flows. |
| **Decision** | **Extend** `kpi_definitions` (and related shapes) with additive columns; introduce **`zephix-backend/src/modules/kpis/`** as the operational module that maps the unified definition model while Template Center entities remain valid. Documented in [kpi-foundation-scan.md](../proofs/phase5a/wave4a/kpi-foundation-scan.md). |
| **Consequences** | (+) Single logical definition catalog; (−) **two controller surfaces** remain (`modules/kpis/controllers/*` vs `modules/template-center/kpis/*`) — consolidation deferred (**WS-AF-DASHBOARD-CONSOLIDATION**). |

### ADR-Engine-6-002 — KPI calculation via registry + calculators

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive). |
| **Context** | Multiple KPI keys (SPI, CPI, velocity, etc.) need deterministic formulas and test hooks. |
| **Decision** | Keep calculator logic in **`zephix-backend/src/modules/kpis/engine/`** (`kpi-calculators.ts`, `kpi-registry-defaults.ts`, `kpi-packs.ts`) with services orchestrating persistence (`project-kpi-compute.service.ts`, values services). |
| **Consequences** | (+) Testable pure calculators; (−) engineers must register new KPIs in both definition storage and calculator registry consistently. |

### ADR-Engine-6-003 — Dashboard composition on the frontend (feature vs view split)

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive; describes current tree). |
| **Context** | Dashboard UX grew both under **`src/features/dashboards/`** (widgets, hooks, API helpers) and **`src/views/dashboards/`** (page-level shells: Builder, Index, View). |
| **Decision** | Treat **features/dashboards** as component/API library and **views/dashboards** as routed experiences until consolidation lands. |
| **Consequences** | (+) Allows incremental delivery; (−) duplication risk and navigation cognitive load — escalated in §6.6. |

---

## 6.3 — Current Implementation State

### Backend

| Area | Location |
|------|----------|
| Operational KPI module | `zephix-backend/src/modules/kpis/` (module, controllers, services, entities, `engine/`, `__tests__/`) |
| Template Center KPI surface | `zephix-backend/src/modules/template-center/kpis/` (parallel controllers/services/entities) |
| Proof / decision narrative | [proofs/phase5a/wave4a/kpi-foundation-scan.md](../proofs/phase5a/wave4a/kpi-foundation-scan.md) |

**Architectural duplication (explicit):** two KPI HTTP surfaces coexist; callers and tests must target the correct controller namespace. This is **debt**, not intentional long-term pluralism.

### Frontend

| Area | Location |
|------|----------|
| Dashboard feature library | `zephix-frontend/src/features/dashboards/` |
| Routed dashboard views | `zephix-frontend/src/views/dashboards/` |
| Shared switcher / shell pieces | e.g. `zephix-frontend/src/components/dashboards/DashboardSwitcher.tsx` |

---

## 6.4 — Integration Patterns

| Integration | Pattern |
|-------------|---------|
| **E6 ↔ E1** | Dashboard routes and widget actions reuse RBAC helpers; server guards enforce read vs configure-dashboard mutations. |
| **E6 ↔ E2** | Workspace-scoped rollups require validated workspace context on APIs (headers / membership). |
| **E6 ↔ E5** | Health / gate widgets reflect governance state; authoritative approvals remain server-side. |
| **E6 ↔ E7** | Resource utilization widgets consume capacity APIs and KPI calculators where aligned. |
| **E6 ↔ E8** | EVM snapshots feed earned-value KPIs (see earned-value services referenced in wave scans). |

---

## 6.5 — Practitioner discipline, competitive positioning & Zephix differentiation

### 6.5.1 What discipline requires

Program and portfolio practitioners rely on **domain-native** signals—not generic charts labeled in hindsight. Disciplines such as **EVM** (planned value, earned value, actual cost; CPI/SPI; forecast at completion), **resource histograms** that expose overallocation, **RACI-style ownership clarity**, and **benefits / outcome tracking** beyond “tasks closed” are how PMOs defend decisions. Dashboards and KPIs should encode **methodology**, not only aggregate database fields.

**Operational requirement:** distinguish **observability dashboards** (infra, uptime, logs) and **enterprise BI** (open-ended exploration) from **PM-operational** dashboards where definitions, thresholds, and rollups tie to **gates, templates, and workspace scope**.

### 6.5.2 What existing platforms do and don’t do

| Domain | What public documentation emphasizes | Gap vs PM-discipline-native reporting |
|--------|--------------------------------------|--------------------------------------|
| **Datadog** — [RBAC permissions](https://docs.datadoghq.com/account_management/rbac/permissions/), [restriction policies](https://docs.datadoghq.com/api/latest/restriction-policies/) | Fine-grained dashboard **viewer/editor** relations and role bundles for operational telemetry. | Purpose-built for **signals and services**, not SPI/CPI on governed projects or template-required KPIs. |
| **New Relic** — [User permissions](https://docs.newrelic.com/docs/accounts/accounts-billing/new-relic-one-user-management/user-permissions), [dashboard sharing prerequisites](https://docs.newrelic.com/docs/query-your-data/explore-query-data/dashboards/prerequisites-to-share-dashboards-charts/) | Org/account scoped roles; explicit permissions for sharing dashboards externally. | **APM / digital ops** center of gravity—not portfolio EVM or methodology gates. |
| **Tableau** — [Governance blueprint](https://help.tableau.com/current/blueprint/en-gb/bp_governance_in_tableau.htm), [row-level security](https://help.tableau.com/current/online/en-gb/dm_vconn_create_rlspolicy.htm) | Enterprise **content governance** and row-level security policies across workbooks. | BI-first; integration into a **single PM application shell** with workspace tenancy is non-standard. |
| **Looker** — [Access control](https://cloud.google.com/looker/docs/access-control-and-permission-management), [signed embedding](https://cloud.google.com/looker/docs/signed-embedding) | Separates content, data, and feature permissions; embed patterns for multi-tenant SaaS. | Embedded analytics **partner**; Zephix ships **first-party** React dashboards today. |
| **Linear / Asana** — [Linear Docs](https://linear.app/docs), [Asana Reporting](https://www.asana.com/features/reporting) | In-context reporting for delivery work. | **Governance-grade KPI packs** and **template-required metrics** vary by vendor—often lighter than PMO EVM + gate-bound KPI discipline. |

**Pattern:** general analytics stacks excel at **access control to dashboards** and **data governance**; PM tools excel at **workflow**. Neither guarantees **one tenant-scoped KPI definition catalog** wired to **template methodology** and **earned-value mathematics** without bolting on BI.

### 6.5.3 Zephix’s differentiation

| Theme | Concrete mechanics (repo-anchored) |
|-------|-------------------------------------|
| **Discipline-native vs generic abstraction** | Backend **`modules/kpis/engine/`** (`kpi-calculators.ts`, `kpi-registry-defaults.ts`, `kpi-packs.ts`) encodes SPI/CPI, velocity, and related calculator keys—not only passive charts. Template methodology binds KPI requirements (see [engine-4-phase-a-template-inventory.md](../engine-4-phase-a-template-inventory.md)). |
| **Multi-tier vs flattened hierarchy** | Workspace- and project-scoped APIs; Engine **6 ↔ 8** intersection for EVM snapshots feeding KPIs (§6.4). |
| **Defense-in-depth vs single-layer enforcement** | **Engine 1** guards dashboard routes/widgets on the client; **server** remains authoritative for data scope (org/workspace). |
| **Empirical anchoring vs aspirational marketing** | Dual KPI module surfaces documented as **debt** (`modules/kpis` vs `template-center/kpis`); frontend split **`features/dashboards`** vs **`views/dashboards`** tracked in §6.6 — honesty over roadmap vapor. |

**Differentiation in one line:** Zephix pursues **PM-discipline-native KPIs** (registry + calculators + template-required definitions) and **tenant-aware** dashboard composition in-product—while acknowledging **consolidation debt** (**WS-AF-DASHBOARD-CONSOLIDATION**) before matching BI-tool governance breadth.

Supporting URL index and evaluation notes: [research-log.md](../external-research/research-log.md).

---

## 6.6 — Technical Debt & Future Work

| Item | Severity |
|------|----------|
| **WS-AF-DASHBOARD-CONSOLIDATION** | **High** — unify `modules/kpis` vs `template-center/kpis` HTTP/module boundaries; reduce duplicate controllers. |
| **Frontend `features/dashboards` vs `views/dashboards`** | **Medium** — consolidate routing vs widget library boundaries or document module federation rules. |
| **Dashboard RBAC parity tests** | Expand Playwright/Vitest coverage for viewer vs editor scenarios (follow Engine 1 lint patterns where UI compares roles). |
| **Widget registry versioning** | Align `widget-registry.ts` / schemas with capability registry (F-D) for safer rollout. |

---

## 6.7 — ADR History & References

### ADRs (this engine)

- **ADR-Engine-6-001** — KPI schema extension & dual module boundaries (§6.2)  
- **ADR-Engine-6-002** — Calculator registry architecture (§6.2)  
- **ADR-Engine-6-003** — Frontend dashboard folder split (§6.2)  

### Related documents

- [kpi-foundation-scan.md](../proofs/phase5a/wave4a/kpi-foundation-scan.md)  
- [engine-4-phase-a-template-inventory.md](../engine-4-phase-a-template-inventory.md) (KPI template components)  
- [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-028-frontend-work-management-unification.md](../AD-028-frontend-work-management-unification.md), [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md)  
- [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md)  
- [PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md](../PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md)  
- [V21_RECONCILIATION_2026-05-04.md](../V21_RECONCILIATION_2026-05-04.md), [V21_CURRENT_STATE_AUDIT.md](../V21_CURRENT_STATE_AUDIT.md)  
- [governance-evaluations-retention.md](../governance-evaluations-retention.md)  

### Cross-links

- [Engine 1 — RBAC](./engine-1-rbac.md)  
- [F-E — Admin Console](../foundations/f-e-admin-console.md)  
- [ADR index](../decisions/README.md)  
- [External research log](../external-research/research-log.md)  
