# Foundation F-E — Admin Console (Frontend)

**Status:** Living architecture note — customer-facing org/workspace administration UX.  
**Classification:** Engineering reference — no secrets, credentials, or customer data.  
**Blueprint alignment:** Foundation F-E (Admin Console).

---

## F-E.1 — Purpose & Scope

F-E provides **in-product administration**: organization profile, security settings, people & teams, billing hooks, audit visibility (where enabled), and workspace-level permission editors — without exporting operators to a separate “vendor console.”

**F-E does not:**

- Replace **platform operator** tools (internal support dashboards live outside this foundation unless explicitly unified later).
- Be the sole enforcement layer for RBAC (**Engine 1** server guards remain authoritative).
- Expand scope into **Engine 5** rule authoring beyond surfaced UX controls tied to backend contracts.

**Boundaries:**

| Adjacent | Relationship |
|----------|--------------|
| Engine 1 | All visibility/edit affordances align with canonical helpers + ESLint Rule A on administration paths. |
| Engine 2 | Workspace membership editors consume tenancy-safe APIs (`x-workspace-id`, org scope). |
| F-A | Audit log pages display server-backed events; emission completeness is a cross-cutting gap (see §F-E.6). |

---

## F-E.2 — Architectural Decisions (Retrospective ADRs)

### ADR-F-E-001 — Administration UX uses canonical RBAC helpers (Theme D Phase 2)

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive). |
| **Context** | Administration pages mixed legacy string compares with platform/workspace semantics; Batch 6 migrated critical permission tabs. |
| **Decision** | Standardize on **`normalizePlatformRole`**, **`PLATFORM_ROLE`**, and workspace helper hooks for Org/Workspace permission tabs and user administration lists. |
| **Consequences** | (+) Consistent with `/admin` surfaces; (−) remaining files still carry migration debt (§F-E.6). |

### ADR-F-E-002 — ESLint Rule A extended to `features/administration/**`

| Field | Content |
|-------|---------|
| **Status** | Accepted (retroactive; PR #268). |
| **Context** | Plural **`administration`** directory avoided Rule A when only **`features/admin/**` was guarded (Lesson #28). |
| **Decision** | Add **`**/src/features/administration/**/*.{ts,tsx}`** to Rule A file globs with unchanged selectors. |
| **Consequences** | (+) Prevents drift on migrated files; (−) incremental directories still require explicit dispatch to add. |

### ADR-F-E-003 — Administration entry via profile / shell conventions

| Field | Content |
|-------|---------|
| **Status** | Accepted (matches CLAUDE.md operating rules). |
| **Context** | Enterprise shells conflict if administration appears as primary navigation noise. |
| **Decision** | Route administration through **profile menu** / administration layout (`AdministrationLayout.tsx`) rather than advertising as default left-rail IA. |
| **Consequences** | (+) Aligns with “Administration is not Home” discipline; (−) discoverability relies on onboarding/tooltips. |

---

## F-E.3 — Current Implementation State

| Metric | Detail |
|--------|--------|
| **Administration tree** | `zephix-frontend/src/features/administration/` — **40** `.ts` / `.tsx` modules (pages, layout, API client, security tabs, tests). |
| **Phase 2 Batch 6 migrations** | Five files explicitly called out in evaluation docs for canonical helper adoption (users page, org/workspace permission tabs, teams page, audit log page pattern). |
| **Lint coverage** | Rule A includes **`features/administration/**`** (five guarded globs total — see [RBAC-CANONICAL-HELPERS.md](../../../zephix-frontend/src/utils/RBAC-CANONICAL-HELPERS.md)). |
| **API boundary** | `administration.api.ts` centralizes administration HTTP calls; maps list endpoints toward typed DTOs. |

---

## F-E.4 — Integration Patterns

| Integration | Pattern |
|-------------|---------|
| **F-E ↔ Engine 1** | Pages import `@/utils/access` helpers; tests use `rbac-lint-rules` fixtures for stdin paths under `features/administration/**`. |
| **F-E ↔ Engine 2** | Workspace permission tab resolves workspace context before mutating membership or roles. |
| **F-E ↔ Engine 6** | Overview dashboards may deep-link; KPI editing remains outside admin console by default. |
| **F-E ↔ F-A** | Audit log / audit trail pages are read-mostly clients over audit APIs. |

---

## F-E.5 — Industry Comparison

*Citations: [research-log.md](../external-research/research-log.md) (accessed **2026-05-07**).*

| Vendor | Pattern | Zephix alignment | Difference |
|--------|---------|------------------|------------|
| **Linear** | Workspace roles + dedicated admin settings | Strong alignment on workspace-level controls | Linear emphasizes teams/issues first; Zephix emphasizes governed portfolios/projects |
| **Asana** | Org admin console vs workspace split | Validates domain-based org model | Asana markets Admin Console prominently; Zephix keeps IA quieter per product principles |
| **ClickUp** | Hierarchy (Workspace → Space → Folder…) + admin permissions | Shared hierarchical mental model | ClickUp depth is deeper; Zephix focuses PMO methodology containers |
| **Atlassian** | Multiple admin personas | Useful comparator for enterprise buyers | Zephix consolidates personas into fewer UI surfaces intentionally |
| **GitHub** | Org-level administration | Org-wide membership + billing parallels | GitHub repo-centric; Zephix workspace/project-centric |

---

## F-E.6 — Technical Debt & Future Work

| Debt | Notes |
|------|-------|
| **35 / 40 files** | Majority of administration modules were outside the Phase 2 Batch 6 migration set; completing canonical-helper adoption is **Theme D Phase 3** / future lint expansions — see [WS-AF-FE-D-P2-PHASE2-COMPLETION.md](../WS-AF-FE-D-P2-PHASE2-COMPLETION.md). |
| **Import-order / legacy ESLint noise** | Full-tree `eslint` on administration may surface non-Rule-A debt; tracked as hygiene workstream (evaluation cycle acknowledgment). |
| **Audit emission gap** | Role mutations should emit F-A events server-side (Engine 1 debt crosses into F-E UX). |
| **Documentation drift** | Keep this file aligned with `RBAC-CANONICAL-HELPERS.md` when new guarded paths appear. |

---

## F-E.7 — ADR History & References

### ADRs (this foundation)

- **ADR-F-E-001** — Canonical helper adoption (§F-E.2)  
- **ADR-F-E-002** — Rule A coverage extension (§F-E.2)  
- **ADR-F-E-003** — Shell entry conventions (§F-E.2)  

### Related documents

- [RBAC-CANONICAL-HELPERS.md](../../../zephix-frontend/src/utils/RBAC-CANONICAL-HELPERS.md)  
- [WS-AF-FE-D-P2-PHASE2-COMPLETION.md](../WS-AF-FE-D-P2-PHASE2-COMPLETION.md)  
- [engine-1-rbac.md](../engines/engine-1-rbac.md)  
- [RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md](../RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md)  
- [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD-027-patch3-critical-path-rescoping.md](../AD-027-patch3-critical-path-rescoping.md)  
- [AD-028-frontend-work-management-unification.md](../AD-028-frontend-work-management-unification.md), [AD-029-template-module-unification.md](../AD-029-template-module-unification.md), [AD-030-workspace-module-activation.md](../AD-030-workspace-module-activation.md)  
- [PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md](../PDR-2026-05-06-tenancy-assurance-and-test-reconciliation.md)  
- [V21_RECONCILIATION_2026-05-04.md](../V21_RECONCILIATION_2026-05-04.md), [V21_CURRENT_STATE_AUDIT.md](../V21_CURRENT_STATE_AUDIT.md)  
- [governance-evaluations-retention.md](../governance-evaluations-retention.md)  

### Cross-links

- [ADR index](../decisions/README.md)  
- [External research log](../external-research/research-log.md)  
- [Engine 6](../engines/engine-6-dashboards-kpis.md)  
