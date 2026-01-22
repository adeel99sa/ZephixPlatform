# Cursor Instructions - Routing Lockdown Task

## Task

1. Apply the two code changes in WorkspaceContextGuard exactly as written.
2. Do not touch any other routing files.
3. Run frontend build.
4. Run the 6 manual proof steps and produce the 7 artifacts listed.
5. Commit only the WorkspaceContextGuard change and the proof results file.

## Code Changes (Already Applied)

### File: `zephix-frontend/src/components/routing/WorkspaceContextGuard.tsx`

**Change 1: Allowed Prefixes**
- Removed `/templates` from `ALLOWED_GLOBAL_PREFIXES`
- Keep only `/template-center`

**Change 2: Runtime Invariant Guard**
```typescript
useEffect(() => {
  if (import.meta.env.MODE !== "development") return;
  if (!pathname.startsWith("/w/")) return;
  if (activeWorkspaceId) return;

  console.warn("[routing] /w/* without activeWorkspaceId. Select a workspace or fix slug route flow.", {
    pathname,
  });
}, [pathname, activeWorkspaceId]);
```

## Manual Proof Steps

### Prerequisites
- Backend running: `cd zephix-backend && npm run start:dev`
- Frontend running: `cd zephix-frontend && npm run dev`
- Test credentials:
  - Admin: `admin@zephix.ai` / `admin123456`
  - Member: `member@zephix.ai` / `member123456`
- Browser DevTools: Network tab, "Preserve log" ON, "Disable cache" ON

### Step 1: Admin Login Landing
1. Go to `/login`
2. Login as admin (`admin@zephix.ai` / `admin123456`)
3. **Expected:** URL is `/admin/overview`
4. **Capture:**
   - Screenshot: `step-1-admin-landing.png`
   - Network: Click `/api/auth/me`, copy Request Headers → `step-1-auth-me-headers.txt`
   - Verify: Authorization header present, x-workspace-id NOT present

### Step 2: Member Login Landing
1. Logout
2. Login as member (`member@zephix.ai` / `member123456`)
3. **Expected:** URL is `/home`
4. **Capture:**
   - Screenshot: `step-2-member-landing.png`
   - Network: `/api/auth/me` headers → `step-2-auth-me-headers.txt`

### Step 3: Deep Link Unauthenticated
1. Open incognito window
2. Navigate to `/w/<slug>` (use actual workspace slug)
3. **Expected:** Redirect to `/login?redirect=%2Fw%2F<slug>%2Fhome`
4. Login with any valid credentials
5. **Expected:** Land on `/w/<slug>/home`
6. **Capture:**
   - Screenshot: `step-3a-redirect-to-login.png`
   - Screenshot: `step-3b-post-login-workspace-home.png`

### Step 4: Legacy Redirect with Query and Subpath
1. Navigate to `/workspaces/<uuid>/members?x=1` (use actual workspace UUID)
2. **Expected:**
   - One request to `GET /api/workspaces/<uuid>/resolve-slug`
   - Final URL: `/w/<slug>/members?x=1`
3. **Capture:**
   - Screenshot: `step-4-final-url.png`
   - Network: Save response body for `resolve-slug` → `step-4-resolve-slug-response.txt`

### Step 5: Sidebar Selection
1. From `/home`, open workspace dropdown in sidebar
2. Select a workspace
3. **Expected:** URL `/w/<slug>/home`
4. **Capture:**
   - Screenshot: `step-5-sidebar-select.png`

### Step 6: Context Clearing
1. From `/w/<slug>/home`, navigate to a non-workspace route (e.g., `/billing`, `/onboarding`)
2. **Expected:**
   - `WorkspaceContextGuard` clears `activeWorkspaceId`
   - Next non-workspace API calls do NOT include `x-workspace-id` header
3. **Capture:**
   - Screenshot: `step-6-after-context-clear.png`
   - Network: Pick one non-workspace API call, save Request Headers → `step-6-non-workspace-headers.txt`

## Artifacts Required

1. `step-1-admin-landing.png`
2. `step-1-auth-me-headers.txt`
3. `step-2-member-landing.png`
4. `step-2-auth-me-headers.txt`
5. `step-3a-redirect-to-login.png`
6. `step-3b-post-login-workspace-home.png`
7. `step-4-final-url.png`
8. `step-4-resolve-slug-response.txt`
9. `step-5-sidebar-select.png`
10. `step-6-after-context-clear.png`
11. `step-6-non-workspace-headers.txt`

## Commit

After manual testing:
```bash
git add zephix-frontend/src/components/routing/WorkspaceContextGuard.tsx
git add zephix-frontend/ROUTING_PROOF_RESULTS.txt
git commit -m "fix(routing): lock workspace context guard and add runtime invariant"
```

## Notes

- Do NOT modify any other routing files
- All code changes are already in `WorkspaceContextGuard.tsx`
- Build is passing
- Manual testing is required to capture all artifacts
