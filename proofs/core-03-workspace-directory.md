# Core Flow 03: Workspace Directory

**Status:** ✅ PASS  
**Last Verified:** 2026-01-18

## Steps

1. Login as any role
2. Verify workspace dropdown in sidebar
3. Click dropdown to see workspace list
4. Verify list matches `GET /api/workspaces` response
5. Select a workspace
6. Verify `zephix.activeWorkspaceId` updates in localStorage

## Expected Result

- Workspace dropdown visible in sidebar
- Dropdown shows only workspaces from `GET /api/workspaces`
- No local mocks or test workspaces
- Selecting workspace updates `zephix.activeWorkspaceId`
- No hard refresh or navigation away from current route
- `GET /api/workspaces` does NOT include `x-workspace-id` header

## Actual Result

✅ **PASS** - Workspace dropdown works, uses API, updates storage correctly

## Proof

- **Component:** `WorkspaceSwitcher` in sidebar
- **API:** Uses `api.get("/workspaces")` from `src/services/api.ts`
- **Storage:** Updates `zephix.activeWorkspaceId` only
- **Header:** No `x-workspace-id` sent to `/api/workspaces`
- **Fix:** Workspace directory implementation (2025-01-27)

## Notes

- Single API client used (`src/services/api.ts`)
- No `fetch()` calls in `WorkspaceSwitcher`
- No `window.location.href` navigation
- Workspace list filtered by tenant context and `deletedAt IS NULL`
