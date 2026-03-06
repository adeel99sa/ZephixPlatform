# RBAC Role System Stabilization — Proof Artifact

**result:** PASS
**date:** 2026-03-06
**commit_sha:** e659d2ee2ac573def94c5b4e4b5d757d8422957a
**branch:** chore/mcp-and-skills
**smoke_lane:** ui-acceptance 15/15 PASS

---

## Smoke Test Results

```
UI acceptance lane: PASS
15 passed (58.8s)

  ✓  1  00-preflight: version endpoint returns commitShaTrusted=true and env=staging
  ✓  2  00b-preflight: health/ready returns 200
  ✓  3  10-signup: signup page renders with all required input fields
  ✓  4  11-login-owner: create admin org via API, smoke-login, assert /auth/me 200
  ✓  5  12-create-workspace: create first workspace via UI form
  ✓  6  13-14-portfolio-program: create portfolio + program
  ✓  7  15-create-project: create project via API, navigate to /projects
  ✓  8  17-create-task-board: create task, board page loads without 500
  ✓  9  18-invite-user: /admin/invite accessible for admin without 403
  ✓ 10  19-register-invitees: create member + viewer invites, register both
  ✓ 11  20-accept-invite: member accepts invite via UI with token from token bridge
  ✓ 12  20b-accept-viewer-invite: viewer accepts invite via UI with token bridge
  ✓ 13  21-rbac-viewer: viewer cannot access /admin, /templates, or /workspaces/:id/members
  ✓ 14  22-rbac-member: member cannot access /admin or /billing, can access /projects
  ✓ 15  final: mark run PASS
```

---

## Unit Tests (RBAC Guards)

**Test suites: 3 passed | Tests: 27 passed**

```
PASS  require-org-role.guard.spec.ts         15/15
PASS  require-workspace-role.guard.spec.ts    6/6
PASS  require-project-workspace-role.guard.spec.ts  6/6
```

---

## Files Changed

### Backend — New Files
| File | Purpose |
|------|---------|
| `src/common/auth/platform-roles.ts` | Canonical PlatformRole enum + normalizePlatformRole() returning null for unknown |
| `src/common/auth/platform-admin.guard.ts` | Consolidated PlatformAdminGuard replacing fragmented admin guards |
| `src/modules/workspaces/guards/require-workspace-role.guard.spec.ts` | New guard tests |
| `src/modules/projects/guards/require-project-workspace-role.guard.spec.ts` | New guard tests |

### Backend — Modified Files
| File | Change |
|------|--------|
| `src/modules/workspaces/guards/require-org-role.guard.ts` | Fixed: `normalizePlatformRole(user.platformRole ?? user.role)` + debug logging |
| `src/modules/workspaces/guards/require-workspace-role.guard.ts` | Fixed: `normalizePlatformRole(user.platformRole ?? userRole)` + debug logging |
| `src/modules/projects/guards/require-project-workspace-role.guard.ts` | Fixed: admin check uses `normalizePlatformRole(user.platformRole ?? userRole) === PlatformRole.ADMIN` + debug logging |
| `src/admin/guards/admin.guard.ts` | Fixed: removed `user.email === 'admin@zephix.ai'` bypass + redundant role checks |
| `src/modules/auth/guards/admin.guard.ts` | Fixed: replaced `user.role === 'admin'` with normalizePlatformRole check |
| `src/modules/workspaces/entities/workspace.entity.ts` | Added `workspace_admin` as canonical alias for `workspace_owner` + `normalizeWorkspaceRole()` |
| `src/modules/workspace-access/workspace-access.service.ts` | Added `workspace_admin: 4` to role hierarchy Record |
| `src/config/feature-flags.config.ts` | Added comment documenting manual Railway staging activation for ZEPHIX_WS_MEMBERSHIP_V1 |
| `src/modules/workspaces/guards/require-org-role.guard.spec.ts` | Updated: import from `common/auth/platform-roles`, added platformRole precedence tests |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `src/hooks/useWorkspacePermissions.ts` | Fixed: `normalizePlatformRole(user.platformRole ?? user.role)` instead of `user.role` only |

### Documentation — New Files
| File | Purpose |
|------|---------|
| `docs/architecture/RBAC_ROLE_SYSTEM_V1.md` | Full RBAC architecture: roles, guards, guard order, permission matrix, bugs fixed |

---

## Guards Fixed

| Guard | Bug | Fix |
|-------|-----|-----|
| `RequireOrgRoleGuard` | Read `user.role` (always ADMIN for all registered users) | `user.platformRole ?? user.role` |
| `RequireWorkspaceRoleGuard` | Read `user.role` (always ADMIN) | `user.platformRole ?? user.role` |
| `RequireProjectWorkspaceRoleGuard` | Admin check: `userRole === 'admin' \|\| userRole === 'owner'` | `normalizePlatformRole(user.platformRole ?? userRole) === ADMIN` |
| `admin/guards/admin.guard.ts` | Email hardcode bypass + redundant legacy checks | Removed email bypass, use `normalizePlatformRole` only |
| `modules/auth/guards/admin.guard.ts` | Legacy string only: `user.role === 'admin'` | `normalizePlatformRole(user.platformRole ?? user.role) === ADMIN` |
| Frontend `useWorkspacePermissions` | Read `user.role` instead of `user.platformRole` | `user.platformRole ?? user.role` |

---

## Pending Manual Action

**Enable workspace RBAC in staging:**
```
Railway → zephix-backend-staging → Variables → ZEPHIX_WS_MEMBERSHIP_V1=1
```

Safe to enable after this commit is deployed. Admin users bypass membership checks via admin override. Smoke tests will continue to pass with the flag enabled.

---

## What Was NOT Changed

- No database schema changes
- No API contract changes
- No legacy role enum removal
- No DB values changed
- `ZEPHIX_WS_MEMBERSHIP_V1` not enabled by default
- All 15 UI acceptance smoke tests continue to pass
