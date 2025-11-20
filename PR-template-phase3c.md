# Phase 3C — Productionization & Backend Integration

## Scope

- **Env-driven API baseURL** (`VITE_API_URL`), response envelope unwrapping
- **ETag/`If-Match` autosave** with conflict UI + reload functionality
- **Delete/Restore toasts** + telemetry; Duplicate gated by flags
- **Widget formatting utils**; ErrorBoundary for shell protection
- **Feature flags**: `FF_DASHBOARD_DUPLICATE`, `FF_DASHBOARD_DELETE`, `FF_AUTOSAVE_CONFLICT_UI`
- **E2E config** for mocked vs. real auth (`E2E_REAL`, storageState)

## Risk Assessment

- **Medium**: Backend must return `ETag` and honor `If-Match` headers
- **Low with flags**: Duplicate/delete/conflict UI are switchable via feature flags
- **Low**: All changes are backward compatible with existing mocks

## Test Plan

### Automated Tests
- [ ] `npx playwright test` (mocked): all suites green
- [ ] Real smoke: `E2E_REAL=true … npx playwright test -g "postlogin"`
- [ ] Feature flag combinations tested
- [ ] Performance spot-checks passed

### Manual Verification
- [ ] Create dashboard → builder opens → add Note → autosave → "saved"
- [ ] Force conflict: two tabs editing → second sees "conflict" banner
- [ ] Duplicate → lands on new ID, switcher lists both
- [ ] Delete → Trash → Restore → shows back in switcher
- [ ] Filters persist to URL and localStorage
- [ ] Export filename uses dashboard name
- [ ] Share visibility changes emit telemetry

## Rollout Strategy

### Phase 1: Canary (Recommended)
- Enable all flags in canary workspace
- Monitor autosave error/412 rate
- Watch widget query p95 latency
- Verify export success rate

### Phase 2: Production
- Enable `FF_DASHBOARD_DELETE` + `FF_DASHBOARD_DUPLICATE`
- Keep `FF_AUTOSAVE_CONFLICT_UI` ON (surfacing conflicts early is safer)
- Monitor error rates and user feedback

## Backend Dependencies

- [ ] ETag support in `PATCH /api/dashboards/:id`
- [ ] 412 Precondition Failed on ETag mismatch
- [ ] Widget query batching in `POST /api/widgets/query`
- [ ] Audit logging for write operations

## Performance Targets

- Dashboard load: <2s with 8-12 widgets
- Widget query: <300ms p95
- Export: <150ms for CSV generation
- Bundle size: <1MB (current: ~328KB)

## Rollback Plan

1. **Immediate**: Disable feature flags (`VITE_FLAGS=""`)
2. **If conflicts noisy**: Disable `FF_AUTOSAVE_CONFLICT_UI` only
3. **Emergency**: Revert to mocks (`VITE_API_URL="/api"`)
4. **Complete**: Git revert + redeploy

## Files Changed

### Core Implementation
- `src/lib/api.ts` - Environment-driven baseURL + envelope unwrapping
- `src/features/dashboards/useAutosave.ts` - ETag conflict handling
- `src/views/dashboards/Builder.tsx` - Conflict UI + feature flags
- `src/features/dashboards/widgets/format.ts` - Widget formatting utilities
- `src/components/system/ErrorBoundary.tsx` - Shell protection

### Testing & Verification
- `tests/utils/auth.setup.ts` - Real auth storage state
- `playwright.config.ts` - Mocked vs real auth configuration
- `.github/workflows/e2e.yml` - CI matrix for mocked + real tests

### Scripts & Documentation
- `verify-phase3c-complete.sh` - Complete verification script
- `verify-phase3c-real-backend.sh` - Real backend testing
- `manual-smoke-test.sh` - Manual verification checklist
- `rollback-plan.sh` - Emergency rollback procedures
- `backend-acceptance-checklist.md` - Backend team requirements

## Deployment Checklist

- [ ] Backend ETag support implemented
- [ ] Feature flags configured in environment
- [ ] Real backend URL configured
- [ ] Auth storage state generated
- [ ] All verification scripts pass
- [ ] Manual smoke test completed
- [ ] Monitoring dashboards updated
- [ ] Team notified of deployment

## Success Metrics

- [ ] Zero increase in error rates
- [ ] Autosave conflict rate <5%
- [ ] Widget query p95 <300ms
- [ ] Export success rate >99%
- [ ] User feedback positive
- [ ] No rollback required within 24h
