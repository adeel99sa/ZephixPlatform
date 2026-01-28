# Auth & Home Smoke Test

## Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- Valid user credentials

## Test Steps

### 1. Incognito Browser Test
1. Open Chrome/Edge in **Incognito mode**
2. Navigate to `http://localhost:5173`
3. Open DevTools → Network tab
4. Filter by "Fetch/XHR"

### 2. Login Flow
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Sign In Securely"
4. **Verify:**
   - POST `/api/auth/login` returns `200` or `201`
   - Response headers include `Set-Cookie` for both:
     - `zephix_session`
     - `zephix_refresh`
   - Cookies have `HttpOnly`, `SameSite=Lax` (or `Strict` in prod), `Path=/`

### 3. Auth Me Verification
1. After login, check Network tab
2. **Verify:**
   - GET `/api/auth/me` returns `200`
   - Request headers include `Cookie` header with both cookies
   - Response contains user object with `id`, `email`, `platformRole`
   - **No repeated `/auth/me` calls** (should be single call)

### 4. Home Page Load
1. After login, should redirect to `/home`
2. **Verify:**
   - `/home` loads without redirect loop
   - Page shows:
     - "Home" heading
     - Role-based CTAs (Admin/Member/Guest)
     - Workspaces list (if any)
     - "Continue" button (if last workspace exists)
     - Recent workspaces (if any)
   - No console errors
   - No infinite redirects

### 5. Continue to Workspace
1. If "Continue" button is visible, click it
2. **Verify:**
   - Navigates to workspace home (e.g., `/w/{slug}/home`)
   - Workspace home loads successfully
   - No errors in console

### 6. Refresh Test
1. While on `/home` or workspace home, press `F5` to refresh
2. **Verify:**
   - Page still loads
   - User remains authenticated
   - GET `/api/auth/me` returns `200` (check Network tab)
   - No redirect to login

### 7. Backend Down Test
1. Stop the backend server
2. Refresh the page
3. **Verify:**
   - Error is visible (network error, 500, etc.)
   - **No infinite redirects** to login
   - User sees error state, not stuck in loop

### 8. Logout Test
1. Click logout (if available) or navigate to `/login` and clear cookies manually
2. Navigate to `/home`
3. **Verify:**
   - Redirects to `/login`
   - GET `/api/auth/me` returns `401`
   - No redirect loop

## Expected Network Flow

```
1. POST /api/auth/login
   → 200/201
   → Set-Cookie: zephix_session=...
   → Set-Cookie: zephix_refresh=...

2. GET /api/auth/me
   → 200
   → Cookie: zephix_session=...; zephix_refresh=...
   → { user: { id, email, platformRole, ... } }

3. GET /api/workspaces
   → 200
   → Cookie: zephix_session=...; zephix_refresh=...
   → { items: [...] } or { data: [...] }

4. (User navigates to workspace)
   GET /api/workspaces/slug/{slug}/home
   → 200
   → Cookie: zephix_session=...; zephix_refresh=...
```

## Failure Indicators

❌ **Multiple `/auth/me` calls in quick succession** - Single flight not working
❌ **401 loop** - Cookie not being sent or extracted incorrectly
❌ **Redirect loop** - AuthContext or ProtectedRoute logic issue
❌ **Flash to login** - Loading state not shown during hydration
❌ **Workspace auto-selected** - Auto-select logic still active

## Success Criteria

✅ Single `/auth/me` call on app load
✅ Cookies sent with every request after login
✅ `/home` loads without workspace requirement
✅ Role-based CTAs visible
✅ Continue button works
✅ Refresh maintains session
✅ Backend down shows error, not redirect loop
✅ Logout redirects to login
