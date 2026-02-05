# Branch Protection Rules Setup

## Required: Contract Gate Protection

To make the contract gate the single source of truth and prevent regressions, configure GitHub branch protection rules.

### Steps to Configure

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Add or edit branch protection rule for your main branch (e.g., `main`, `master`, `sprint-1-2-foundation`)

### Required Settings

**Branch name pattern:** `main` (or your primary branch)

**Protect matching branches:**
- ✅ **Require a pull request before merging**
- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - ✅ **Status checks that are required:**
    - `contract-gate` (Contract Tests Gate)
    - `verify` (Frontend build and lint) - if available
  - ✅ **Do not allow bypassing the above settings** (no overrides, even for admins)

**Restrictions:**
- ✅ **Do not allow bypassing the above settings** (prevents admin overrides)

### Why This Matters

- **Prevents regressions:** No PR can merge if contract tests fail
- **Enforces consistency:** All hardened endpoints must maintain `{ data: ... }` format
- **No overrides:** Even admins cannot bypass the gate (prevents "just this once" exceptions)

### Alternative: Manual Enforcement

If you cannot set branch protection rules (e.g., no admin access), document this requirement in your PR template:

```markdown
## Pre-merge Checklist

- [ ] Contract tests pass: `npm run test:contracts`
- [ ] E2E admin test passes: `npm run test:e2e:admin`
- [ ] No new endpoints return raw arrays/objects (must use `formatResponse()`)
```

### Verification

After setting up branch protection:

1. Create a test PR that breaks a contract test
2. Verify the PR cannot be merged (blocked by `contract-gate`)
3. Fix the test
4. Verify the PR can now be merged

## Current CI Job

The `contract-gate` job in `.github/workflows/ci.yml` runs:
- `admin.controller.spec.ts`
- `billing.controller.spec.ts`
- `templates.controller.spec.ts`
- `workspaces.controller.spec.ts`
- `projects.controller.spec.ts`

This job **must pass** before any PR can be merged.

