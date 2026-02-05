# Stable Tag Checklist

**Target Tag:** `v0.5.1-stable`  
**Date:** 2026-02-05

---

## Pre-Merge Verification

### 1. TypeScript Zero Errors (PR #19)
```bash
cd zephix-frontend && npm run typecheck
# Expected: 0 errors
```

### 2. Frontend Build Clean
```bash
cd zephix-frontend && npm run build
# Expected: Build succeeds
```

### 3. Backend Build Clean
```bash
cd zephix-backend && npm run build
# Expected: Build succeeds
```

### 4. CI Status
- [ ] PR #19 CI green
- [ ] PR #20 CI green

---

## Merge Sequence

```bash
# Step 1: Merge PR #19 (typecheck-zero) first
gh pr merge 19 --squash --delete-branch

# Step 2: Merge PR #20 (release-readiness-sweep)
gh pr merge 20 --squash --delete-branch

# Step 3: Pull latest main
git checkout main
git pull origin main
```

---

## Post-Merge Smoke Test

```bash
# Backend smoke
cd zephix-backend
npm run build
npm run test

# Frontend smoke
cd ../zephix-frontend
npm run build
npm run typecheck
```

---

## Cut Stable Tag

```bash
# Only after smoke passes
git checkout main
git pull origin main
git tag -a v0.5.1-stable -m "Stable: zero TS errors, docs cleanup, guardrails"
git push origin v0.5.1-stable
```

---

## Branch Protection Rules (GitHub)

Navigate to: `Settings > Branches > Add rule`

**Branch name pattern:** `main`

**Required settings:**
- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - Required checks: `ci`, `lint`, `build`, `typecheck`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

**Optional (recommended):**
- [x] Require conversation resolution before merging
- [ ] Require signed commits (if team uses GPG)

---

## Rollback Plan

If something breaks after merge:
```bash
# Revert to last known good
git checkout v0.5.0-alpha
git checkout -b hotfix/revert-to-stable
# Fix issue
# Create PR
```

---

## Tag Naming Convention

| Tag Pattern | Meaning |
|-------------|---------|
| `vX.Y-stable` | Known-good release point |
| `vX.Y.Z-stable` | Patch to stable |
| `vX.Y-alpha` | Pre-release testing |
| `vX.Y.Z-hotfix` | Emergency fix |

---

*Checklist created: 2026-02-05*
