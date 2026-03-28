# Wave 8 — Portfolio Guard Bug (LIVE STAGING)

Verification Level: LIVE STAGING
Date: 2026-02-17
RC Tag: v0.6.0-rc.24

## Bug

All portfolio endpoints return 403 `AUTH_FORBIDDEN: Insufficient workspace permissions`
even for platform ADMIN users.

## Root Cause

`RequireWorkspaceAccessGuard` in `zephix-backend/src/modules/workspaces/guards/require-workspace-access.guard.ts`
handles three modes: `viewer`, `member`, `ownerOrAdmin`.

The portfolio controller (`zephix-backend/src/modules/portfolios/portfolios.controller.ts`)
sets `@SetMetadata('workspaceAccessMode', 'read')` on all endpoints.

`'read'` is NOT handled in the guard's switch logic. It falls through to:
```
throw new ForbiddenException('Insufficient workspace permissions');
```

## Fix

Either:
1. Change portfolio controller from `'read'` to `'viewer'` (matches guard semantics)
2. OR add `'read'` as an alias for `'viewer'` in the guard

## Proof

```
curl -s -H "Authorization: Bearer $TOKEN" \
  https://zephix-backend-v2-staging.up.railway.app/api/workspaces/$WS_ID/portfolios

Response:
{"code":"AUTH_FORBIDDEN","message":"Insufficient workspace permissions"}
HTTP: 403
```

User: demo@zephix.ai (platformRole: ADMIN)
Workspace: dfbc9223-2846-48ff-bda1-c2afc1e6e6f9
All 5 workspaces tested — same result.

## Impact

- All portfolio CRUD operations blocked
- Portfolio KPI rollup (Wave 8C) blocked
- Program endpoints likely affected (same guard pattern)
