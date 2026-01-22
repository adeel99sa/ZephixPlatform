# Workspace Create Interceptor Fix

## Root Cause

The `requiresWorkspaceContext` function was incorrectly blocking `/workspaces` requests because:
- It checked `p.startsWith('/work')` 
- The string `/workspaces` starts with `/work`
- This caused the interceptor to throw "Workspace required. Please select a workspace first."
- This blocked workspace creation (the first workspace can't be created if no workspace is selected)

## Fix Applied

### File: `zephix-frontend/src/services/api.ts`

**1. Fixed `requiresWorkspaceContext()` function:**
- Now explicitly excludes `/workspaces` and all `/workspaces/*` paths
- Uses `startsWithSegment()` helper to avoid false matches
- Only requires workspace context for: projects, work-items, resources, templates, dashboards
- Never requires workspace for: workspaces, admin, my-work

**2. Updated `shouldSkipWorkspaceHeader()` function:**
- Changed from `if (path === "/workspaces")` to `if (path === "/workspaces" || path.startsWith("/workspaces/"))`
- This ensures `x-workspace-id` header is never sent for workspace management endpoints

## Changes

### Before:
```typescript
function requiresWorkspaceContext(url: string): boolean {
  const p = stripApiPrefix(normalizePath(url));

  // Workspace management endpoints don't require active workspace context
  // They include workspaceId in the URL path
  if (p.startsWith('/workspaces/') && (p.includes('/members') || p.includes('/settings'))) {
    return false;
  }

  if (p.startsWith('/projects') || p.includes('/projects/')) return true;
  if (p.startsWith('/work') || p.includes('/work/')) return true;  // ❌ This matched /workspaces!
  // ...
}
```

### After:
```typescript
function requiresWorkspaceContext(url: string): boolean {
  const p = stripApiPrefix(normalizePath(url || ""));

  // Never require an active workspace for workspace directory or settings endpoints
  if (p === "/workspaces" || p.startsWith("/workspaces/")) return false;  // ✅ Explicit exclusion
  if (p.startsWith("/admin")) return false;
  if (p === "/my-work") return false;

  const startsWithSegment = (path: string, segment: string) =>
    path === `/${segment}` || path.startsWith(`/${segment}/`);

  // Only these areas require an active workspace selected in the store
  if (startsWithSegment(p, "projects")) return true;
  if (startsWithSegment(p, "work")) return true;  // ✅ Now only matches /work-items, not /workspaces
  // ...
}
```

## Testing

### Expected Flow:
1. Go to `/home`
2. Click "Create workspace" button
3. Enter workspace name
4. Click "Create" button
5. ✅ POST /api/workspaces should appear in Network tab
6. ✅ Response should include `{ data: { workspaceId: "..." } }`
7. ✅ Modal should close
8. ✅ Workspace switcher should refresh and show new workspace

### Network Verification:
- **Request:** `POST /api/workspaces` should NOT be blocked
- **Request headers:** Should NOT include `x-workspace-id` header
- **Response:** Should be `{ data: { workspaceId: "uuid" }, meta: {} }`

## Impact

This fix unblocks:
- ✅ Creating the first workspace (when no workspace is selected)
- ✅ Creating additional workspaces
- ✅ All workspace management endpoints (`/workspaces/:id/members`, `/workspaces/:id/settings`)
- ✅ Workspace directory listing (`GET /workspaces`)

## Next Steps

After this fix, if workspace creation succeeds but the sidebar doesn't refresh:
- Check `GET /api/workspaces` response format
- Verify `WorkspaceSwitcher` uses `unwrapApiData` correctly
- Share the GET response JSON for exact parsing fix
