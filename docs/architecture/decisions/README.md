# Architecture Decision Records (ADR) — Zephix

This directory indexes **lightweight ADRs** documenting architecturally significant choices. ADRs here complement numbered **AD-xxx** locked decisions under `docs/architecture/` and engine-specific narratives under [`engines/`](../engines/) and [`foundations/`](../foundations/).

---

## ADR template (Michael Nygard style)

> Adapted from *Documenting Architecture Decisions* ([Cognitect](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), Michael Nygard, 2011) and community templates ([ADR GitHub organization](https://adr.github.io/)).

```markdown
# ADR-XXX — Short title

## Status

Proposed | Accepted | Deprecated | Superseded by ADR-YYY

## Context

What forces problem statement in neutral language (technical, compliance, schedule)?

## Decision

What we will do — active voice, testable statements.

## Consequences

Positive outcomes, negative trade-offs, follow-up work.

## References

Links to PRs, proofs, engine docs, external standards.
```

**Naming:** Prefer `ADR-<Engine|Foundation>-<NNN>-short-slug.md` when extracted as standalone files in the future; evaluation-cycle retrospectives currently live **embedded** inside engine/foundation markdown (see tables below).

---

## ADRs authored — Frontend evaluation cycle (WS-DOC-FE-ENGINES)

| ID | Title | Document |
|----|-------|----------|
| ADR-Engine-1-001 | Canonical helper hierarchy | [engine-1-rbac.md](../engines/engine-1-rbac.md) §1.2 |
| ADR-Engine-1-002 | Lint Rule A (raw role equality ban) | ibid. |
| ADR-Engine-1-003 | `isPlatformAdmin` canonicalization | ibid. |
| ADR-Engine-1-004 | `createRolesAccessMocks` infrastructure | ibid. |
| ADR-Engine-6-001 | KPI schema extension / dual module boundaries | [engine-6-dashboards-kpis.md](../engines/engine-6-dashboards-kpis.md) §6.2 |
| ADR-Engine-6-002 | KPI calculator registry | ibid. |
| ADR-Engine-6-003 | Dashboard folder split (`features/` vs `views/`) | ibid. |
| ADR-F-E-001 | Administration helpers (Theme D Phase 2) | [f-e-admin-console.md](../foundations/f-e-admin-console.md) §F-E.2 |
| ADR-F-E-002 | Rule A extension to administration | ibid. |
| ADR-F-E-003 | Administration shell entry conventions | ibid. |

---

## Process — when to add an ADR

1. **Trigger:** Change impacts tenancy boundaries, security posture, data model contracts, cross-engine integration, or long-lived operational cost.
2. **Author:** Engineers propose; **Solution Architect** accepts for binding decisions (per repo authority rules).
3. **Location:** Start embedded in the nearest **engine/foundation** doc; promote to standalone `ADR-*.md` here when reused across multiple engines or referenced externally.
4. **Lifecycle:** Never delete — supersede with a newer ADR and update status fields.

---

## Cross-references

- [External research log](../external-research/research-log.md)
- [Engine 1 — RBAC](../engines/engine-1-rbac.md)
- [Engine 6 — Dashboards & KPIs](../engines/engine-6-dashboards-kpis.md)
- [F-E — Admin Console](../foundations/f-e-admin-console.md)
- In-repo locked ADs: [AD-027_LOCKED.md](../AD-027_LOCKED.md), [AD_INDEX.md](../AD_INDEX.md) (if present)
