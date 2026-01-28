# Auth & Home Smoke Test

## Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- Valid user credentials

## Test Steps

### 1) Backend
```bash
curl -i http://localhost:3000/api/health
```
Expected: `200 OK`

### 2) Vite proxy
```bash
curl -i http://localhost:5173/api/health
```
Expected: `200 OK` (proxied to backend)

### 3) Login
1. Open `http://localhost:5173/login` in browser
2. Login with valid credentials
3. Verify Network tab:
   - `POST /api/auth/login` is `200` or `201`
   - Response has `Set-Cookie` headers for `zephix_session` and `zephix_refresh`

### 4) Me
Verify Network tab:
- `GET /api/auth/me` is `200`
- Request includes `Cookie` header
- Only one `/api/auth/me` request during startup (no duplicates)

### 5) Home
1. Go to `/home`
2. Verify no redirects
3. Verify cards render:
   - "Continue" card (if last workspace exists)
   - Quick actions (role-based)
   - Recent workspaces (if any)
   - All workspaces list

### 6) Workspace open
1. Click a workspace from the list
2. Verify `/w/:slug/home` loads
3. Refresh the page
4. Verify still authenticated (no redirect to login)
