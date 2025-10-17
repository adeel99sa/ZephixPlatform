# Sprint 1–2: Frontend Foundation, Performance & Guardrails

## Summary
Modern UI component library, React Query + Zustand state, hardened API client with JWT, route/component code-splitting, accessibility primitives, and a comprehensive guardrail system (size budgets, PR evidence policy, debt tracking).

## Quality Gates (new code)
- Build: ✅ pass
- TypeScript: ✅ strict mode
- Size budget: ✅ under limit (main bundle ~496kB; brotli ~155kB)
- Lint (new code): ✅ 0 errors (warnings allowed)
- Tests (foundation): ✅ green

## Evidence Artifacts
- Bundle analysis: `dist/stats.html`
- Performance report: `reports/frontend/PERFORMANCE_ANALYSIS.md`
- Verification (incl. Lighthouse): `reports/frontend/FRONTEND_VERIFICATION_REPORT.md`
- Lint debt tracking: `reports/frontend/LINT_DEBT.md`
- Debt snapshots: `reports/frontend/DEBT_SNAPSHOTS/`

## Guardrails Added
- **Size limits** enforced in CI (budget 700kB)
- **Danger rules**: evidence required for UI changes; prevent backend file edits
- **CODEOWNERS**: architect approval required
- **Pre-commit**: lint/test on touched files
- **Debt tracking**: nightly snapshots + compare

## Scope
- Components: Button, Card, Input, PageHeader, EmptyState, ErrorBanner, Skeleton, DataTable, Select, Textarea, Checkbox, Radio, Switch, DatePicker, FormField, FormGroup, Modal, Drawer, Tabs, Pagination
- Pages refactored: Projects → DataTable, Templates → DataTable, Settings → new form primitives
- Infra: API client + interceptors; React Query Provider; Zustand stores

## Non-Blocking Known Debt (tracked)
- Legacy ESLint errors & tests isolated in `lint:legacy` / `test:legacy`
- Burn-down plan in `LINT_DEBT.md`

## Risk & Rollback
- No backend contract changes
- UI-only; revert this PR to roll back

## Ask
- [ ] Architect review (CODEOWNERS)
- [ ] Approve merge to `main`