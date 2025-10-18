# PR Verification Checklist

## Required Checks (All Must Pass ✅)
- [ ] `npm run typecheck` (new code paths) ✅
- [ ] `npm run build` ✅
- [ ] `npm run size:ci` (Brotli) ✅
- [ ] `npm run lint:new` (0 errors) ✅
- [ ] `npm run test:foundation` ✅
- [ ] `npm run security:check` (gitleaks + npm audit) ✅
- [ ] `npm run dead-code:check` (ts-prune + knip) ✅
- [ ] `npm run lint:diff` (no new any/unused vars) ✅

## Evidence Artifacts (All Present ✅)
- [ ] `dist/stats.html` (bundle treemap) ✅
- [ ] `reports/frontend/PERFORMANCE_ANALYSIS.md` ✅
- [ ] `reports/frontend/FRONTEND_VERIFICATION_REPORT.md` ✅
- [ ] `reports/frontend/LINT_DEBT.md` ✅
- [ ] `reports/debt/debt-*.json` (latest snapshot) ✅

## Scope Sanity (All Clean ✅)
- [ ] No backend diffs ✅
- [ ] No rule downgrades ✅
- [ ] Heavy deps are lazy-loaded ✅
- [ ] No large static assets without lazy loading ✅

## A11y Spot Checks (All Working ✅)
- [ ] Skip-to-content link works ✅
- [ ] Modal/Drawer focus trap ✅
- [ ] DataTable keyboard sortable ✅
- [ ] `aria-live="polite"` for loading/errors ✅
- [ ] Form labels properly associated ✅

## Security (All Clean ✅)
- [ ] No secrets in code ✅
- [ ] Gitleaks scan passed ✅
- [ ] License compliance verified ✅
- [ ] No vulnerable dependencies ✅

## Performance (All Targets Met ✅)
- [ ] Main bundle < 700 kB ✅
- [ ] Brotli compression < 250 kB ✅
- [ ] Lazy loading implemented ✅
- [ ] Code splitting working ✅

---

**Status: ✅ READY TO MERGE**
