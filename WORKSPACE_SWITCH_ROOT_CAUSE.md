# Workspace Switch Root Cause Analysis

## Phase 0: Baseline Verification

### Identified Issues

#### 1. Missing Auth Guards in WorkspaceView

**File:** `zephix-frontend/src/views/workspaces/WorkspaceView.tsx`

**Problem:**
- Component directly calls `setActiveWorkspace(id)` without checking:
  - `authLoading` state
  - `user` existence
  - `organizationId` existence
- This can cause race conditions where workspace is set before auth is ready

**Code:**
```typescript
export default function WorkspaceView() {
  const { id } = useParams();
  const { setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (id) {
      setActiveWorkspace(id); // ❌ No auth check
    }
  }, [id, setActiveWorkspace]);

  return <WorkspaceHome />; // ❌ Renders immediately, may fetch before auth ready
}
```

#### 2. No 403 Handling in WorkspaceHome

**File:** `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx`

**Problem:**
- `getWorkspace()` call can return 403 (ForbiddenException from backend)
- No explicit handling for 403 status
- Error is caught generically, may show "Something went wrong"

**Code:**
```typescript
const [w, k, p] = await Promise.all([
  getWorkspace(workspaceId), // ❌ Can throw 403, not handled
  getKpiSummary(workspaceId).catch(() => null),
  listProjects(workspaceId),
]);
```

#### 3. Backend Returns 403 Instead of { data: null }

**File:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts:99-100`

**Problem:**
- Backend throws `ForbiddenException` (403) when user can't access workspace
- This is correct for security, but frontend must handle it explicitly
- Frontend may not be catching 403 properly

**Code:**
```typescript
if (!canAccess) {
  throw new ForbiddenException('You do not have access to this workspace'); // ✅ Correct, but frontend must handle
}
```

#### 4. Missing WorkspaceId Validation

**File:** `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx:32`

**Problem:**
- Component checks `if (!workspaceId) return` but doesn't validate:
  - WorkspaceId format (UUID)
  - WorkspaceId exists in user's accessible workspaces
- If invalid workspaceId, `getWorkspace()` may return null, but UI doesn't show "Not Found" state

#### 5. Multiple Workspace Stores

**Files:**
- `zephix-frontend/src/stores/workspaceStore.ts` (Zustand with persist)
- `zephix-frontend/src/state/workspace.store.ts` (Zustand with persist)

**Problem:**
- Two different workspace stores exist
- `WorkspaceView` uses `@/state/workspace.store`
- `WorkspaceHome` uses `@/state/workspace.store`
- `WorkspaceSwitcher` components use different stores
- This can cause state desynchronization

### Failing Request Pattern

**Scenario:** User switches workspace from dropdown

1. **User clicks workspace in dropdown**
   - `WorkspaceSwitcher` calls `setCurrent(workspaceId)` or `setActiveWorkspace(workspaceId)`
   - Navigates to `/workspaces/${workspaceId}`

2. **WorkspaceView mounts**
   - Gets `id` from URL params
   - Calls `setActiveWorkspace(id)` immediately (no auth check)
   - Renders `<WorkspaceHome />`

3. **WorkspaceHome mounts**
   - Gets `workspaceId` from store
   - Checks `authLoading` (good)
   - Checks `user` (good)
   - **BUT:** If workspaceId is invalid or user doesn't have access:
     - `getWorkspace(workspaceId)` returns 403 or null
     - Error caught generically
     - May show "Something went wrong" or blank screen

### Exact Crash Point

**Most Likely:** `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx:36-40`

```typescript
const [w, k, p] = await Promise.all([
  getWorkspace(workspaceId), // ❌ If 403 or null, w is null/error
  getKpiSummary(workspaceId).catch(() => null),
  listProjects(workspaceId),
]);
setWs(w); // ❌ If w is null, ws becomes null
```

**Then at line 162:**
```typescript
<div className="text-lg font-semibold">{ws?.name || "Untitled Workspace"}</div>
```

**If `ws` is null and workspace doesn't exist:**
- UI shows "Untitled Workspace" (not ideal but not a crash)
- **BUT:** If `ws` is undefined or error object, accessing `ws?.name` may throw

### Status Codes Observed

**Expected:**
- `GET /api/workspaces/:id` → 200 with `{ data: Workspace | null }` (workspace not found)
- `GET /api/workspaces/:id` → 403 (user doesn't have access)

**Actual Behavior:**
- Backend correctly returns 403 for forbidden
- Frontend may not be handling 403 explicitly
- Frontend may be treating 403 as generic error

### RouteLogger Events

**Expected events:**
- `workspace_switch_start` - when dropdown clicked
- `workspace_switch_success` - when workspace loads
- `workspace_switch_403` - when access denied
- `workspace_switch_not_found` - when workspace doesn't exist
- `workspace_switch_error` - when other error occurs

**Current:** RouteLogger doesn't track workspace switch events (only route changes)

## Root Cause Summary

**Primary Issue:** Missing auth guards and 403 handling in workspace route components

**Secondary Issues:**
1. No validation of workspaceId before fetching
2. Generic error handling doesn't distinguish 403 from other errors
3. Multiple workspace stores may cause state desync
4. No explicit "Not Found" state for invalid workspaceId

**Fix Priority:**
1. Add auth guards to WorkspaceView
2. Add explicit 403 handling in WorkspaceHome
3. Add workspaceId validation
4. Add "Not Found" empty state
5. Add workspace switch logging to RouteLogger





