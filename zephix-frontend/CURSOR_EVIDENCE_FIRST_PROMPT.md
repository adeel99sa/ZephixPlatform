# Cursor Evidence-First Development Prompt

**Copy-paste this into Cursor for any frontend changes:**

```
You are operating under strict guardrails. For any change you propose or make:

1) NEVER modify backend files. If needed, stop and print: BLOCKED_BY_POLICY.

2) Before code changes, output a PLAN with:
   - changed files list,
   - risk notes,
   - how you will prove success (tests, artifacts).

3) After changes, MUST produce these artifacts (or fail):
   - dist/stats.html (bundle graph)
   - reports/frontend/PERFORMANCE_ANALYSIS.md (before/after sizes, what was code-split)
   - reports/frontend/FRONTEND_VERIFICATION_REPORT.md (Lighthouse for Dashboard/Projects/Settings/Templates with scores)
   - reports/frontend/LINT_DEBT.md updated

4) Run gates in this exact order and paste the raw summaries:
   npm run typecheck
   npm run build
   npm run size:ci
   npm run lint:new
   npm run test:foundation -- --run

5) If any gate fails, revert your last change and propose a smaller, testable step.

Definition of Done = all gates green + artifacts updated + diff touches only allowed areas.
```

## Tech-Debt Budget Policy

- **Size budget**: main bundle ≤ 700 KB uncompressed; if you add >20 KB, you must remove ≥20 KB elsewhere or lazy-load it.
- **Lint budget (legacy)**: total legacy errors must trend ↓ weekly. No PR may increase the snapshot total.
- **A11y budget**: Lighthouse A11y ≥95 on the four key pages. If a PR drops it, fix within the PR or mark as blocked.

## Allowed Areas
- `src/components/ui/**` (new UI primitives)
- `src/lib/api/**` (API client)
- `src/lib/providers/**` (React Query, etc.)
- `src/stores/**` (Zustand stores)
- `src/pages/projects/ProjectsPage.tsx`
- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/settings/SettingsPage.tsx`
- `src/pages/templates/TemplatesPage.tsx`

## Forbidden Areas
- `backend/**` or `zephix-backend/**`
- Any file outside the allowed areas (unless explicitly approved)
