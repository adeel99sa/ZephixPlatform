# Architecture Decision (AD) index

**Purpose:** Single lookup for “what is locked, and where is it written?” Cursor and engineers should start here, then open the linked artifact.

**Maintenance rule:** When a new AD is locked in-repo, add or update a row in this index in the same PR (or immediately after). If an AD exists only outside the repo, keep it under **External / not in tree** with a pointer you control (shared drive, blueprint export, etc.)—never invent a path.

**Evidence rule:** Repo-state claims in memos must cite grep output + path, or be labeled **UNVERIFIED**.

---

## Quick links (in-repo anchors)

| Anchor | Path |
|--------|------|
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
| AD-018 — AD-026 | As summarized in binding blueprint (per principles) | **UNVERIFIED individual files in-tree** |

**Tech debt — documentation completeness (AD-010 through AD-026):** These ADs are **not** in-tree as standalone locked files. Primary documentation exists in **(a)** `ZEPHIX_ARCHITECTURE_BLUEPRINT_v2.md` (**external** to this repo; maintained outside this tree, e.g. architect blueprint export), and **(b)** summarized in `.cursor/rules/architecture-principles.mdc`. Neither (a) nor (b) is a durable in-repo record by itself. **Resolution:** migrate substantive content into `CANONICAL.md` proper sections **or** create standalone locked `AD-0xx_LOCKED.md` files when each AD is next touched (**lazy-commit pattern**). Cursor rules remain execution hints; they must not be the only long-lived record for locked decisions.

### AD-027 (locked, full text in repo)

| AD | Title | In-repo source |
|----|--------|----------------|
| AD-027 | Permission matrix framework | [`AD-027_LOCKED.md`](./AD-027_LOCKED.md), [`AD-027_BATCH_1_ENDPOINT_MAPPING_FINAL.md`](./AD-027_BATCH_1_ENDPOINT_MAPPING_FINAL.md) |

**Related:** Production readiness Gate 1 (`ZEPHIX_WS_MEMBERSHIP_V1`) is defined in AD-027 context; runtime value must be proven under `docs/architecture/proofs/` (Gate Zero).

### AD-028 and above (draft / follow-up / external)

| AD | Topic | In-repo source |
|----|--------|----------------|
| AD-028 | Service-to-service auth; audit store reconciliation (multiple follow-ups cited in AD-027) | **Not locked in-tree** — see `AD-027_LOCKED.md` mentions |
| AD-029 | Tier classification (referenced from batch mapping) | **Referenced** in `AD-027_BATCH_1_ENDPOINT_MAPPING_FINAL.md` — **no standalone `AD-029_LOCKED.md` in tree** |
| AD-030+ | As drafted by architect | Add rows when files land or pointer is stable |

---

## Foundations / cross-cutting (not AD rows)

Use **`CANONICAL.md`** engine sections + [`V21_CURRENT_STATE_AUDIT.md`](./V21_CURRENT_STATE_AUDIT.md) for evidence-backed status of audit (F-A), notifications (F-B), billing code vs commercial motion, email worker, etc.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-01 | Initial index: CANONICAL ADs, principles-backed AD-010–026 note, AD-027 links, blueprint path mismatch called out |
| 2026-05-01 | AD-010–026 tech debt paragraph; align with CANONICAL.md + AD_INDEX as in-tree source of truth |
