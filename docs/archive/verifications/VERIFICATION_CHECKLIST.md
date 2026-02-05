# Admin Access Verification Checklist

## ✅ Code Implementation Status

All code changes have been implemented and compile successfully. The following verification steps should be run when the backend and frontend servers are running.

## Backend Verification

### Step 1: Start Backend with Demo Bootstrap

```bash
cd zephix-backend
DEMO_BOOTSTRAP=true npm run start:dev
```

**Expected Output:**
- Server starts on port 3000
- Demo bootstrap logs show:
  ```
  bootstrap.demo.user.upserted: admin@zephix.ai (user.role=admin, org.role=admin)
  bootstrap.demo.user.upserted: member@zephix.ai (user.role=pm, org.role=pm)
  Demo bootstrap complete ✅ (org slug: demo)
  ```

### Step 2: Run Backend Smoke Test

In a **separate terminal** (backend should still be running):

```bash
cd zephix-backend
npm run smoke:admin-access
```

**Expected Output for admin@zephix.ai:**
```
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
```

**Expected Output for member@zephix.ai:**
```
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
```

**If Test Fails:**

Check the error message:
- **Connection refused**: Backend server is not running
- **401 Unauthorized**: User doesn't exist or password is wrong
- **permissions.isAdmin: false for admin**: UserOrganization record missing or wrong role

**Fix UserOrganization if needed:**
```sql
-- Check existing records
SELECT uo.*, u.email
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
WHERE u.email = 'admin@zephix.ai';

-- If missing, create it (replace <user-id> and <org-id> with actual values)
INSERT INTO user_organizations (id, user_id, organization_id, role, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), '<user-id>', '<org-id>', 'admin', true, NOW(), NOW());
```

## Frontend Verification

### Step 1: Start Frontend

```bash
cd zephix-frontend
npm run dev
```

### Step 2: Test Admin User

1. **Open Browser DevTools** → Console tab
2. **Navigate to login page**
3. **Login as `admin@zephix.ai` / `admin123456`**

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
- ✅ `role` is `"ADMIN"`

4. **Click user profile dropdown** (top right)
5. **Look for "Administration" menu item**

**Expected:**
- ✅ "Administration" menu item is **visible**

6. **Click "Administration"**

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
- ✅ URL changes to `/admin`
- ✅ Admin Dashboard renders
- ✅ No redirect to `/home` or `/403`

### Step 3: Test Member User (Negative Test)

1. **Logout**
2. **Login as `member@zephix.ai` / `member123456`**

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

3. **Click user profile dropdown**

**Expected:**
- ✅ "Administration" menu item is **NOT visible**

4. **Manually navigate to `/admin`** (type in address bar)

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

## Network Tab Verification

### Check /auth/me Response

1. **Open DevTools** → Network tab
2. **Login as admin@zephix.ai**
3. **Find `/api/auth/me` request**
4. **Click it** → Response tab

**Expected JSON Response:**
```json
{
  "id": "...",
  "email": "admin@zephix.ai",
  "firstName": "Admin",
  "lastName": "User",
  "organizationId": "...",
  "role": "ADMIN",
  "platformRole": "ADMIN",
  "permissions": {
    "isAdmin": true,
    "canManageUsers": true,
    "canViewProjects": true,
    "canManageResources": true,
    "canViewAnalytics": true
  }
}
```

**Critical Fields:**
- ✅ `role: "ADMIN"` (not "admin" or undefined)
- ✅ `platformRole: "ADMIN"` (not undefined)
- ✅ `permissions.isAdmin: true` (not false or undefined)

## Troubleshooting

### Issue: Backend smoke test fails with "Connection refused"

**Solution:** Start the backend server first:
```bash
cd zephix-backend
DEMO_BOOTSTRAP=true npm run start:dev
```

### Issue: `/auth/me` returns `permissions.isAdmin: false` for admin user

**Root Cause:** UserOrganization record missing or wrong role

**Solution:**
1. Check if UserOrganization record exists:
   ```sql
   SELECT * FROM user_organizations
   WHERE user_id = (SELECT id FROM users WHERE email = 'admin@zephix.ai');
   ```

2. If missing, create it:
   ```sql
   -- Get user and org IDs first
   SELECT u.id as user_id, u.organization_id as org_id
   FROM users u
   WHERE u.email = 'admin@zephix.ai';

   -- Then insert (replace with actual IDs)
   INSERT INTO user_organizations (id, user_id, organization_id, role, is_active, created_at, updated_at)
   VALUES (gen_random_uuid(), '<user-id>', '<org-id>', 'admin', true, NOW(), NOW());
   ```

3. Restart backend and test again

### Issue: Frontend shows "Administration" but clicking redirects to `/403`

**Check:**
1. Console log `[AuthContext] user loaded` - what are the values?
2. Console log `[AdminRoute] evaluating user` - what is the decision?
3. Network tab `/auth/me` response - does it have `permissions.isAdmin: true`?

**Common Causes:**
- UserOrganization record missing (backend issue)
- Frontend not receiving permissions object (API interceptor issue)
- `isAdminUser()` logic issue (check console logs)

### Issue: Member user can see "Administration" menu

**Check:**
1. Console log `[AuthContext] user loaded` - is `permissions.isAdmin` false?
2. Is `isAdminUser(user)` returning false? (add temporary console.log)

**Common Causes:**
- UserProfileDropdown not using `isAdminUser()` (should be fixed)
- User object has stale data (try hard refresh)

## Success Criteria

✅ Backend smoke test passes for both admin and member
✅ Admin user sees Administration menu item
✅ Admin user can navigate to `/admin` successfully
✅ Member user does NOT see Administration menu item
✅ Member user is redirected to `/403` when accessing `/admin` directly
✅ No redirects to `/home` for denied admin access
✅ All console logs show expected values
✅ `/auth/me` response includes `permissions.isAdmin: true` for admin

## Files to Check if Issues Persist

1. **Backend:**
   - `src/modules/auth/auth.service.ts` - `buildUserResponse()` method
   - `src/modules/auth/auth.controller.ts` - `/auth/me` endpoint
   - Database: `user_organizations` table

2. **Frontend:**
   - `src/state/AuthContext.tsx` - User object storage
   - `src/types/roles.ts` - `isAdminUser()` function
   - `src/routes/AdminRoute.tsx` - Guard logic
   - `src/components/shell/UserProfileDropdown.tsx` - Menu visibility

3. **Network:**
   - DevTools → Network → `/api/auth/me` → Response tab






