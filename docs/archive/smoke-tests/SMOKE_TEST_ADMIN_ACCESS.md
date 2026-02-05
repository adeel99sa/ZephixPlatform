# Smoke Test: Admin Access

This document describes how to verify that admin access works correctly end-to-end.

## Prerequisites

1. Backend server running on `http://localhost:3000`
2. Frontend server running (typically `http://localhost:5173` or similar)
3. Demo users created (run with `DEMO_BOOTSTRAP=true` or use seed script)

## Backend Smoke Test

### Run the Script

```bash
cd zephix-backend
npm run smoke:admin-access
```

### Expected Output

```
🚀 Starting admin access smoke test...
   Base URL: http://localhost:3000/api

🧪 Testing admin@zephix.ai...
   Expected isAdmin: true
   Login response:
     - role: ADMIN
     - platformRole: ADMIN
     - permissions.isAdmin: true
   /auth/me response:
     - role: ADMIN
     - platformRole: ADMIN
     - permissions.isAdmin: true
   ✅ PASS: isAdmin is true (expected true)

🧪 Testing member@zephix.ai...
   Expected isAdmin: false
   Login response:
     - role: MEMBER
     - platformRole: MEMBER
     - permissions.isAdmin: false
   /auth/me response:
     - role: MEMBER
     - platformRole: MEMBER
     - permissions.isAdmin: false
   ✅ PASS: isAdmin is false (expected false)

📊 Results:
   admin@zephix.ai: ✅ PASS
   member@zephix.ai: ✅ PASS

✅ All tests passed!
```

### If Tests Fail

1. **Check UserOrganization records:**
   ```sql
   SELECT uo.*, u.email
   FROM user_organizations uo
   JOIN users u ON u.id = uo.user_id
   WHERE u.email IN ('admin@zephix.ai', 'member@zephix.ai');
   ```
   - Verify `role` is 'admin' for admin@zephix.ai
   - Verify `isActive` is true
   - Verify `organizationId` matches

2. **Check backend logs:**
   - Look for errors in `buildUserResponse()`
   - Verify UserOrganization lookup is working

## Frontend Smoke Test

### Step 1: Login as Admin

1. Open browser DevTools → Console tab
2. Navigate to login page
3. Login as `admin@zephix.ai` / `admin123456`

**Expected Console Log:**
```
[AuthContext] user loaded: {
  email: "admin@zephix.ai",
  role: "ADMIN",
  platformRole: "ADMIN",
  permissions: { isAdmin: true, ... }
}
```

**Verify:**
- ✅ `permissions.isAdmin` is `true`
- ✅ `role` is `"ADMIN"` or `"admin"`

### Step 2: Check Administration Menu

1. Click on user profile dropdown (top right)
2. Look for "Administration" menu item

**Expected:**
- ✅ "Administration" menu item is visible
- ✅ Menu item is clickable

### Step 3: Navigate to Admin Dashboard

1. Click "Administration" in profile dropdown
2. Watch console for logs

**Expected Console Logs:**
```
[AdminRoute] evaluating user: {
  path: "/admin",
  email: "admin@zephix.ai",
  role: "ADMIN",
  platformRole: "ADMIN",
  permissions: { isAdmin: true, ... },
  decision: "ALLOW"
}
[isAdminUser] returning true - permissions.isAdmin is true
```

**Expected Behavior:**
- ✅ Navigates to `/admin` (Admin Dashboard)
- ✅ No redirect to `/home` or `/403`
- ✅ Admin Dashboard loads successfully

### Step 4: Login as Member

1. Logout
2. Login as `member@zephix.ai` / `member123456`

**Expected Console Log:**
```
[AuthContext] user loaded: {
  email: "member@zephix.ai",
  role: "MEMBER",
  platformRole: "MEMBER",
  permissions: { isAdmin: false, ... }
}
```

**Verify:**
- ✅ `permissions.isAdmin` is `false`
- ✅ `role` is `"MEMBER"`

### Step 5: Check Administration Menu (Member)

1. Click on user profile dropdown
2. Look for "Administration" menu item

**Expected:**
- ✅ "Administration" menu item is **NOT visible**

### Step 6: Direct Navigation Test (Member)

1. Manually navigate to `/admin` in browser (type in address bar)
2. Watch console for logs

**Expected Console Logs:**
```
[AdminRoute] evaluating user: {
  path: "/admin",
  email: "member@zephix.ai",
  role: "MEMBER",
  platformRole: "MEMBER",
  permissions: { isAdmin: false, ... },
  decision: "DENY"
}
[isAdminUser] returning false - no admin indicators found: { ... }
[AdminRoute] access denied for user: { ... }
```

**Expected Behavior:**
- ✅ Redirects to `/403` (Forbidden page)
- ✅ Does NOT redirect to `/home`
- ✅ Forbidden page displays clear message

## Troubleshooting

### Issue: Admin user sees `/403`

**Check:**
1. Backend `/auth/me` response - does it have `permissions.isAdmin: true`?
2. Console log `[AuthContext] user loaded` - does it show `permissions.isAdmin: true`?
3. Console log `[AdminRoute] evaluating user` - what values are shown?
4. Console log `[isAdminUser]` - which check is failing?

**Common Causes:**
- UserOrganization record missing or wrong role
- `buildUserResponse()` not setting `isAdmin` correctly
- Frontend not receiving permissions object

### Issue: Administration menu not visible for admin

**Check:**
1. Console log `[AuthContext] user loaded` - does it show correct values?
2. Is `isAdminUser(user)` returning true? (add temporary console.log)

**Common Causes:**
- `isAdminUser()` logic issue
- User object not fully loaded when dropdown renders

### Issue: Redirected to `/home` instead of `/403`

**Check:**
1. Is AdminRoute redirecting to `/403`? (check code)
2. Is API client redirecting on 403? (check `handlePermissionDenied()`)
3. Is there another redirect in ProtectedRoute?

**Common Causes:**
- API client has redirect logic for 403
- ProtectedRoute has redirect logic
- AdminRoute not properly configured

## Success Criteria

✅ Backend smoke test passes for both admin and member
✅ Admin user sees Administration menu item
✅ Admin user can navigate to `/admin` successfully
✅ Member user does NOT see Administration menu item
✅ Member user is redirected to `/403` when accessing `/admin` directly
✅ No redirects to `/home` for denied admin access
✅ All console logs show expected values

## Related Files

- Backend: `zephix-backend/scripts/smoke-test-admin-access.ts`
- Frontend: `zephix-frontend/src/routes/AdminRoute.tsx`
- Frontend: `zephix-frontend/src/types/roles.ts` (isAdminUser helper)
- Frontend: `zephix-frontend/src/components/shell/UserProfileDropdown.tsx`






