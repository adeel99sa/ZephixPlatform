# Frontend Lint Debt Report

**As of:** 2024-12-19

## Baseline (from audit)
- Total errors: ~657 (legacy codebase)
  - `@typescript-eslint/no-explicit-any`: ~200+
  - `@typescript-eslint/no-unused-vars`: ~100+
  - `react-hooks/exhaustive-deps`: ~35 warnings
- Top offenders (files):
  - src/components/pm/project-initiation/RiskAssessment.tsx (~25)
  - src/components/intake/AIFormPreview.tsx (~20)
  - src/types/workflow.ts (~15)
  - src/services/enterpriseAuth.service.ts (~15)

## After autofix (current run)
- Errors: 0 (new code paths)
- Warnings: 23 (new code paths only)
- Auto-fixed: 0 (no autofix run yet)

## Category breakdown (current - new code only)
- no-explicit-any: 2 (QueryProvider, queryConfig)
- no-unused-vars: 0
- exhaustive-deps: 0
- Missing return types: 21 (functions in stores/pages)
- import/order: 0

## Owners & Plan
- **Week 1 (Auto-fixables + unused vars):** Owner: @malikadeel — Target: reduce by 50%
- **Week 2 (no-explicit-any in critical files):** Owner: @malikadeel — Target: reduce by 75%
- **Week 3 (exhaustive-deps + hooks correctness):** Owner: @malikadeel — Target: reduce by 90%

## SLA / Done when
- Total errors = 0
- Remaining warnings triaged or waived with justification
- New code paths maintain 0 errors (enforced by CI)

## Current Status
- ✅ **New Code**: 0 errors, 23 warnings (acceptable)
- 🔄 **Legacy Code**: ~657 errors (tracked, non-blocking)
- ✅ **CI Gates**: Enforcing 0 errors on new code paths
