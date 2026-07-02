# AD-016 — Template Authority & Lock Model

**Status:** LOCKED · **Date:** 2026-06-28 · **Author:** Solution Architect · **Decided by:** Founder (lock semantics), Architect (mechanics)
**Depends on:** AD-015 (single work model) · **Feeds:** Wave 1 Track A (custom fields), W1-D1 recon, Wave 2 Governance
**Amends:** CANONICAL.md Section 4 (add entry)

---

## Context

Templates are the authoring surface for governance: they carry fields, statuses, phases, gates, required deliverables, and KPIs into every project instantiated from them. Three roles author templates (Org Admin, Workspace Owner, Project Manager). The platform needs a deterministic rule for who may change what, and how org-mandated structure survives downstream customization. Prior art (founder's previous company): ClickUp services team hand-built "managed templates" because the product could not express enforced structure — that gap is the market opening.

## Decision

### 1. Tier hierarchy — each tier sets a floor the tier below inherits and extends
```
SYSTEM (Zephix-shipped starters: Waterfall, Agile, Scrum, Kanban, Hybrid)
  → ORG (Admin-authored: tenant governance — mandatory gates, fields, checkpoints)
    → WORKSPACE (Owner-customized for the workspace's project type)
      → PROJECT (PM-instantiated; project-specific additions)
```

### 2. Lock model: LOCKED-WITH-ROOM, per-item granularity
- The lock is **per-field and per-gate**, not per-template. A `locked: boolean` flag lives on each field/gate definition.
- A locked item, downstream of the tier that locked it: **cannot be removed, cannot be reordered above locked items, cannot be overridden** by an inheriting template or instance.
- Downstream tiers **may add** fields/phases/gates after the locked floor. The addition right is what distinguishes ORG templates from SYSTEM copies.
- **Full lock is a degenerate case**: lock every item → fixed compliance envelope (SOX/ISO pattern). One model, not two.

### 3. Authority rule: highest role that locks, wins
- Org Admin locks at ORG tier; Workspace Owner may lock additional items at WORKSPACE tier (binding PMs below); PM customizes the unlocked remainder at PROJECT tier.
- Below a lock, nobody edits the locked item. At the locking tier, that role (and above) may edit/unlock.
- Lock authority is a capability (module 1 registry) — `template.lock` scoped per tier — not a hardcoded role check.

### 4. Propagation rule (the update question)
When an ORG template changes after workspaces/projects have inherited from it:
- **New instantiations** get the updated template.
- **Existing projects keep their instantiated snapshot** — instantiation copies definitions down (including `locked` flags); it does not live-link. No silent mid-project structure changes.
- A deliberate "re-sync to template" action is a later feature (post-MVP), founder-gated, never automatic.
Rationale: live propagation into running projects is a governance change mid-flight — exactly what phase-gated work must not experience silently.

### 5. Two doors preserved
SYSTEM starters ship with zero locks. The Tuesday signup picks a methodology and gets a working project with the right fields in <5 minutes, never seeing "managed template" or a lock. The lock machinery is admin-side, opt-in, pull-not-push.

## Alternative considered
**Per-template lock (Monday-style managed template):** simpler UI and enforcement (one boolean), but forces the full-lock/no-lock binary — org either freezes everything or governs nothing, and teams lose the add-on-top right that makes ORG templates useful. Rejected: per-item lock costs a more complex enforcement matrix but is the only shape that expresses "org sets the floor, teams build on it," which is the product's governance thesis. Full-lock remains expressible.

## Enforcement points (mechanics)
1. **Edit-time:** template edit API rejects remove/override/reorder-above of a locked item by any principal below the locking tier.
2. **Instantiation-time:** `POST /templates/:id/instantiate-v5_1` copies every locked item and its `locked` flag into the project's materialized config — locked items always materialize, unconditionally.
3. **Runtime:** the Governance engine (E5, Wave 2) enforces locked gates/required-fields during execution (BLOCK on gate without required deliverable, etc.). The lock defines the floor; E5 polices it.

## Data linkage (hook for W1-D1)
Field definitions carrying `locked` live in the custom-field model that Track C just re-keyed (`custom_field_values` → `work_task_id`; definition entities pending W1-D1 consolidation verdict). W1-D1's recon must answer: which definition entity carries `locked` + tier scope, and whether `custom_fields` (org) and `custom_field_definitions` (workspace) consolidate into one scoped definition model — the default hypothesis. Gate definitions (`PhaseGateDefinition`, exists) need the same `locked` flag.

## Consequences
- Wave 1 Track A builds field definitions with `{scope, locked}`; instantiation copies flags down.
- Wave 2 governance proof-slice (deliverable-required at gate) exercises a locked gate end-to-end — the founder's prior-company flow, native.
- Template authoring UI (module 4/18) needs per-item lock affordance + "locked by Org" indicator downstream.
- Compliance templates (regulated verticals, post-MVP) are a template configuration, not new machinery.
