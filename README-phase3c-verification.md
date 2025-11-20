# 🔐 Zephix Dashboards — Phase 3C Verification & Cutover Pack

Complete verification and deployment package for Phase 3C productionization.

## Quick Start

```bash
# Run complete verification
./verify-phase3c-master.sh

# Or run individual components
./setup-phase3c-env.sh           # Set environment variables
./verify-phase3c-complete.sh     # Run all mocked tests + checks
./verify-phase3c-real-backend.sh # Test with real backend
./manual-smoke-test.sh           # Manual verification checklist
./rollback-plan.sh               # Emergency rollback procedures
```

## Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-phase3c-env.sh` | Set environment variables | Before running any tests |
| `verify-phase3c-complete.sh` | Complete verification (mocked) | Local development, CI |
| `verify-phase3c-real-backend.sh` | Real backend testing | Staging, production |
| `manual-smoke-test.sh` | Manual verification checklist | Before production deploy |
| `rollback-plan.sh` | Emergency rollback procedures | If issues arise |
| `verify-phase3c-master.sh` | Run everything | Complete verification |

## Environment Variables

```bash
# Required for real backend testing
export VITE_API_URL="https://api.zephix.yourdomain.com"
export E2E_BASE_URL="https://app.zephix.yourdomain.com"

# Feature flags (enable per rollout plan)
export VITE_FLAGS="FF_DASHBOARD_DUPLICATE,FF_DASHBOARD_DELETE,FF_AUTOSAVE_CONFLICT_UI"
```

## Feature Flags

- `FF_DASHBOARD_DUPLICATE` - Show Duplicate button in Builder
- `FF_DASHBOARD_DELETE` - Show Delete button in Builder  
- `FF_AUTOSAVE_CONFLICT_UI` - Show conflict banner & reload button

## Verification Checklist

### Automated Tests ✅
- [ ] Phase 1-3 + 3B test suites pass
- [ ] Feature flag combinations work
- [ ] Performance optimizations verified
- [ ] Bundle size acceptable

### Manual Verification ✅
- [ ] Create dashboard → builder → add widget → autosave
- [ ] Force conflict → see conflict banner
- [ ] Duplicate → new ID → switcher shows both
- [ ] Delete → Trash → Restore → back in switcher
- [ ] Filters persist to URL and localStorage
- [ ] Export uses dashboard name
- [ ] Share visibility emits telemetry

### Backend Requirements ✅
- [ ] ETag support in PATCH endpoints
- [ ] 412 Precondition Failed on conflict
- [ ] Widget query batching
- [ ] Audit logging

## Performance Targets

- Dashboard load: <2s with 8-12 widgets
- Widget query: <300ms p95
- Export: <150ms for CSV
- Bundle size: <1MB (current: ~328KB)

## Rollback Plan

1. **Immediate**: Disable feature flags (`VITE_FLAGS=""`)
2. **If conflicts noisy**: Disable `FF_AUTOSAVE_CONFLICT_UI` only
3. **Emergency**: Revert to mocks (`VITE_API_URL="/api"`)
4. **Complete**: Git revert + redeploy

## CI Integration

Copy `.github/workflows/e2e.yml` to your repository for:
- Mocked E2E tests on every PR
- Real backend tests nightly
- Automated verification

## Backend Team Handoff

See `backend-acceptance-checklist.md` for:
- ETag implementation requirements
- API response formats
- Performance targets
- Security considerations

## PR Template

Use `PR-template-phase3c.md` for:
- Complete scope documentation
- Risk assessment
- Test plan
- Rollout strategy
- Success metrics

---

**Ready for production deployment!** 🚀
