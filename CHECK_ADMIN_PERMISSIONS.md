# Quick Check: Admin Permissions

## Step 1: Check Console Logs

After refreshing the page, you should see these logs in the console:

1. `[AuthContext] user loaded:` - should show the user object
2. `[AuthContext] ⚠️ CRITICAL: permissions.isAdmin =` - **THIS IS THE KEY**
3. `[AuthContext] Full permissions object:` - shows the complete permissions

**What to look for:**
- If `permissions.isAdmin = true` → Admin access should work
- If `permissions.isAdmin = false` or `undefined` → That's the problem

## Step 2: Check Network Tab

1. Open DevTools → **Network** tab
2. Refresh the page
3. Find the `/api/auth/me` request
4. Click on it
5. Go to **Response** tab
6. Look for `permissions.isAdmin` in the JSON

**Expected:**
```json
{
  "email": "admin@zephix.ai",
  "permissions": {
    "isAdmin": true,
    ...
  }
}
```

## Step 3: Check UserProfileDropdown

The "Administration" menu is in the **User Profile Dropdown** (top-left, shows company name).

1. Click on the company name/profile area in the top-left
2. You should see a dropdown menu
3. Look for "Administration" option with ⚙️ icon

If you see `[UserProfileDropdown] isAdminUser check:` in console, check what it says.

## Step 4: Manual Console Check

In the browser console, type:

```javascript
// Get user from AuthContext (if accessible)
// Or check localStorage
const authStorage = localStorage.getItem('zephix-auth-storage');
if (authStorage) {
  const parsed = JSON.parse(authStorage);
  console.log('User from storage:', parsed.state?.user);
  console.log('permissions.isAdmin:', parsed.state?.user?.permissions?.isAdmin);
}
```

## Common Issues

### Issue: `permissions.isAdmin` is `false` or `undefined`
**Cause:** Backend not setting it correctly
**Fix:** Check backend logs for `[buildUserResponse] admin check:` message

### Issue: `permissions.isAdmin` is `true` but menu doesn't show
**Cause:** Frontend helper not working
**Fix:** Check `[isAdminUser] decision:` log - should be `true`

### Issue: Menu shows but clicking redirects to `/403`
**Cause:** AdminRoute is blocking
**Fix:** Check `[AdminRoute] evaluating user:` log - should show `decision: 'ALLOW'`




