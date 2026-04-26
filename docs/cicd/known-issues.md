# CI/CD Known Issues

## Issue: Frontend typecheck errors (surfaced 2026-04-26)

### Status
Active. `c1-gates` job marked `continue-on-error: true` until fixed.

### Affected CI Job
- `ci / C1 Gates (no Docker)` - frontend typecheck step

### Errors

TypeScript errors were found when CI first ran frontend typecheck on a staging PR.
These have been silently present because Vite builds without strict type
enforcement.

#### Bug-Suspect (High Priority)
- Resolved in PR #186: `src/pages/auth/LoginPage.tsx(63,13)` referenced undefined `request`.
  - Fix: imported `request` from `@/lib/api`.
  - Impact before fix: resend-verification button could throw `ReferenceError` when clicked.

#### Type Definition Issues (Medium Priority)
- `src/features/onboarding/onboarding-route-policy.ts(1,15)`: `OnboardingStatusValue` not exported from `@/features/organizations/onboarding.api`.
- `src/routing/adminOnboardingPolicy.ts(1,15)`: same missing `OnboardingStatusValue` export.
- `src/components/layouts/DashboardLayout.tsx(28,38)`: `onboardingStatus` missing on `OrgHomeState`.
- `src/features/workspaces/dashboard/normalize.ts(53,10)`: `DashboardSummary` missing `openRiskCount`, `documentsSummary`, `upcomingMilestonesCount`.

#### Form Data Type Errors (Medium Priority)
- `src/features/administration/components/OrganizationProfileForm.tsx`: five errors on `name`, `industry`, `website`, `domain`, and `description` because form data is typed as `{}`.

#### React/Library Type Drift (Low Priority)
- `src/features/projects/columns/ColumnHeaderMenu.tsx(278,13)`: Lucide icon `title` prop not allowed.
- `src/features/projects/components/ProjectWorkToolbar.tsx(437,13)`: `RefObject<T | null>` vs `RefObject<T>` mismatch.

### Required Fix (Separate PR)

1. Run `npm run typecheck` in `zephix-frontend`.
2. Fix the remaining frontend typecheck errors file by file.
3. Once clean, remove `continue-on-error: true` from `c1-gates`.
4. Add `ci / C1 Gates (no Docker)` to branch protection required checks.

### Why Staging Likely Still Works

Vite builds without strict type enforcement. Bugs surface only when type
assumptions break at runtime, as with the LoginPage `request` reference.

### Priority

High for next session. These errors were silent because no CI was running on
staging PRs.

## Issue: CI/Railway install drift (RESOLVED 2026-04-26)

### Status
RESOLVED in PR #190 (this PR).

### Was
CI installed with dev dependencies (`npm ci`), Railway installed without (`npm ci --omit=dev`).
Two pre-existing issues silently masked by CI's looser install:
- Backend `tenant.guard.ts` typed via dev-only Express type augmentation
- Frontend `prepare: husky` ran husky binary unavailable in production install

Both fixes shipped in PR #189. This PR adds CI simulation to prevent recurrence.

### Now
Two new CI jobs added:
- `ci / Railway install simulation (backend)`
- `ci / Railway install simulation (frontend)`

Mirror Railway's exact install commands. Catches future drift at PR time.

### Action Required
After this PR merges, add both new check names to staging ruleset required checks:
- `ci / Railway install simulation (backend)`
- `ci / Railway install simulation (frontend)`
