# Routing Proof Run and Artifact Capture

## Task Steps

1. Pull latest branch.
2. Confirm these files exist and are unchanged:
   - `zephix-frontend/src/components/routing/WorkspaceContextGuard.tsx`
   - `zephix-frontend/ROUTING_PROOF_RESULTS.txt`
   - `zephix-frontend/CURSOR_ROUTING_TASK.md`
3. Start frontend and backend.
4. Run the 6 manual proof steps exactly.
5. Save the 7 artifacts with the exact filenames listed.
6. Fill `ROUTING_PROOF_RESULTS.txt` with Observed values and link each artifact filename per step.
7. Commit only:
   - `WorkspaceContextGuard.tsx` if changed
   - `ROUTING_PROOF_RESULTS.txt`
   - Do not commit screenshots or raw header dumps if your repo ignores them. If ignored, attach them to the PR instead.

## Code Check (Do Before Proof)

Open `WorkspaceContextGuard.tsx` and confirm:
- ✅ `ALLOWED_GLOBAL_PREFIXES` has `/template-center`
- ✅ `ALLOWED_GLOBAL_PREFIXES` does NOT have `/templates`
- ✅ Dev warning triggers only on `/w/` paths
- ✅ Dev warning triggers only when `activeWorkspaceId` is empty

## Manual Proof Steps

### Prep
- Open DevTools
- Network tab
- Preserve log: ON
- Disable cache: ON

### Step 1: Admin Login Landing
**Actions:**
1. Go to `/login`
2. Login as admin (`admin@zephix.ai` / `admin123456`)

**Expected:**
- URL: `/admin/overview`

**Capture:**
- `step-1-admin-landing.png` (screenshot of page with URL visible)
- `step-1-auth-me-headers.txt` (Request Headers from `/api/auth/me` request)

**Checks for `/api/auth/me` request headers:**
- ✅ Authorization header present
- ✅ x-workspace-id header absent

---

### Step 2: Member Login Landing
**Actions:**
1. Logout
2. Login as member (`member@zephix.ai` / `member123456`)

**Expected:**
- URL: `/home`

**Capture:**
- `step-2-member-landing.png`
- `step-2-auth-me-headers.txt` (Request Headers from `/api/auth/me`)

---

### Step 3: Deep Link Unauthenticated
**Actions:**
1. Open incognito window
2. Navigate to `/w/<slug>` (use actual workspace slug from your database)
3. Observe redirect
4. Login with any valid credentials
5. Observe final URL

**Expected:**
- Redirect URL: `/login?redirect=%2Fw%2F<slug>%2Fhome`
- After login: `/w/<slug>/home`

**Capture:**
- `step-3a-redirect-to-login.png` (showing login page with redirect param in URL)
- `step-3b-post-login-workspace-home.png` (showing final workspace home page)

---

### Step 4: Legacy Redirect with Query and Subpath
**Actions:**
1. Navigate to `/workspaces/<uuid>/members?x=1` (use actual workspace UUID)
2. Observe redirect

**Expected:**
- One request to `GET /api/workspaces/<uuid>/resolve-slug`
- Final URL: `/w/<slug>/members?x=1` (query param preserved)

**Capture:**
- `step-4-final-url.png` (showing final URL in address bar)
- `step-4-resolve-slug-response.txt` (Response body from `resolve-slug` request)

---

### Step 5: Sidebar Selection
**Actions:**
1. From `/home`, open workspace dropdown in sidebar
2. Select a workspace

**Expected:**
- URL: `/w/<slug>/home`

**Capture:**
- `step-5-sidebar-select.png` (showing URL and workspace page)

---

### Step 6: Context Clearing
**Actions:**
1. From `/w/<slug>/home`, navigate to a route NOT in the allowed list
   - Try: `/billing` or `/onboarding` (if they exist)
   - Or any route not in: `/w/*`, `/admin/*`, `/home`, `/dashboards`, `/projects`, `/template-center`, `/resources`, `/analytics`, `/inbox`, `/my-work`, `/settings`
2. Check `activeWorkspaceId` state (via React DevTools or console)
3. Make a non-workspace API call (e.g., navigate to a page that makes an API call)

**Expected:**
- `activeWorkspaceId` clears when leaving workspace routes
- Non-workspace API calls do NOT include `x-workspace-id` header

**Capture:**
- `step-6-after-context-clear.png` (showing non-workspace page)
- `step-6-non-workspace-headers.txt` (Request Headers from a non-workspace API call, showing x-workspace-id is absent)

---

## Artifacts Checklist

- [ ] `step-1-admin-landing.png`
- [ ] `step-1-auth-me-headers.txt`
- [ ] `step-2-member-landing.png`
- [ ] `step-2-auth-me-headers.txt`
- [ ] `step-3a-redirect-to-login.png`
- [ ] `step-3b-post-login-workspace-home.png`
- [ ] `step-4-final-url.png`
- [ ] `step-4-resolve-slug-response.txt`
- [ ] `step-5-sidebar-select.png`
- [ ] `step-6-after-context-clear.png`
- [ ] `step-6-non-workspace-headers.txt`

## Update ROUTING_PROOF_RESULTS.txt

For each step, fill in:
- **Observed:** What actually happened (URL, behavior, etc.)
- **Files captured:** List the artifact filenames

Example format:
```
Step 1. Admin login landing
Expected:
- URL is /admin/overview
- No workspace page loads
- activeWorkspaceId is null

Observed:
- URL: /admin/overview ✅
- Page loaded correctly ✅
- activeWorkspaceId: null (verified via React DevTools) ✅

Files captured:
- step-1-admin-landing.png
- step-1-auth-me-headers.txt
```

## Commit Instructions

```bash
git add zephix-frontend/src/components/routing/WorkspaceContextGuard.tsx
git add zephix-frontend/ROUTING_PROOF_RESULTS.txt
git commit -m "fix(routing): lock workspace context guard and add runtime invariant

- Remove /templates from allowed prefixes (keep only /template-center)
- Add dev-only runtime invariant to warn on /w/* paths without activeWorkspaceId
- Complete manual proof run with 6 test steps and 11 artifacts"
```

**Note:** If screenshots/headers are in `.gitignore`, attach them to the PR instead of committing.
