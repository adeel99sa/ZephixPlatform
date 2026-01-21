# Manual Validation Steps - Core Flow 04 & Platform Health

**Date:** 2026-01-18  
**Purpose:** Step-by-step validation with screenshot requirements

## Part A: Platform Health URLs Validation

### Steps

1. **Start frontend:**
   ```bash
   cd zephix-frontend && npm run dev
   ```

2. **Login as admin user**

3. **Navigate to `/admin/platform-health`**

4. **Open DevTools:**
   - Press F12 or Right-click → Inspect
   - Go to **Network** tab
   - Check **Preserve log**

5. **Click "Run Health Check" button**

6. **Verify request URLs in Network tab:**
   - ✅ `GET /api/workspaces`
   - ✅ `GET /api/projects`
   - ✅ `GET /api/health`
   - ✅ `GET /api/auth/me`
   - ✅ `GET /api/version`
   - ❌ **MUST NOT see `/api/api` anywhere**

### Screenshots to Capture

**Screenshot A1: Network list view**
- Show all 5 requests in Network tab
- Highlight that URLs are `/api/workspaces`, `/api/projects`, etc. (not `/api/api/...`)
- File: `proofs/platform-health-screenshot-01-network-list.png`

**Screenshot A2: Request URL detail**
- Click on one request (e.g., `/api/workspaces`)
- Show **Headers** tab
- Show **Request URL** field showing `/api/workspaces` (not `/api/api/workspaces`)
- File: `proofs/platform-health-screenshot-02-request-url.png`

---

## Part B: Create Workspace Refresh (No Reload)

### Steps (Do in ONE session, no page refresh)

1. **Clear localStorage:**
   ```javascript
   localStorage.removeItem('zephix.activeWorkspaceId');
   ```

2. **Login and land on `/home`**

3. **Open DevTools:**
   - Go to **Network** tab
   - Filter: `workspaces`
   - Check **Preserve log**

4. **Create workspace:**
   - Click **"+"** button in workspace dropdown (top of sidebar)
   - Fill in name: **"Real Workspace 01"**
   - Fill in description (optional)
   - Click **Create** or **Submit**

5. **Immediately verify in Network tab:**
   - Should see `POST /api/workspaces` request
   - Should see `GET /api/workspaces` request appear right after POST

6. **Verify UI:**
   - Dropdown should show "Real Workspace 01" without page reload
   - New workspace should be auto-selected in dropdown

7. **Verify localStorage:**
   - Go to **Application** tab in DevTools
   - Click **Local Storage** → your domain
   - Find `zephix.activeWorkspaceId`
   - Value should equal the new workspace ID

### Screenshots to Capture

**Screenshot B1: POST /api/workspaces request headers**
- Click on `POST /api/workspaces` in Network tab
- Go to **Headers** tab
- Show **Request Headers** section
- **Highlight:** `x-workspace-id` is **ABSENT**
- **Highlight:** `authorization` is **PRESENT**
- File: `proofs/core-04-screenshot-01-post-headers.png`

**Screenshot B2: GET /api/workspaces request headers (after POST)**
- Click on `GET /api/workspaces` request that appears after POST
- Go to **Headers** tab
- Show **Request Headers** section
- **Highlight:** `x-workspace-id` is **ABSENT**
- Show timestamp/order to prove it appears immediately after POST
- File: `proofs/core-04-screenshot-02-get-headers.png`

**Screenshot B3: Sidebar dropdown showing new workspace**
- Show sidebar with workspace dropdown open or visible
- Show "Real Workspace 01" in the dropdown list
- Show it's selected/active (highlighted or shown in select value)
- File: `proofs/core-04-screenshot-03-dropdown.png`

**Screenshot B4: Local Storage verification**
- DevTools → **Application** tab
- **Local Storage** → your domain
- Show `zephix.activeWorkspaceId` key
- Show value equals the new workspace ID (UUID)
- File: `proofs/core-04-screenshot-04-localstorage.png`

---

## After Screenshots Captured

### Update Core Flow 04 Proof File

1. **Add screenshots to `proofs/core-04-create-workspace.md`:**
   - Insert screenshots in the "Proof Pending" section
   - Mark all 4 checkboxes as complete

2. **Add observed results:**
   - Dropdown refreshed without reload ✅
   - localStorage updated to new workspace ID ✅

3. **Update status:**
   - Change `Status: ⚠️ IN PROGRESS` → `Status: ✅ PASS`
   - Add commit hash that contains the refreshNonce changes

### Update Execution Board

1. **In `docs/PLATFORM_EXECUTION_BOARD.md`:**
   - Change Core Flow 04 status: `⚠️ In Progress` → `✅ Done`
   - Add commit hash
   - Update Proof column: `Pending` → `Attached in core-04 file`

---

## What to Look For

### ✅ Success Indicators

- Platform Health: All requests hit `/api/*` (not `/api/api/*`)
- Workspace Create: POST headers show no `x-workspace-id`, has `authorization`
- Workspace Create: GET appears immediately after POST, no `x-workspace-id`
- UI: Dropdown shows new workspace without page reload
- Storage: `zephix.activeWorkspaceId` equals new workspace ID

### ❌ Failure Indicators

- Platform Health: Any request shows `/api/api/*` in URL
- Workspace Create: POST headers show `x-workspace-id` present
- Workspace Create: GET does not appear after POST
- UI: Dropdown does not show new workspace (requires reload)
- Storage: `zephix.activeWorkspaceId` does not match new workspace ID

---

## Troubleshooting

### If Platform Health shows `/api/api/*`:

1. Open `zephix-frontend/src/pages/admin/PlatformHealthPage.tsx`
2. Check `CORE_FLOWS` array
3. Endpoints should be: `/workspaces`, `/projects`, `/health`, `/auth/me`
4. Should NOT be: `/api/workspaces`, `/api/projects`, etc.

### If workspace dropdown doesn't refresh:

1. Check `zephix-frontend/src/state/workspace.store.ts` has `bumpRefreshNonce`
2. Check `WorkspaceSwitcher.tsx` has `refreshNonce` in `useEffect` dependencies
3. Check `Sidebar.tsx` calls `bumpRefreshNonce()` in `handleWorkspaceCreated`

---

**Ready for validation** ✅

Capture all screenshots, then update proof files and execution board.
