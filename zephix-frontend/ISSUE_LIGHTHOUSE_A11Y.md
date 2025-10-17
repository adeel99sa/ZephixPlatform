# Lighthouse & A11y Hardening

## Goal
Codify a11y + performance targets and prove them with repeatable audits.

## Targets
- Lighthouse Perf ≥ 90, A11y ≥ 95 on:
  - Dashboard, Projects, Settings, Templates

## Tasks
- Add `aria-live` to async states (loading/error/success)
- Verify keyboard nav order on DataTable, Modal, Drawer, Tabs
- Confirm focus traps and focus restore after overlays close
- Add `<main>`/landmarks in `DashboardLayout` (if missing)
- Capture Lighthouse runs in `FRONTEND_VERIFICATION_REPORT.md`

## Acceptance Criteria
- Report updated with page-by-page Lighthouse scores + screenshots
- Known gaps listed with owners/ETA
- CI job publishes report on new PRs

/labels accessibility, performance
/assignees @architect @you
