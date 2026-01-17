# Routing Lockdown - Manual Proof Test Runbook

## Prerequisites

1. **Backend running**: `cd zephix-backend && npm run start:dev`
2. **Frontend running**: `cd zephix-frontend && npm run dev`
3. **Test credentials**:
   - Admin: `admin@zephix.ai` / `admin123456`
   - Member: `member@zephix.ai` / `member123456`
4. **Browser DevTools**: Open Network tab, enable "Preserve log", disable cache

## Test Steps

### Step 1: Admin Login Landing

**Actions:**
1. Navigate to `http://localhost:5173/login`
2. Enter admin credentials: `admin@zephix.ai` / `admin123456`
3. Click "Sign In Securely"
4. Wait for redirect

**Expected:**
- ✅ URL is `/admin/overview`
- ✅ No workspace page loads
- ✅ `activeWorkspaceId` is null (check in React DevTools or console: `window.__ZEPHIX_STORE__?.getState()?.workspaceStore?.activeWorkspaceId`)

**Capture:**
- Screenshot: `step-1-admin-landing.png` (showing URL bar and page)
- Network: Filter for `/api/auth/me`, capture request headers
  - Must include: `Authorization: Bearer <token>`
  - Must NOT include: `x-workspace-id` header

**File names:**
- `step-1-admin-landing.png`
- `step-1-auth-me-headers.txt`

---

### Step 2: Member Login Landing

**Actions:**
1. Logout (click profile dropdown → Logout)
2. Navigate to `/login`
3. Enter member credentials: `member@zephix.ai` / `member123456`
4. Click "Sign In Securely"
5. Wait for redirect

**Expected:**
- ✅ URL is `/home`
- ✅ `activeWorkspaceId` is null

**Capture:**
- Screenshot: `step-2-member-landing.png`
- Network: Filter for `/api/auth/me`, capture request headers
  - Must include: `Authorization: Bearer <token>`
  - Must NOT include: `x-workspace-id` header

**File names:**
- `step-2-member-landing.png`
- `step-2-auth-me-headers.txt`

---

### Step 3: Deep Link Unauthenticated

**Actions:**
1. Open incognito/private window
2. Navigate to `/w/<slug>` (replace `<slug>` with an actual workspace slug from your database)
   - If you don't know a slug, first login as admin, create a workspace, note the slug
3. Observe redirect
4. Login with any valid credentials
5. Observe final URL

**Expected:**
- ✅ Redirect to `/login?redirect=%2Fw%2F<slug>%2Fhome` (URL encoded)
- ✅ After login, lands on `/w/<slug>/home`

**Capture:**
- Screenshot: `step-3-redirect-url.png` (showing login page with redirect param in URL)
- Screenshot: `step-3-after-login.png` (showing final `/w/<slug>/home` page)

**File names:**
- `step-3-redirect-url.png`
- `step-3-after-login.png`

---

### Step 4: Legacy Redirect with Query and Subpath

**Actions:**
1. Find a workspace UUID (from database or from a workspace you created)
2. Navigate to `/workspaces/<uuid>/members?x=1` (replace `<uuid>` with actual UUID)
3. Observe redirect

**Expected:**
- ✅ One call to `GET /api/workspaces/<uuid>/resolve-slug`
- ✅ Final URL: `/w/<slug>/members?x=1` (query param preserved)

**Capture:**
- Screenshot: `step-4-final-url.png` (showing final URL in address bar)
- Network: Filter for `resolve-slug`, capture response
  - Response should be: `{ data: { id: "<uuid>", slug: "<slug>" }, meta: ... }`

**File names:**
- `step-4-final-url.png`
- `step-4-resolve-slug-response.json`

---

### Step 5: Sidebar Selection

**Actions:**
1. From `/home`, open workspace dropdown in sidebar
2. Select a workspace
3. Observe navigation

**Expected:**
- ✅ URL: `/w/<slug>/home`

**Capture:**
- Screenshot: `step-5-workspace-selected.png` (showing URL and workspace page)

**File names:**
- `step-5-workspace-selected.png`

---

### Step 6: Context Clearing

**Actions:**
1. From `/w/<slug>/home`, navigate to a route NOT in the allowed list
   - Try: `/billing` or `/onboarding` (if they exist)
   - Or any route that's not in: `/w/*`, `/admin/*`, `/home`, `/dashboards`, `/projects`, `/template-center`, `/resources`, `/analytics`, `/inbox`, `/my-work`, `/settings`
2. Check `activeWorkspaceId` state (via React DevTools or console)
3. Navigate to `/home`
4. Verify `activeWorkspaceId` stays cleared
5. Select workspace again from sidebar
6. Verify `activeWorkspaceId` gets set again

**Expected:**
- ✅ `activeWorkspaceId` clears when leaving workspace routes
- ✅ Stays cleared on `/home`
- ✅ Gets set again when selecting workspace

**Capture:**
- Network: Filter for any API call on the non-workspace page (e.g., `/api/dashboards` or `/api/projects`)
  - Request headers should NOT include `x-workspace-id` if the guard cleared it
- Screenshot: `step-6-context-cleared.png` (showing non-workspace page)

**File names:**
- `step-6-context-cleared.png`
- `step-6-api-headers-no-workspace.txt`

---

## Verification Checklist

After completing all steps, verify:

- [ ] Step 1: Admin lands on `/admin/overview`, no workspace context
- [ ] Step 2: Member lands on `/home`, no workspace context
- [ ] Step 3: Deep link redirects to login with encoded redirect param, then lands on workspace
- [ ] Step 4: Legacy URL redirects to slug-based URL, preserves query and subpath
- [ ] Step 5: Sidebar selection navigates to `/w/<slug>/home`
- [ ] Step 6: Workspace context clears when leaving workspace routes

## Code Changes Summary

### Fixed Issues

1. ✅ Removed `/templates` from `ALLOWED_GLOBAL_PREFIXES` (only `/template-center` remains)
2. ✅ Added runtime invariant in `WorkspaceContextGuard` to warn in dev if `/w/:slug` path has no `activeWorkspaceId`
3. ✅ Simplified `resolveWorkspaceSlug` to return clean `{ id, slug }` (API interceptor already unwraps)
4. ✅ Normalized role checking in `SidebarWorkspaces` for create permission

### Files Changed

- `zephix-frontend/src/components/routing/WorkspaceContextGuard.tsx`
  - Removed `/templates` from allowed prefixes
  - Added dev-only runtime invariant warning

- `zephix-frontend/src/features/workspaces/api.ts`
  - Simplified `resolveWorkspaceSlug` return (interceptor already unwraps)

- `zephix-frontend/src/features/workspaces/SidebarWorkspaces.tsx`
  - Normalized role checking with explicit `.toString().toUpperCase()`

## Automated Guard

**Runtime Invariant (Dev Only):**
- `WorkspaceContextGuard` now logs a warning in development if:
  - Pathname starts with `/w/` AND
  - `activeWorkspaceId` is null
  - This indicates a routing/state mismatch

**To verify guard works:**
1. Open browser console
2. Navigate to `/w/<slug>/home` without selecting a workspace first
3. Check console for warning: `[WorkspaceContextGuard] Warning: /w/<slug> path has no activeWorkspaceId...`

## Next Steps

After manual testing:
1. Collect all screenshots and network captures
2. Create a summary document listing:
   - Each step
   - Expected vs observed
   - File names for artifacts
3. If any step fails, document the failure and root cause
