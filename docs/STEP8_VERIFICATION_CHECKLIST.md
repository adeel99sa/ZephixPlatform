# Step 8: Sharing and Permissions - Verification Checklist

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


