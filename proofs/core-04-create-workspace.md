# Core Flow 04: Create Workspace

**Status:** ⚠️ IN PROGRESS  
**Last Verified:** 2026-01-18

## Steps

1. Click "+" button in workspace dropdown (admin only)
2. `WorkspaceCreateModal` opens
3. Fill in workspace name and description
4. Submit form
5. Verify workspace created in backend
6. Verify dropdown refreshes and shows new workspace
7. Verify `zephix.activeWorkspaceId` updates to new workspace
8. Verify no hard refresh occurs

## Expected Result

- Modal opens from "+" button
- Form submission creates workspace via `POST /api/workspaces`
- Dropdown refreshes and shows new workspace
- New workspace auto-selected
- `zephix.activeWorkspaceId` updates
- No hard refresh or page navigation
- `GET /api/workspaces` response includes new workspace
- No `x-workspace-id` header on workspace creation call

## Actual Result

⚠️ **IN PROGRESS** - Code implementation complete, awaiting manual verification with screenshots

## Proof Pending

**Screenshots Required:**

- [ ] **Screenshot 1:** POST /api/workspaces request headers
  - Show `x-workspace-id` **ABSENT**
  - Show `authorization` **PRESENT**
  - File: `proofs/core-04-screenshot-01-post-headers.png`

- [ ] **Screenshot 2:** GET /api/workspaces request headers (immediately after POST)
  - Show `x-workspace-id` **ABSENT**
  - Show request appears right after POST success
  - File: `proofs/core-04-screenshot-02-get-headers.png`

- [ ] **Screenshot 3:** Sidebar dropdown showing "Real Workspace 01" selected
  - Show dropdown with new workspace visible
  - Show workspace is selected/active
  - File: `proofs/core-04-screenshot-03-dropdown.png`

- [ ] **Screenshot 4:** DevTools Application tab, Local Storage
  - Show `zephix.activeWorkspaceId` key
  - Show value equals the new workspace ID
  - File: `proofs/core-04-screenshot-04-localstorage.png`

## Code Implementation

- **Component:** `WorkspaceCreateModal` exists
- **Integration:** `WorkspaceSwitcher` calls `onCreateWorkspace?.()`
- **API:** `POST /api/workspaces` endpoint exists
- **Refresh Mechanism:** `refreshNonce` in workspace store triggers dropdown refresh

### Files Updated

1. `zephix-frontend/src/state/workspace.store.ts`
   - Added `refreshNonce: number` to state
   - Added `bumpRefreshNonce: () => void` method

2. `zephix-frontend/src/components/workspace/WorkspaceSwitcher.tsx`
   - Added `refreshNonce` to `useEffect` dependencies
   - Refetches workspaces when `refreshNonce` changes

3. `zephix-frontend/src/components/shell/Sidebar.tsx`
   - `handleWorkspaceCreated` calls `bumpRefreshNonce()` after creation

## Notes

- Modal triggered from `WorkspaceSwitcher` "+" button
- No routing to `/workspaces/new`
- Uses SPA navigation only
- Refresh happens automatically via `refreshNonce` signal

## Manual Validation Steps

1. Clear `localStorage.removeItem('zephix.activeWorkspaceId')`
2. Login, land on `/home`
3. Open Network tab, filter: `workspaces`, preserve log
4. Click "+" in workspace dropdown
5. Create workspace: "Real Workspace 01"
6. Capture all 4 screenshots above
7. Verify dropdown shows new workspace without reload
8. Verify localStorage contains new workspace ID
