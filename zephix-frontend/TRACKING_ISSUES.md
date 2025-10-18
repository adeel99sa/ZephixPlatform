# GitHub Issues for Tracking

## Issue 1: Frontend Lint Debt Burn-Down (2 weeks)

```markdown
## Goal
Reduce legacy ESLint errors to near-zero without blocking new development.

## Baseline
See `reports/frontend/LINT_DEBT.md` + latest snapshot in `reports/frontend/DEBT_SNAPSHOTS/`.

## Plan
- **Week 1**
  - repo-wide `eslint --fix` (import order, unused imports/vars)
  - fix `react-refresh` and easy TypeScript rule breaches
  - clean up top 10 offender files
- **Week 2**
  - replace `any` in prioritized modules
  - fix `react-hooks/exhaustive-deps` in custom hooks
  - migrate 5 legacy pages to new primitives

## Acceptance Criteria
- Total legacy lint count reduced by ≥70%
- `lint:new` stays at 0 errors
- No increase in snapshot deltas across the week

## Artifacts
- Updated `reports/frontend/LINT_DEBT.md` (before/after table)
- New daily snapshots committed

## Automation
- Nightly debt audit workflow will auto-comment on this issue if debt increases
- Daily snapshots available in `reports/debt/`

/labels tech-debt, frontend
/assignees @malikadeel
```

## Issue 2: Lighthouse & A11y Hardening

```markdown
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

## Automation
- Release gate workflow will run Lighthouse on all key pages
- Results will be attached to release notes automatically

/labels accessibility, performance
/assignees @malikadeel
```
