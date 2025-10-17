# Frontend Lint Debt Burn-Down (2 weeks)

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

/labels tech-debt, frontend
/assignees @architect @you
