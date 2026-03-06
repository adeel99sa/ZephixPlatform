# RBAC V2 Cleanup — Final Proof

Date: 2026-03-06
Branch: chore/mcp-and-skills
Deployment: 90e2e2a3-6b5b-4120-98cc-96ea634a95de (staging)
Pre-work SHA: afe993fdd360857c7d37a19b815fa526f4afaa8d

---

## Verification Results

### Local

| Check | Result |
|-------|--------|
| Backend `tsc --noEmit` | PASS |
| Frontend `tsc --noEmit` | PASS |
| Backend role/guard unit tests (44 tests) | PASS |
| Frontend role/access unit tests (86 tests) | PASS |
| `scripts/smoke/run.sh guard` | PASS |
| `scripts/smoke/run.sh contract-all` | PASS (exit 0) |

### Staging (deployment 90e2e2a3, commitShaTrusted=true)

| Smoke Lane | Contract Steps | Runner Result |
|------------|---------------|---------------|
| staging-onboarding | 7-step contract verified | PASS — smoke-login=204, auth/me=200 |
| org-invites | 14-step contract verified | PASS — 14 contract steps + token never written to disk |
| customer-journey | 21-step contract verified | PASS — 22 runner steps (incl. infra), token never written to disk |

Note: "contract steps" = steps enforced by `api-contract-*.sh` guards; "runner steps" = steps executed by the smoke script (may include infra steps not in contract, e.g. `set_primary_org`).

---

## Changes Summary

### Backend

**Canonical module** (`common/auth/platform-roles.ts`):
- Unified `normalizePlatformRole` — defaults to VIEWER for unknown roles (safe default)
- Added `resolvePlatformRoleFromRequestUser(user)` — reads `user.platformRole ?? user.role`
- Added `isAdminPlatformRole`, `isMemberPlatformRole`, `isViewerPlatformRole`
- Added `isAdminRole` (alias), `canCreateWorkspaces` (alias for backward compat)

**Shim** (`shared/enums/platform-roles.enum.ts`):
- Converted to re-export shim pointing to `common/auth/platform-roles.ts`
- ~45 existing imports continue to work unchanged

**Drift fixes**:
- `work-item.controller.ts`: `user.role` → `user.platformRole ?? user.role` (6 sites)
- `work-item.controller.ts`: `AdminOnlyGuard` → `PlatformAdminGuard`
- `project-clone.controller.ts`: `user.role` → `user.platformRole ?? user.role`
- `require-workspace-permission.guard.ts`: `user.role` → `user.platformRole ?? user.role`

**Workspace role**:
- `workspace-role-guard.service.ts`: writeRoles now includes `workspace_admin` alias

**Regression tests added** (`common/auth/platform-roles.spec.ts`):
- 30 tests covering all canonical module functions
- Includes privilege escalation regression: VIEWER-platformRole takes precedence over ADMIN role field

### Frontend

**Drift fixes**:
- `hooks/useAuth.ts`: `store.user.role === 'admin'` → `platformRoleFromUser(store.user) === 'ADMIN'`
- `features/budget/BudgetTab.tsx`: multi-value raw comparison → `isAdminRole(user?.platformRole ?? user?.role)`
- `features/onboarding/GuidedSetupPanel.tsx`: same fix
- `features/admin/utils/getOrgUsers.ts`: `normalizePlatformRole(user.role)` → `normalizePlatformRole(user.platformRole ?? user.role)`

**Regression tests added** (`utils/__tests__/roles.test.ts`):
- VIEWER-platformRole privilege escalation test
- null-platformRole fallback test

---

## No-Change Boundary

- DB schema unchanged (no migration)
- API response shapes unchanged
- Auth contract unchanged (`/auth/login`, `/auth/me`, `/auth/register`)
- Staging behavior identical to pre-RBAC-V2 (customer-journey 22/22 runner steps, org-invites 14/14 contract steps)
- No feature flags added or changed
- Archived components untouched
- Billing module untouched
