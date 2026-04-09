# Phase 5A.6 — Verification hold (project-template UX correction)

**Status:** Implementation landed in repo; **operator approval blocked** until browser proof and (where applicable) migration `18000000000064` are applied in the **judged environment**.

## What 5A.6 adds (vs 5A.5)

- **Workspace-owned identity frame** at top of the project shell (`ProjectIdentityFrame`): explicit “In workspace …”, project title, methodology + lifecycle + operating status, PM, team size, start/target, structure rule. Breadcrumb is **secondary** (smaller `ol` trail).
- **Single overview fetch** in `ProjectPageLayout` → `ProjectContext.overviewSnapshot` shared with `ProjectOverviewTab` (no duplicate GET).
- **Overview** reordered: template & plan essentials card → actions → **≤5** immediate actions → health **only if** at risk / blocked / behind → **collapsed** “Cost & advanced metrics” and “Program & portfolio”.
- **Template preview**: description in header, **Best for** line, split **Required artifacts** vs **Required approvals**, compact governance note.

## Exit checklist (same bar as 5A.5 + below)

- [ ] Migration `18000000000064` applied if the environment still shows legacy `Welcome to Zephix` as a project name.
- [ ] Screenshot: identity frame + muted breadcrumb (full viewport).
- [ ] Screenshot: Overview first screen (essentials + ≤5 actions, no healthy banner, collapsed advanced).
- [ ] Screenshot: Template preview (Best for + phases + split required lists).
- [ ] Screenshot: phases on project essentials align with template preview phase names/count (spot-check).
- [ ] `npm run build` + targeted tests green.

## Browser proof folder

Save under `docs/verification/proofs/phase-5a6/` (create if missing).

## Relation to 5A.5

Phase **5A.5** remains **in verification hold** until evidence exists; **5A.6** is the focused corrective UX pass requested by architecture. Both may be cleared together once proof + migration are satisfied.
