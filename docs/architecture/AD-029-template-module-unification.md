# AD-029: Template Module Unification

**Status:** Locked architecturally 2026-05-03. Implementation deferred until Engine 3 closure (AD-010 work_tasks unification) to avoid cross-cutting refactor risk.
**Author:** Solution Architect (Claude)
**Mirrors:** AD-028 Frontend Work Management Unification (same consolidation pattern, backend side).
**Closes architectural gap:** Two coexisting template systems with no canonical authority.
**Surfaced by:** Engine 4 Template Dispatch reconnaissance (2026-05-03).
**Renumbering note:** Prior tentative "AD-029 (tier classification)" placeholder renumbered to AD-030 per AD-028 precedent (reservation-on-commit, not reservation-on-mention).

---

## Why this AD exists

Reconnaissance of the codebase reveals two separate template systems coexisting:

- `modules/templates/` — legacy template CRUD with the canonical `instantiate-v5_1` endpoint, save-as-template, lego-blocks, template-actions
- `modules/template-center/` — newer governance-aware system with TemplateDefinition, TemplateApplyService, gates, KPIs, evidence, policies, lineage tracking

Both modules have ZERO external consumers. They don't cross-depend on each other. They're self-contained but architecturally redundant. The canonical instantiation endpoint lives in the legacy module while the governance-aware instantiation service lives in Template Center.

**This is the same anti-pattern AD-024 just resolved for custom_fields:** two systems doing the same thing with different architectural maturity, inevitable confusion about which is canonical, eventual silent divergence as feature work lands in one or the other arbitrarily.

Without this AD:
- Engine 4 Template Dispatch has no canonical target — does it integrate AD-024 attributes into legacy templates, into Template Center, or both?
- Future feature work will land arbitrarily in either module
- API consumers (when frontend wires up template UIs) won't know which endpoint surface is supported
- Bugs in one system won't propagate to the other (silent feature drift)
- Engine 5 governance work (which reuses template-center's gates/policies/evidence) becomes architecturally ambiguous

This AD locks the consolidation decision and migration path before Engine 4 dispatch can proceed.

**`pm/workflow-template` is OUT of scope** for this AD. Reconnaissance confirms it's a workflow automation engine (stages, automations, approvers per AD-004's dormant workflow domain), not a project template system. Different architectural concern. If consolidation is needed there, separate AD.

---

## Decision

**`modules/template-center/` becomes the canonical template module.** `modules/templates/` is deprecated and migrates into Template Center, with one critical exception (the `instantiate-v5_1` endpoint URL preserved as alias during transition).

### Why Template Center wins

1. **Architectural maturity:** Governance-aware (gates, KPIs, evidence, policies, lineage). Legacy is basic CRUD. Engine 5 governance work composes from Template Center, not legacy.
2. **Forward compatibility:** AD-024 Tier 2 attributes integrate naturally into Template Center's TemplateDefinition + TemplateApplyService. Retrofitting legacy would duplicate the integration.
3. **AD-029 precedent (this AD):** Same pattern as AD-028 — consolidate to the more architecturally complete location.
4. **Engine 4 dependency:** Template-attribute composition (per AD-024) lands in Template Center. Legacy would need parallel implementation.
5. **Engine 5 dependency:** Phase gates + governance policies + evidence packs already live in Template Center. Engine 5 dispatches reference Template Center entities.

### What disappears

- `modules/templates/` entirely (after migration completes)
  - All 5 controllers consolidated into Template Center equivalents
  - DTOs migrated where still relevant; orphaned DTOs deleted
  - Services migrated where still relevant; orphaned services deleted
  - Tests migrated to Template Center test directory

### What's preserved unchanged

- `modules/template-center/` becomes the single canonical location
- `pm/workflow-template/` unchanged (different concern, see scope note above)
- The `POST /templates/:id/instantiate-v5_1` URL is preserved as an alias during transition (see URL handling section)

---

## Architectural rationale

**Why Template Center is the canonical location:**

1. Already contains the canonical TemplateDefinition entity
2. Already has governance-aware services (gates, KPIs, evidence, policies)
3. Already has TemplateLineage tracking (which template created which project)
4. Already has the search infrastructure
5. Naming aligns with platform positioning ("Template Center" suggests opinionated curated library, which matches AD-024 framing)
6. Existing seed scripts (seed-system-templates, seed-prebuilt-templates, seed-phase2-templates) target Template Center entities

**Why `modules/templates/` legacy must not survive:**

- Two systems guarantee divergence over time
- Future engineers will accidentally extend whichever they touch first
- Template Center's governance features (gates, evidence, lineage) won't propagate to legacy templates without duplication
- AD-024 integration would have to happen twice
- Test coverage splits, regression risk doubles

**Why `pm/workflow-template/` stays separate:**

WorkflowTemplate orchestrates workflow stages with automations, approvers, notifications. This is workflow execution infrastructure (per AD-004 workflow domain), distinct from template instantiation. The two are related concepts but architecturally separate concerns. Conflating them would create the same problem we're solving here.

If V1.x or V2 work surfaces overlap (e.g., a template's gate triggers a workflow), the integration is via clean interface between Template Center and Workflow domain, not via merging the two.

---

## Dependencies

### Hard dependency: AD-010 (Engine 3) closure

Template Center entities reference work_tasks throughout (TemplateApplyService creates work_tasks, TemplateLineage tracks them). Until AD-010 unifies work_items → work_tasks, any consolidation work risks introducing inconsistency.

**Resolution:** Implementation waits for AD-010 closure. Same blocker as AD-024 implementation, AD-028 implementation, Engine 4 dispatch.

### Hard dependency: AD-024 schema rebuild

Template Center will integrate Tier 2 attributes per AD-024. The rebuild of attribute_definitions / attribute_values must complete before Template Center can wire attribute enablement into TemplateApplyService.

**Resolution:** Sequence is: Engine 1 closes → AD-010 closes → AD-024 rebuild closes → AD-029 implementation can begin → Engine 4 Template Dispatch can begin.

### Soft dependency: AD-014 capability architecture

Templates expose capabilities (per AD-014 Layer 0). The Capability Registry AD (forthcoming, separate deliverable) must commit before templates can declare "this template requires capability X." For AD-029 implementation purposes, capability integration is post-consolidation work.

### Forward dependency: Engine 5 (Governance)

Engine 5 dispatches will reference Template Center's gates, evidence, and policies subsystems. AD-029 ensures these are in their canonical location before Engine 5 work begins.

### Forward dependency: AD-024-Implementation

AD-024 implementation dispatch will need to know where attribute enablement integrates. After AD-029 commit, the answer is unambiguous: Template Center's TemplateDefinition + TemplateApplyService.

---

## Migration sequence

When all hard dependencies close (Engine 3 + AD-024 rebuild), the migration follows this order:

### Phase 1: Pre-migration verification (~1 day)

1. Confirm zero external imports from `modules/templates/*` (re-verify recon finding)
2. Confirm zero external imports from `modules/template-center/*` outside its own dir
3. Confirm seed scripts identified and inventoried
4. Confirm `instantiate-v5_1` endpoint usage (likely zero customer usage but verify)
5. Capture baseline test counts (legacy + Template Center test suites)
6. Backups confirmed per standard ops

### Phase 2: Inventory and mapping (~1 day)

For each entity/service/controller in `modules/templates/`:
- Map to existing Template Center equivalent OR mark as orphaned
- Document migration target (file + class name)
- Identify behavior gaps (legacy has X that Template Center lacks)
- Decide: extend Template Center to absorb gap, OR drop the behavior

Concrete mapping work:
- 5 legacy controllers → Template Center equivalents (most likely consolidate into existing controllers)
- Legacy DTOs → migrate or delete
- Legacy services → migrate or delete
- Legacy enums/constants → migrate to Template Center common/

Output: explicit migration map document. Becomes input for executor dispatch.

### Phase 3: Behavior gap closure (~2-3 days)

For each behavior gap identified in Phase 2:
- If keeping behavior: implement equivalent in Template Center
- If dropping behavior: document deprecation + customer migration path (likely none since zero consumers)

Most likely scope: minimal. Template Center is more mature; legacy mostly has subset of behavior.

### Phase 4: URL alias preservation (~0.5 day)

The `POST /templates/:id/instantiate-v5_1` URL is referenced in CLAUDE.md as canonical. Even with zero current consumers, preserving the URL pattern prevents accidental breakage.

Implementation: Template Center exposes the same URL as alias to its canonical instantiation endpoint. Deprecation notice in API docs but URL remains live.

Other legacy URLs (`/templates/:id/save-as-template`, `/templates/:id/lego-blocks/*`, etc.) — evaluate per Phase 2 mapping. Most likely deprecate without alias since no consumers.

### Phase 5: Migration execution (~3-4 days)

1. Move/consolidate code per Phase 2 mapping
2. Update seed scripts to target Template Center entities only
3. Run all template-related tests against Template Center
4. Verify `instantiate-v5_1` URL alias works
5. Run full e2e sweep against migration baseline

### Phase 6: Legacy deletion (~1 day)

1. Delete `modules/templates/` directory entirely
2. Remove from app module registration
3. Verify no broken imports across codebase
4. Final test sweep

### Phase 7: Documentation (~0.5 day)

1. Update CLAUDE.md to reflect Template Center as canonical
2. Update AD_INDEX with implementation status
3. Update API documentation
4. Note alias preservation for `instantiate-v5_1`

**Total Phase 1-7 effort:** ~7-10 days backend developer work. Likely 2-3 PRs (mapping + execution + cleanup) to maintain single-PR scope discipline.

---

## URL handling

### Preserved URLs

- `POST /templates/:id/instantiate-v5_1` — preserved as alias to Template Center's canonical instantiation endpoint. Documented as deprecated but functional.

### Deprecated URLs (subject to Phase 2 mapping confirmation)

Likely candidates for deprecation without alias (zero consumers):
- `POST /templates/:id/save-as-template`
- `GET /templates/:id/lego-blocks`
- `POST /templates/:id/template-actions`
- Other legacy CRUD endpoints

Each will be evaluated in Phase 2. If any has surprise consumers (frontend deep links, scripts, integrations), aliasing applies.

### New canonical URLs

Template Center already exposes its endpoint surface. Migration adds the alias mappings; no new canonical URLs introduced by this AD.

---

## State preservation considerations

User-facing state to preserve through migration:

- **TemplateDefinition records:** Preserved (already in Template Center)
- **TemplateLineage records:** Preserved (already in Template Center)
- **Templates created via legacy save-as-template:** Need verification in Phase 2 — if any exist, migration creates equivalent TemplateDefinition rows
- **API contracts:** Backward-compatible aliases for documented endpoints (`instantiate-v5_1`); breaking changes documented for undocumented endpoints

For pre-customer state (current Zephix state), preservation is best-effort. If any TemplateDefinition data needs migration during Phase 5, it's straightforward (entities already exist).

---

## Hard constraints for implementation

### CONSTRAINT 1: AD-010 + AD-024 must be complete

Implementation begins only after work_tasks unification (AD-010) and attribute schema rebuild (AD-024) are complete and verified on staging. HALT condition: verify both in Phase 1.

### CONSTRAINT 2: One phase per PR

Phases 2-7 should be 2-3 separate PRs, not a single mega-PR. Recommended breakdown:
- PR A: Phase 2 mapping document (architecture artifact, not code)
- PR B: Phase 3 + 4 (behavior gap closure + URL alias)
- PR C: Phase 5 + 6 + 7 (migration + deletion + docs)

### CONSTRAINT 3: No new feature work during migration

Migration PRs do not add new functionality. Only relocate, consolidate, preserve. New features (including AD-024 attribute integration) wait until migration completes.

### CONSTRAINT 4: Reversibility per phase

Each PR must be revertible without breaking the codebase. PR B can be reverted to Phase 2 state cleanly. PR C revert restores Template Center + legacy module coexistence (suboptimal but functional).

### CONSTRAINT 5: API URL aliases stable

`instantiate-v5_1` URL must remain live through and after migration. Internal implementation can change; URL contract is preserved.

### CONSTRAINT 6: pm/workflow-template untouched

Out of scope. Any executor temptation to "consolidate while we're in here" is HALT condition.

### CONSTRAINT 7: Pre-investigation before implementation

Phase 2 mapping document is the pre-investigation deliverable. Implementation cannot begin until mapping is reviewed and approved by architect (Gate 2 equivalent).

---

## Test impact

Reconnaissance identified:

- Legacy `modules/templates/` has its own test directory
- Template Center has its own test directory
- Both test suites currently pass in isolation (per current CI state)

Migration test discipline:
- Phase 1.5 captures baseline counts for both test suites
- Each PR runs full backend test suite
- No regression in existing tests
- Tests for migrated functionality verify equivalence to legacy behavior
- New tests not required (migration, not feature work)

---

## Tech debt acknowledgments

Items deferred from this AD that should be tracked:

1. **Capability Registry AD** — separate deliverable. Forthcoming. Until committed, templates cannot declare capability requirements. AD-029 implementation does not depend on capability registry; integration happens post-implementation when registry exists.

2. **Workflow integration with templates** — Template gates may need to trigger workflow stages (per AD-004). Cross-domain integration deferred to V1.x AD when both Template Center and Workflow domain stabilize.

3. **Template versioning** — TemplateDefinition versioning, customer-installed template upgrades, breaking change policy. Engine 4 or V1.x concern.

4. **Template marketplace (V2)** — User-published templates, organization-published templates, ratings. Out of scope here.

5. **Internationalization of template content** — Currently English. V2+ concern.

6. **CLAUDE.md update** — Reference to `instantiate-v5_1` should clarify Template Center as canonical implementation. Phase 7 task.

---

## What this AD does NOT cover

Explicit scope bounds:

- **Workflow domain consolidation** — `pm/workflow-template/` stays separate
- **AD-024 attribute integration** — that's Engine 4 work, post-consolidation
- **Capability registry** — separate AD, separate dispatch
- **Template Center feature additions** — migration only, no new features
- **Frontend template UI** — Engine 4 frontend dispatch (separate)
- **Template marketplace** — V2 concern
- **Template versioning policy** — separate AD when versioning needs solidify
- **Permission model for templates** — AD-027 critical-path covers admin endpoints; if templates need additional permission depth, separate work

This AD is purely about consolidating two backend template systems into one canonical location, mirroring AD-028's pattern on the frontend.

---

## Approval and lock

**Locked architecturally as of 2026-05-03 by Solution Architect.**

**Effect on Engine 1:** None. Implementation waits for Engine 3 closure.

**Effect on Engine 3:** None directly. Engine 3 unification proceeds independently.

**Effect on AD-024 implementation:** Sequencing clarification. AD-024 implementation completes first; AD-029 migration follows. Then Engine 4 dispatches against unified Template Center with AD-024 attribute integration.

**Effect on Engine 4:** Eliminates architectural ambiguity. Engine 4 dispatch targets Template Center exclusively. No need to choose between two template systems.

**Effect on Engine 5:** Governance subsystems (gates, evidence, policies) confirmed as canonical in Template Center. Engine 5 dispatches reference these directly.

**Effect on AD_INDEX:** Add AD-029 entry with "locked" status. Note prior AD-029 placeholder (tier classification) renumbered to AD-030.

**Effect on V21 audit:** New tracked deferred work — "Template module consolidation pending Engine 3 closure."

**Effect on next session:** No immediate dispatch action. Implementation queued behind Engine 3 closure. Capability Registry AD becomes next architect deliverable in queue.

---

## Renumbering ledger

Prior session-end memory referenced these tentative AD numbers:
- "AD-029 (tier classification)" — renumbered to AD-030 per AD-028 precedent
- This AD claims AD-029 (Template Module Unification)

Convention reinforced: ADs claim numbers on commit, not on mention. Any future "AD-XXX" references in passing do not reserve numbers.

---

## Document end

This AD is binding until explicitly superseded by future AD with higher number that addresses the same concern.
