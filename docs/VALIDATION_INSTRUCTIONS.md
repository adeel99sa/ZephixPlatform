# Validation Instructions - Core Flow 04 & Platform Health

**Date:** 2026-01-18  
**Purpose:** Manual validation steps to verify fixes

## Validation 1: Platform Health Page URLs

### Steps

1. Start frontend: `cd zephix-frontend && npm run dev`
2. Login as admin user
3. Navigate to `/admin/platform-health`
4. Open DevTools → Network tab
5. Click "Run Health Check" button
6. Verify requests hit these exact paths (no `/api/api`):

### Expected Network Requests

- ✅ `GET /api/workspaces` (not `/api/api/workspaces`)
- ✅ `GET /api/projects` (not `/api/api/projects`)
- ✅ `GET /api/health` (not `/api/api/health`)
- ✅ `GET /api/auth/me` (not `/api/api/auth/me`)
- ✅ `GET /api/version` (not `/api/api/version`)

### If You See `/api/api` Anywhere

**Rollback and recheck:**
1. Open `zephix-frontend/src/pages/admin/PlatformHealthPage.tsx`
2. Verify `CORE_FLOWS` endpoints do NOT include `/api` prefix
3. Should be: `/workspaces`, `/projects`, `/health`, `/auth/me`
4. NOT: `/api/workspaces`, `/api/projects`, etc.

---

## Validation 2: Workspace Create Refresh (No Reload)

### Steps (Do in ONE session, no refresh)

1. **Clear localStorage:**
   ```javascript
   localStorage.removeItem('zephix.activeWorkspaceId');
   ```

2. **Login and land on `/home`**

3. **Open Network tab:**
   - Check "Preserve log"
   - Filter: `workspaces`

4. **Create workspace:**
   - Click "+" button in workspace dropdown
   - Fill in name: "Real Workspace 01"
   - Submit form

5. **Verify in Network tab:**

   **POST /api/workspaces request headers:**
   - ✅ `x-workspace-id` **ABSENT**
   - ✅ `authorization` **PRESENT**

   **GET /api/workspaces request (after create):**
   - ✅ Must appear immediately after POST success
   - ✅ `x-workspace-id` **ABSENT**

6. **Verify UI:**
   - ✅ Dropdown list includes "Real Workspace 01" without page reload
   - ✅ New workspace auto-selected in dropdown

7. **Verify localStorage:**
   ```javascript
   localStorage.getItem('zephix.activeWorkspaceId')
   // Should equal the new workspace ID
   ```

### If Any Check Fails

**Files to verify:**
1. `zephix-frontend/src/state/workspace.store.ts`
   - Has `refreshNonce: number`
   - Has `bumpRefreshNonce: () => void`

2. `zephix-frontend/src/components/workspace/WorkspaceSwitcher.tsx`
   - `useEffect` dependency includes `refreshNonce`
   - Dependency array: `[user?.id, refreshNonce]`

3. `zephix-frontend/src/components/shell/Sidebar.tsx`
   - `handleWorkspaceCreated` calls `bumpRefreshNonce()`

---

## Screenshot Requirements

For Core Flow 04 proof, capture:

1. **POST /api/workspaces Request Headers:**
   - Show Headers tab in Network panel
   - Highlight: `x-workspace-id` absent, `authorization` present

2. **GET /api/workspaces Request Headers (after create):**
   - Show Headers tab in Network panel
   - Highlight: `x-workspace-id` absent
   - Show it appears immediately after POST

3. **Dropdown showing new workspace:**
   - Screenshot of sidebar with "Real Workspace 01" in dropdown

4. **localStorage verification:**
   - DevTools → Application → Local Storage
   - Show `zephix.activeWorkspaceId` equals new workspace ID

---

## Next: Core Flow 05 - Create Project

After Core Flow 04 is verified, next work:

**Epic:** Core Flow 05 - Create Project

**Requirements:**
- Replace placeholder Projects page
- If no workspace selected: show inline empty state
- If workspace selected: list projects from `GET /projects`
- Create project via `POST /projects`
- All project calls must include `x-workspace-id` header
- Proof: Network headers for GET and POST show `x-workspace-id`

**Files to update:**
- `zephix-frontend/src/pages/projects/ProjectsPage.tsx` (already exists, needs API client update)
- May need to update to use `api` from `@/services/api` instead of `apiClient`
