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

## 6.5 — Industry Comparison

*Full citations: [research-log.md](../external-research/research-log.md) (accessed **2026-05-07**).*

| Reference domain | Pattern | Zephix alignment | Difference |
|------------------|---------|------------------|------------|
| **Datadog** | Dashboard RBAC, restriction policies (`viewer` / `editor` relations). | Operational dashboards with role-scoped edit vs view mirror Datadog’s split. | Zephix is **application-centric** (projects/work), not infra telemetry. |
| **New Relic** | Dashboard ownership + sharing prerequisites; org/account scoped roles. | Ownership metadata per dashboard is analogous to NR dashboard owner pattern. | Zephix embeds in PM lifecycle vs APM-first UX. |
| **Tableau** | Governance blueprint, row-level security policies. | Aligns with multi-tenant row visibility for KPI drill-down (future hardening). | Zephix KPI v1 is narrower than enterprise BI. |
| **Looker** | Content vs data vs feature permissions; signed embedding; closed multi-tenant embed. | Informs future **embedded** analytics patterns if external BI is iframe/API embedded. | Current Zephix dashboards are first-party React. |
| **Linear / Asana** | Lightweight reporting surfaces inside PM tools. | Same product philosophy: **in-context** metrics vs standalone BI. | Zephix adds governance/template-derived KPI requirements. |

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
