# AD-015 — Single Universal Work Model (`work_tasks`)

**Status:** LOCKED · **Date:** 2026-06-28 · **Author:** Solution Architect (with founder sign-off)
**Supersedes:** AD-001 (Work Items vs Work Management Separation) · **Amends:** `CANONICAL.md` §1.4, §1.5 (task lineage), Section 3 (API paths), Section 4 (AD log)
**Evidence base:** Work Model Foundation Recon + Wave 0 Reconciliation Recon (both agents) + staging SQL (2026-06-28)

---

## Context

AD-001 locked two intentionally separate work paradigms: Work Management (`work_tasks`, waterfall) and Work Items (`work_items`, agile), with the rule "do not propose merging." That decision predated (a) the verified state of the code and (b) a deliberate study of how the market-leading platforms are actually built.

Two findings overturn the premise AD-001 rested on:

1. **The market pattern.** ClickUp, Monday, Notion, and Linear were each examined from their actual system surfaces. None uses two physically separate work tables for agile vs. waterfall. Every one uses **one universal work model** and delivers every methodology as configuration on top of it (custom fields, custom statuses, toggleable capabilities, views). Two-table separation is an architecture none of the successful tools chose.

2. **The code already converged.** `work_tasks` carries **both** field families on the same row — waterfall (`wbs_code`, `planned_start_at`, `constraint_type`, phase gates) and agile (`estimate_points`, `committed`, `iteration_id`, `rank`) — with configurable per-project statuses (`project_statuses`), iterations, dependencies, subtasks, phase gates, baselines, and earned value all BUILT. Recon estimate: ~70% of a universal model already exists inside `work-management`. Meanwhile `work_items` is empty (0 staging rows, verified 2026-06-28) and its frontend is unwired.

The two-paradigm split is therefore both **redundant** (one row already holds both shapes) and **a maintenance multiplier** (every engine — governance, capacity, AI, audit, reporting — would have to target two surfaces instead of one).

---

## Decision

1. **`work_tasks` is the single canonical work model.** All work — across Waterfall, Agile, Scrum, Kanban, Hybrid — is a `work_tasks` row. Methodology is expressed by configuration + optional sub-structures (phases, iterations, gates) + templates, never by a separate table.
2. **`work_items` is retired.** It is a redundant second paradigm with no live data. (Wave 0.)
3. **`tasks` is retired.** Genuinely deprecated legacy. (Wave 0.)
4. **Methodology = configuration, not data model.** New methodologies are added as templates + status sets + field definitions + capability toggles. No new methodology requires a new table.
5. **The "easy setup" promise is delivered by the template layer**, not by constraining the model — opinionated presets on a flexible foundation (the Linear effect on a ClickUp-class model), with governance native to the single surface.

---

## Consequences

**Positive**
- One surface for every engine to integrate with (governance gates, capacity, AI proposals, audit, reporting) — halves the integration and maintenance burden.
- Hybrid (phase gates outside, iterative inside) becomes natural: one row can carry phase + iteration. Two tables could not express it.
- Adding methodologies later is configuration, not engineering (see "expansion" below).

**Costs / required follow-on work (tracked in Wave 1, not assumed done)**
- **Custom-field layer must be re-keyed** from `workItemId` to `work_task_id` with a real FK (orphaned entity, 0 rows — schema-only).
- **Entity-graph / typed relations are ABSENT** — a task cannot link to a risk/decision/artifact today. This is a genuine Wave 1 build, not a wiring fix.
- **`TaskType` enum lacks agile types** (`STORY`, `SPIKE`); `risk` lives in a separate `work_risks` table with no FK to a task. To be addressed when the universal type model is finalized.
- Legacy readers must be rewired before deletion (Wave 0 checklist).

**Expansion guarantee (the reason this scales):** universal fields stay as real columns; everything methodology-specific lives in the typed custom-field layer. A new methodology = template + statuses + field defs + capability toggles (cheap). A new *structural capability* (e.g., enforced WIP block, SAFe program layer) is build-once-use-everywhere on the single model — never built twice.

---

## Scope guard

This decision and its Wave 0 execution apply to **staging only**. Production teardown is a separate, later, deliberately planned dispatch with its own row-count verification.

---

## Evidence summary (staging SQL, 2026-06-28)

| Table | Row count | Status |
|---|---|---|
| `work_tasks` | 274 | Canonical, live |
| `tasks` | 30 | Legacy write paths (3 active, incl. raw-SQL bypasses in `templates.service.ts`) |
| `work_items` | 0 | Empty — safe to retire |
| `custom_field_values` | 0 | Orphaned entity, schema-only re-key |

FK child tables (`task_dependencies`, `task_attachments`, `work_item_comments`, `work_item_activities`, `work_item_dependencies`): all 0 rows.

---

## CANONICAL.md amendments (same PR)

- §1.4 Work Items → status **RETIRED (AD-015)**; remove "agile paradigm / do not merge."
- §1.2/§1.5 task lineage → `tasks` Wave 0 deletion authorized (AD-015); `work_tasks` sole canonical.
- Section 3 → `/work-items/*` marked RETIRED; `/work/tasks/*` is the single task API.
- Section 4 → AD-001 marked **SUPERSEDED by AD-015**; this entry added.
