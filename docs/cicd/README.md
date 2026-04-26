# CI/CD Pipeline

## Workflow responsibilities

### ci.yml (PR gate)
Runs on pull requests to staging, main, develop.
Owns lint, typecheck, build, and gating tests.
Required for PR merges (once branch protection is enabled).

### enterprise-ci.yml (nightly + deploy)
Runs on:
- Push to main, develop, feature/*
- Tag pushes (v*)
- Nightly schedule
- Manual dispatch

Owns deploy workflows, security scans, performance tests, and broader CI.
Does NOT run on PRs (avoids duplicate runs with ci.yml).

### staging-smoke-lane.yml
Smoke tests against staging environment. Separate from PR gate.

### schema-parity.yml
Nightly database schema verification. Compliance check.

### release.yml
Manual release builds and GitHub release creation.

### architecture-inventory.yml
Generates architecture inventory artifacts on main branch changes.

## Branch protection setup (manual)

After this PR merges, configure branch protection on staging:

1. https://github.com/adeel99sa/ZephixPlatform/settings/branches
2. Add rule for branch pattern: `staging`
3. Enable "Require status checks to pass before merging"
4. Add required checks (search for these names from ci.yml jobs):
   - The job names from ci.yml that should be required
   - (Run a test PR first to see exact check names that appear)
5. Allow admin bypass for emergencies
6. Save

## Local verification before push

Backend:
```
cd zephix-backend
npm run lint
npm run typecheck (if available) or npx tsc --noEmit
npm test
```

Frontend:
```
cd zephix-frontend
npm run lint
npm run typecheck
npm run build
npm run test:run
```
