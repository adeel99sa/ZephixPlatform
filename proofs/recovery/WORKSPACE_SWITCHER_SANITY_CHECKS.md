# WorkspaceSwitcher Sanity Checks & Verification

**Date:** 2025-01-27  
**Status:** ✅ Rules Updated, Ready for Manual Verification

## Rule Update Complete

Added to `.cursor/rules/20-zephix-frontend.mdc`:

### Workspace list source of truth
- Workspaces shown in dropdown must come from GET /api/workspaces only
- Do not create local test workspaces in UI code
- Do not sort or filter out server results unless product explicitly requires it

## Code Verification Results

### ✅ WorkspaceSwitcher Uses Single API Client
**File:** `zephix-frontend/src/components/workspace/WorkspaceSwitcher.tsx`
- Uses `api.get("/workspaces")` from `@/services/api`
- No `fetch()` calls
- No manual Authorization headers
- All interceptors apply automatically

### ✅ No Forbidden localStorage Keys
```bash
grep -r "localStorage.*(activeWorkspaceId|zephix.lastWorkspaceId|workspace-storage)" zephix-frontend/src
# Result: No matches ✅
```

### ✅ API Client Status
**Single source:** `zephix-frontend/src/services/api.ts` ✅
**Legacy file found:** `zephix-frontend/src/services/auth.interceptor.ts`
- Need to verify if this is still imported/used
- If unused, should be removed to prevent confusion

## Manual Sanity Checks (Run These Now)

### 1. Clean State Test
**Steps:**
1. Open DevTools → Application → Local Storage
2. Delete `zephix.activeWorkspaceId`
3. Refresh page
4. Login

**Expected:**
- ✅ Login lands on `/home`
- ✅ Sidebar shows workspace dropdown
- ✅ First workspace auto-selects and persists

### 2. Workspace Header Behavior
**Steps:**
1. Open Network tab in DevTools
2. Select a workspace from dropdown
3. Click "Projects" in sidebar

**Expected:**
- ✅ Requests to `/api/projects/*` include `x-workspace-id` header
- ✅ Requests to `/api/auth/*` do NOT include `x-workspace-id` header

**Verify in Network tab:**
- Click on a projects request → Headers → Request Headers
- Should see: `x-workspace-id: <workspace-id>`
- Click on an auth request (if any) → Headers → Request Headers
- Should NOT see `x-workspace-id`

### 3. Modal Flow
**Steps:**
1. Click `+` button in workspace switcher (admin only)
2. Create a new workspace in the modal
3. Submit

**Expected:**
- ✅ Modal closes automatically
- ✅ New workspace appears in dropdown
- ✅ `zephix.activeWorkspaceId` updates to new workspace id
- ✅ Active workspace switches to the newly created one

## Remaining Risks to Watch

### 1. New Axios Instances
**Rule:** Only one HTTP client instance allowed for app APIs
**Evidence required:** `grep -r "axios.create(" src` shows only one instance (excluding tests)

**Current status:**
- ✅ Main client: `src/services/api.ts`
- ⚠️ Legacy: `src/services/auth.interceptor.ts` (needs verification if used)

### 2. Legacy Storage Reads
**Rule:** No reads/writes of `activeWorkspaceId`, `zephix.lastWorkspaceId`, `workspace-storage`
**Evidence:** ✅ No matches found in codebase

## Network Headers Verification

To verify header behavior, check Network tab:

**Projects Request:**
```
GET /api/projects?workspaceId=...
Headers:
  Authorization: Bearer <token>
  x-workspace-id: <workspace-id>  ← Should be present
```

**Auth Request:**
```
GET /api/auth/me
Headers:
  Authorization: Bearer <token>
  ← x-workspace-id should NOT be present
```

## Next Steps

1. Run manual sanity checks above
2. Take screenshots of Network headers for:
   - One projects request (should have `x-workspace-id`)
   - One auth request (should NOT have `x-workspace-id`)
3. Verify `auth.interceptor.ts` is unused and can be removed
4. Confirm all three sanity checks pass

---

**Status:** Rules updated, code verified, ready for manual testing ✅
