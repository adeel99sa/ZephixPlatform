# Baseline Push Summary

## Branch Information
- **Branch:** `chore/hardening-baseline`
- **Base:** `release/v0.5.0-alpha`

## Commits

### Commit 1: Backend baseline locked
**Hash:** `8caa1a9`

**Changes:**
- 297 files changed, 28,388 insertions(+), 1,175 deletions(-)

**Key Deliverables:**
- ✅ Bootstrap migration (`0000000000000-InitCoreSchema.ts`) ensures core schema exists
- ✅ Template Center v1 migrations (`1769000000101-1769000000108`) gated behind core schema
- ✅ Auth context pattern enforced: `AuthRequest` + `getAuthContext()` used repo-wide
- ✅ ESLint rule at error level blocks direct `req.user` access
- ✅ Lint blocking CI: zero violations, helper files excluded
- ✅ All 34 controller files refactored to use type-safe auth context
- ✅ CI guardrails locked: lint must pass before build

### Commit 2: Frontend aligns with backend baseline
**Hash:** (to be filled after push)

**Changes:**
- Frontend API client updates
- Template Center v1 integration aligned
- Build passes

## Preflight Verification Results

### Backend
- ✅ **Build:** Passes
- ✅ **Lint:** Passes (0 req.user violations)
- ⚠️ **Tests:** Some pre-existing failures (not blocking)
- ✅ **Migrations:** Bootstrap and Template Center v1 migrations present
- ✅ **Auth Context:** `AuthRequest` and `getAuthContext` exist
- ✅ **ESLint Rule:** Error level, helper files excluded

### Frontend
- ✅ **Build:** Passes
- ⚠️ **Lint:** Pre-existing warnings (not blocking)
- ✅ **API Alignment:** Matches backend endpoints

## Railway Deployment Sequence

1. **db:fingerprint** - Verify `ballast.proxy.rlwy.net`
2. **migration:run** - Bootstrap executes first
3. **migration:run** (again) - Template Center v1 migrations execute
4. **Verification queries** - Confirm schema integrity

## CI Guardrails

- ✅ ESLint rule: Error level
- ✅ Helper exclusions: Only `get-auth-context*.ts` files
- ✅ Lint blocking: Must pass before build
- ✅ Current violations: 0

## Next Steps

1. Create PR from `chore/hardening-baseline` to `release/v0.5.0-alpha`
2. Verify CI passes (lint → build → tests)
3. Merge after review
4. Deploy to Railway following documented sequence

