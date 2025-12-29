# Debug: Unable to Access Administration Page

## Quick Diagnostic Steps

### Step 1: Check Browser Console
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Look for these log messages:
   - `[AuthContext] user loaded: { ... }`
   - `[isAdminUser] decision: true/false - permissions.isAdmin: true/false`
   - `[AdminRoute] evaluating user: { decision: 'ALLOW' | 'DENY' }`

**What to look for:**
- If you see `[isAdminUser] decision: false`, the user is not being recognized as admin
- If you see `[AdminRoute] decision: 'DENY'`, the route is blocking access

### Step 2: Check Network Tab
1. Open DevTools → **Network** tab
2. Refresh the page
3. Find the `/api/auth/me` request
4. Click on it and check the **Response** tab

**What to check:**
```json
{
  "email": "admin@zephix.ai",
  "permissions": {
    "isAdmin": true,  // ← THIS MUST BE true
    ...
  }
}
```

**If `permissions.isAdmin` is missing or `false`:**
- The backend is not setting it correctly
- Check if you're logged in as `admin@zephix.ai` (the demo admin user)
- Verify the UserOrganization record exists with `role = 'admin'`

### Step 3: Verify User in Database
Run this SQL query to check your user's organization role:

```sql
SELECT
  u.email,
  u.role as user_role,
  uo.role as org_role,
  uo.is_active
FROM users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
WHERE u.email = 'admin@zephix.ai';
```

**Expected result:**
- `org_role` should be `'admin'` or `'owner'`
- `is_active` should be `true`

### Step 4: Check What Happens When You Navigate
1. Open DevTools → **Console** tab
2. Try to navigate to `/admin` (click the Administration menu or type in address bar)
3. Watch the console logs

**What should happen:**
- If admin: You should see `[AdminRoute] decision: 'ALLOW'` and the page loads
- If not admin: You should see `[AdminRoute] decision: 'DENY'` and redirect to `/403`

## Common Issues & Fixes

### Issue 1: `permissions.isAdmin` is `false` or missing
**Root cause:** Backend not setting it correctly

**Fix:**
1. Verify you're logged in as `admin@zephix.ai`
2. Check the UserOrganization record exists:
   ```sql
   SELECT * FROM user_organizations
   WHERE user_id = (SELECT id FROM users WHERE email = 'admin@zephix.ai')
   AND is_active = true;
   ```
3. If missing, the demo bootstrap may not have run. Restart backend with:
   ```bash
   DEMO_BOOTSTRAP=true npm run start:dev
   ```

### Issue 2: Console shows `[isAdminUser] decision: false`
**Root cause:** Frontend helper not seeing `permissions.isAdmin: true`

**Fix:**
1. Check Network tab → `/api/auth/me` response
2. If `permissions.isAdmin` is `true` in response but helper returns false:
   - Check AuthContext is not overwriting permissions
   - Verify the user object in console has `permissions.isAdmin: true`

### Issue 3: Redirected to `/403` or `/login`
**Root cause:** AdminRoute is blocking access

**Fix:**
1. Check console for `[AdminRoute] evaluating user` log
2. Verify `decision: 'ALLOW'` (not 'DENY')
3. If 'DENY', check why `isAdminUser()` returned false

### Issue 4: Page loads but shows "Access Denied" or blank
**Root cause:** Route allows access but component has additional checks

**Fix:**
1. Check if AdminDashboardPage has its own permission checks
2. Look for errors in console
3. Check Network tab for failed API calls

## Quick Test Commands

### Test Backend Response
```bash
# Get your auth token from browser localStorage
# Then run:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/auth/me | jq '.permissions'
```

Expected output:
```json
{
  "isAdmin": true,
  "canManageUsers": true,
  ...
}
```

### Test Frontend Helper
In browser console:
```javascript
// Get user from AuthContext
const { user } = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.findFiberByHostInstance?.(document.querySelector('[data-testid="user-profile-button"]'))?.return?.memoizedState?.context?.user;

// Or check localStorage
const authStorage = localStorage.getItem('zephix-auth-storage');
const user = JSON.parse(authStorage)?.state?.user;

// Check permissions
console.log('permissions.isAdmin:', user?.permissions?.isAdmin);
```

## Still Stuck?

If none of the above fixes work, provide:
1. Console logs (especially `[AuthContext]`, `[isAdminUser]`, `[AdminRoute]`)
2. Network tab → `/api/auth/me` response (full JSON)
3. What happens when you navigate to `/admin` (redirect? blank page? error?)
4. Your current user email (are you logged in as `admin@zephix.ai`?)




