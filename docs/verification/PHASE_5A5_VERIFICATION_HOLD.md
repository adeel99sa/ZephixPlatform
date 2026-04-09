# Phase 5A.5 — Verification hold

**Update:** Phase **5A.6** implements the corrective UX (identity frame, overview order, preview IA). See `PHASE_5A6_VERIFICATION_HOLD.md`. This document remains the **5A.5** checklist; operators may close 5A.5 and 5A.6 together when proof is complete.

**Status:** Not approved for sign-off until visual proof and migration are applied in the target environment.

**Architect decision:** Phase 5A.5 remains **in verification hold** until the checklist below is satisfied with evidence attached to this folder or linked in the PR.

## Why hold

1. **Browser proof** — Screenshots must be captured on a real session (project shell, Overview, Template Center preview, Gantt) and stored under `docs/verification/proofs/phase-5a5/` (or equivalent operator path).
2. **Hierarchy** — Breadcrumb must read as an explicit **workspace / project** trail (no generic `Projects` parent when workspace is known), without UI that looks like a generic “back” affordance.
3. **Sample project confusion** — Legacy rows named `Welcome to Zephix` are renamed via migration `18000000000064` to **`Sample: Zephix walkthrough`**. Hold clears only after migrations run in that environment and the sidebar reflects the new label (or the project is deleted).
4. **Template preview** — Summary-first preview must be verified in-browser after login (not only static tests).

## Exit criteria (checklist)

- [ ] Migration `18000000000064` applied (`RenameLegacyWelcomeToZephixSampleProject`).
- [ ] Screenshot: project header breadcrumb `WorkspaceName / ProjectName` (full viewport).
- [ ] Screenshot: Overview identity + compact actions (full viewport).
- [ ] Screenshot: Template Center → preview modal (summary sections visible).
- [ ] Screenshot: Gantt with undated tasks showing “waiting for schedule dates” list + header counts.
- [ ] `npm run build` + targeted frontend tests green on the branch under review.

## Gantt behavior (reference)

The chart only draws tasks that have **planned start/end**, **startDate/dueDate**, or equivalent schedule fields. Tasks without dates still count as work items but do not produce timeline bars — this matches time-based schedule views; the UI now surfaces the undated list and links to Plan/Activities.

## Owner

Operator / QA: attach dated screenshots and tick the checklist, then move status to **approved** in the sprint doc.
