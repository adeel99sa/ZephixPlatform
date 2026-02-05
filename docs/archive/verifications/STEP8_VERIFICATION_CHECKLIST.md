# Step 8: Sharing and Permissions - Verification Checklist

## Prerequisites

**Authentication Setup:**
- [ ] UAT user email and password available
- [ ] `BASE` environment variable set (local: `http://localhost:3000` or production URL)
- [ ] Use `source scripts/auth-login.sh` (not `bash`) to export `TOKEN` to current shell
- [ ] Workspace selected in UI (required for most endpoints)

## Backend Checklist

- [ ] Migration applied (`npm run migration:run` in `zephix-backend`)
- [ ] Enable share returns `shareToken` in response
- [ ] Public link opens without login (GET with `?share=TOKEN`, no Authorization header)
- [ ] Disable share invalidates link (old token returns 400/403)

## Frontend Checklist

- [ ] Signed-in session can enable share, copy link, disable share
- [ ] Incognito share link loads dashboard
- [ ] In share mode, Edit button hidden
- [ ] In share mode, Share button hidden
- [ ] In share mode, analytics widgets show "Sign in required" state
- [ ] No console errors in share mode


