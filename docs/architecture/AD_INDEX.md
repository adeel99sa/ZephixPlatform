# Architecture Decision (AD) index

**Purpose:** Single lookup for “what is locked, and where is it written?” Cursor and engineers should start here, then open the linked artifact.

**Maintenance rule:** When a new AD is locked in-repo, add or update a row in this index in the same PR (or immediately after). If an AD exists only outside the repo, keep it under **External / not in tree** with a pointer you control (shared drive, blueprint export, etc.)—never invent a path.

**Evidence rule:** Repo-state claims in memos must cite grep output + path, or be labeled **UNVERIFIED**.

---

## Quick links (in-repo anchors)

| Anchor | Path |
|--------|------|
| V21 engine/foundation reconciliation (binding claims as of date) | [`V21_RECONCILIATION_2026-05-04.md`](./V21_RECONCILIATION_2026-05-04.md) |
| Engine locations, deprecations, AD-001–009 log | [`CANONICAL.md`](../../CANONICAL.md) |
| Cursor-wide principles (references AD-010–026, AD-011 matrix) | [`.cursor/rules/architecture-principles.mdc`](../../.cursor/rules/architecture-principles.mdc) |
| Permission matrix (locked) | [`docs/architecture/AD-027_LOCKED.md`](./AD-027_LOCKED.md) |
| AD-027 batch 1 endpoint mapping | [`docs/architecture/AD-027_BATCH_1_ENDPOINT_MAPPING_FINAL.md`](./AD-027_BATCH_1_ENDPOINT_MAPPING_FINAL.md) |
| RBAC / access control narrative | [`docs/architecture/RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md`](./RBAC_AND_ACCESS_CONTROL_ARCHITECTURE.md) |

---

## AD listing

### AD-001 — AD-009 (locked, in `CANONICAL.md`)

Full decision text: **`CANONICAL.md` → Section 4: Architectural Decisions Log.**

| AD | Title (short) | In-repo source |
|----|----------------|----------------|
| AD-001 | Work Items vs Work Management separation | `CANONICAL.md` §4 |
| AD-002 | PM surface migration | `CANONICAL.md` §4 |
| AD-003 | Custom fields defer | `CANONICAL.md` §4 |
| AD-004 | Workflow engine dormancy | `CANONICAL.md` §4 |
| AD-005 | Sequential engine validation | `CANONICAL.md` §4 |
| AD-006 | No parallel feature work during validation | `CANONICAL.md` §4 |
| AD-007 | Password reset token storage | `CANONICAL.md` §4 |
| AD-008 | Reset token URL shape | `CANONICAL.md` §4 |
| AD-009 | Defensive revocation of legacy refresh_tokens | `CANONICAL.md` §4 |

### AD-010 — AD-026 (referenced in `.cursor/rules/architecture-principles.mdc`)

**Status:** Principles file summarizes locked outcomes (role model, work entity, capabilities, tabs, etc.). **Standalone `AD-0xx_LOCKED.md` files for AD-010–026 are not present** in this workspace as of index creation.

| AD | Topic (per principles file) | In-repo source |
|----|------------------------------|----------------|
| AD-010 | Unified work entity / `work_tasks` | `.cursor/rules/architecture-principles.mdc` |
| AD-011 | Role matrix (platform / workspace / project) | `.cursor/rules/architecture-principles.mdc` |
| AD-012 | Work item types / discriminator | `.cursor/rules/architecture-principles.mdc` |
| AD-013 | Project tabs (not sibling lists) | `.cursor/rules/architecture-principles.mdc` |
| AD-014 | Four-layer capability architecture | `.cursor/rules/architecture-principles.mdc` |
| AD-015 — AD-017 | Methodology / templates / default tabs (numbered in blueprint narrative) | **UNVERIFIED full text in-tree** — see principles + future blueprint commit |
| AD-018 — AD-023, AD-025, AD-026 | As summarized in binding blueprint (per principles) | **UNVERIFIED individual files in-tree** |
| AD-024 | Work Item Attributes Architecture (three-tier EAV, greenfield rebuild) | [`AD-024-work-item-attributes-architecture.md`](./AD-024-work-item-attributes-architecture.md) |
| AD-024 Tier 2 | Platform attribute library inventory (87 attributes, 10 categories) | [`AD-024-tier2-library-inventory.md`](./AD-024-tier2-library-inventory.md) |

**Tech debt — documentation completeness (AD-010 through AD-026):** These ADs are **not** in-tree as standalone locked files. Primary documentation exists in **(a)** `ZEPHIX_ARCHITECTURE_BLUEPRINT_v2.md` (**external** to this repo; maintained outside this tree, e.g. architect blueprint export), and **(b)** summarized in `.cursor/rules/architecture-principles.mdc`. Neither (a) nor (b) is a durable in-repo record by itself. **Resolution:** migrate substantive content into `CANONICAL.md` proper sections **or** create standalone locked `AD-0xx_LOCKED.md` files when each AD is next touched (**lazy-commit pattern**). Cursor rules remain execution hints; they must not be the only long-lived record for locked decisions.

### AD-027 (locked, full text in repo)

| AD | Title | In-repo source |
|----|--------|----------------|
| AD-027 | Permission matrix framework | [`AD-027_LOCKED.md`](./AD-027_LOCKED.md), [`AD-027_BATCH_1_ENDPOINT_MAPPING_FINAL.md`](./AD-027_BATCH_1_ENDPOINT_MAPPING_FINAL.md) |
| AD-027 Patch 3 | Critical-path endpoint rescoping for Engine 1 criterion 6 closure | [`AD-027-patch3-critical-path-rescoping.md`](./AD-027-patch3-critical-path-rescoping.md) |

**Related:** Production readiness Gate 1 (`ZEPHIX_WS_MEMBERSHIP_V1`) is defined in AD-027 context; runtime value must be proven under `docs/architecture/proofs/` (Gate Zero).

### AD-028 (locked, full text in repo)

| AD | Title | In-repo source |
|----|--------|----------------|
| AD-028 | Frontend work management unification (mirrors AD-010) | [`AD-028-frontend-work-management-unification.md`](./AD-028-frontend-work-management-unification.md) |

**Closes:** HIGH-4 audit finding (2026-05-02). **Implementation deferred** until backend AD-010 closes (Engine 3).

### AD-029 and above

| AD | Topic | In-repo source |
|----|--------|----------------|
| AD-029 | Template Module Unification (locked 2026-05-03; Template Center canonical, legacy `modules/templates/` deprecated) | [`AD-029-template-module-unification.md`](./AD-029-template-module-unification.md) |
| AD-030 | Workspace Module Activation & Capability Architecture Evolution (locked 2026-05-03) | [`AD-030-workspace-module-activation.md`](./AD-030-workspace-module-activation.md) |
| AD-031+ | As drafted by architect | Add rows when files land or pointer is stable |

**AD-030 notes:** Supersedes prior AD-030 v1 (discarded parallel-system proposal) and prior tentative "AD-030 (tier classification)" reference. Implements AD-014 Layer 0 by activating dormant `workspace_module_configs` infrastructure. Implementation deferred until AD-024 schema rebuild closes.

---

## Engine Dispatches

| Engine / track | Dispatch | In-repo source |
|----------------|----------|----------------|
| Engine 4 | Template Architecture Dispatch (7 phases, ~25-30d, grounded in 8-area recon) | [`ENGINE-4-TEMPLATE-DISPATCH.md`](../dispatches/ENGINE-4-TEMPLATE-DISPATCH.md) |
| Engine 4 prerequisite | Template Center audit consolidation — `TemplateCenterAuditService` → `AuditService.record()` (Phase B blocker; Gate 2 after Phase 0 recon) | [`TEMPLATE-CENTER-AUDIT-CONSOLIDATION-DISPATCH.md`](../dispatches/TEMPLATE-CENTER-AUDIT-CONSOLIDATION-DISPATCH.md) — implementation **PR #246** |

---

## Foundations / cross-cutting (not AD rows)

Use **`CANONICAL.md`** engine sections + [`V21_RECONCILIATION_2026-05-04.md`](./V21_RECONCILIATION_2026-05-04.md) for **binding** engine/foundation percentage and gap claims (as of the document date). Use [`V21_CURRENT_STATE_AUDIT.md`](./V21_CURRENT_STATE_AUDIT.md) for the Sprint 1 fill-in audit with section-by-section evidence (Gate Zero, AD-027 metrics, sampled engines). When the two diverge on aggregate framing, prefer the reconciliation for “what % / what’s stale” and the sprint audit for cited file-level proofs unless superseded by a newer reconciliation.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-04 | AD-029 locked in-tree: [`AD-029-template-module-unification.md`](./AD-029-template-module-unification.md). Template Center audit consolidation dispatch: [`../dispatches/TEMPLATE-CENTER-AUDIT-CONSOLIDATION-DISPATCH.md`](../dispatches/TEMPLATE-CENTER-AUDIT-CONSOLIDATION-DISPATCH.md) (PR #246). Engine Dispatches table updated |
| 2026-05-04 | V21 reconciliation document added: engine/foundation state vs repo (supersedes stale V21 aggregate claims). Quick link + foundations paragraph updated |
| 2026-05-01 | Initial index: CANONICAL ADs, principles-backed AD-010–026 note, AD-027 links, blueprint path mismatch called out |
| 2026-05-01 | AD-010–026 tech debt paragraph; align with CANONICAL.md + AD_INDEX as in-tree source of truth |
| 2026-05-03 | AD-027 Patch 3 added: critical-path endpoint rescoping for Engine 1 criterion 6 closure |
| 2026-05-03 | AD-028 added: frontend work management unification (closes HIGH-4). Previous AD-028 topic renumbered to AD-029 |
| 2026-05-03 | AD-024 first canonical commit: Work Item Attributes Architecture (three-tier EAV, greenfield rebuild). Supersedes prior cursor-rules reference |
| 2026-05-03 | AD-024 Tier 2 Library Inventory committed: 87 attributes across 10 categories, sourced from PMI/Scrum/ECMH/ITIL authorities |
| 2026-05-03 | AD-030 locked: Workspace Module Activation & Capability Architecture Evolution. Supersedes prior AD-030 v1 + tier classification reference. Activates dormant module infrastructure |
| 2026-05-03 | Engine 4 Template Dispatch committed: 7 phases (A-G), unifies two template systems, wires to AD-024 attributes + AD-030 modules. Critical path ~25d |
