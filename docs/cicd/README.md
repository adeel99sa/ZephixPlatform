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

## Railway Install Simulation

Two CI jobs simulate Railway's actual install behavior to catch CI/deploy drift:

### railway-install-backend
Mirrors Railway backend deploy:
- `npm ci --legacy-peer-deps --omit=dev`
- `npm run build`
- Verifies dist artifacts (main.js, canonical migration script)

### railway-install-frontend
Mirrors Railway frontend deploy:
- Step 1: `npm ci --omit=dev` (verifies prepare hook handles missing husky)
- Step 2: `npm ci --include=dev` (matches nixpacks build phase)
- Step 3: `npm run build` (verifies dist exists)

### Why These Exist

Standard CI uses `npm ci` (with all dependencies). Railway omits dev dependencies in production install paths. Two issues hidden by this drift in PR #188:

1. Backend: `tenant.guard.ts` typed `request.user` via dev-only Express type augmentation. Failed on Railway with TS2339.
2. Frontend: `package.json` ran `husky` directly in prepare hook. Failed on Railway with sh exit 127.

These jobs catch such drift at PR time instead of deploy time.

### Future Maintenance

When Railway changes its build behavior (e.g., Nixpacks to Railpack migration), update these jobs to match. The goal is exact parity between CI and Railway install/build commands.

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
