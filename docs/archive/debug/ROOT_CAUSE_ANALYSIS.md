# Root Cause Analysis: Admin Access Issue

## Potential Issues Identified

### Issue #1: Inconsistency Between UserProfileDropdown and AdminRoute

**Location:**
- `UserProfileDropdown.tsx` line 190: Uses `isAdminRole(user.role)`
- `AdminRoute.tsx` line 35: Uses `isAdminUser(user)`

**Problem:**
- These are **two different functions** with different logic:
  - `isAdminRole(role)` - Only checks the role string
  - `isAdminUser(user)` - Checks `permissions.isAdmin` first, then falls back to role

**Impact:**
- If `user.role` is set but `permissions.isAdmin` is false/undefined, the button might show but AdminRoute will block access
- Or vice versa: button might not show even if user is admin

**Evidence Needed:**
- Check if `user.permissions.isAdmin` is actually `true` in the response
- Check if `user.role` is set correctly

---

### Issue #2: UserOrganization Record May Not Exist

**Location:**
- `auth.service.ts` line 231-242: `buildUserResponse()` checks for UserOrganization

**Problem:**
- If UserOrganization record doesn't exist or `isActive: false`, it falls back to `user.role`
- If `user.role` in the database is not 'admin' or 'owner', it won't normalize to ADMIN

**Potential Scenarios:**
1. User was created but UserOrganization record was never created
2. UserOrganization record exists but `isActive: false`
3. UserOrganization record has wrong `organizationId`
4. UserOrganization record has `role: 'pm'` or `'viewer'` instead of `'admin'` or `'owner'`

**Evidence Needed:**
- Check database: Does UserOrganization record exist for admin@zephix.ai?
- What is the `role` value in UserOrganization?
- What is the `isActive` value?
- What is the `organizationId`?

---

### Issue #3: Role Normalization Mismatch

**Location:**
- Backend: `normalizePlatformRole()` returns `PlatformRole.ADMIN` (enum value 'ADMIN')
- Frontend: `normalizePlatformRole()` also returns 'ADMIN' (string)

**Problem:**
- Backend returns `role: 'ADMIN'` (uppercase)
- Frontend `isAdminUser()` checks `user.role.toLowerCase() === 'admin'` - this should work
- But also checks `normalizePlatformRole(user.role) === 'ADMIN'` - this should also work

**However:**
- If backend returns `role: 'ADMIN'` but `permissions.isAdmin: false` (bug in buildUserResponse), then `isAdminUser` would fall back to role check
- The role check should work, but if there's a type mismatch or the role is something unexpected, it might fail

**Evidence Needed:**
- What exact value is in `user.role` from `/auth/me`?
- What exact value is in `user.permissions.isAdmin`?

---

### Issue #4: API Response Structure Mismatch

**Location:**
- `AuthContext.tsx` line 38: `api.get("/auth/me")` - response might be wrapped

**Problem:**
- If API interceptor wraps the response differently than expected, the user object structure might be wrong
- If `/auth/me` returns `{ user: {...} }` but code expects just `{...}`, permissions might be nested incorrectly

**Evidence Needed:**
- Check Network tab: What is the exact structure of `/auth/me` response?
- Is it `{ id, email, role, permissions }` or `{ user: { id, email, role, permissions } }`?

---

### Issue #5: PlatformRole Enum Value vs String

**Location:**
- `auth.service.ts` line 263: `role: platformRole` where `platformRole` is `PlatformRole.ADMIN`

**Problem:**
- `PlatformRole.ADMIN` is an enum with value `'ADMIN'` (string)
- When returned as JSON, it should serialize to `"ADMIN"` (string)
- Frontend receives it as string `"ADMIN"`
- `isAdminUser` checks `user.role.toLowerCase() === 'admin'` which should work for "ADMIN"
- But if there's any serialization issue, it might not work

**Evidence Needed:**
- Check actual JSON response from `/auth/me`
- Verify `role` field is exactly `"ADMIN"` (string, not enum)

---

## Diagnostic Steps to Identify Root Cause

### Step 1: Check Backend Response
```bash
# In browser DevTools Network tab:
1. Login as admin@zephix.ai
2. Find /api/auth/me request
3. Check Response tab
4. Look for:
   - role: should be "ADMIN"
   - platformRole: should be "ADMIN"
   - permissions.isAdmin: should be true
```

**If permissions.isAdmin is false or missing:**
- Root cause: `buildUserResponse()` is not setting `isAdmin = true`
- Check: Is `platformRole === PlatformRole.ADMIN` evaluating to true?
- Check: Does UserOrganization record exist with correct role?

### Step 2: Check Frontend AuthContext
```javascript
// In browser console after login:
// Should see:
[AuthContext] user loaded: {
  email: "admin@zephix.ai",
  role: "ADMIN",           // ← Check this
  platformRole: "ADMIN",    // ← Check this
  permissions: {
    isAdmin: true           // ← Check this
  }
}
```

**If permissions.isAdmin is false or undefined:**
- Root cause: Backend not returning it, or API interceptor stripping it
- Check: Network response vs what AuthContext receives

### Step 3: Check AdminRoute Evaluation
```javascript
// When clicking Administration, should see:
[AdminRoute] evaluating user: {
  email: "admin@zephix.ai",
  role: "ADMIN",
  platformRole: "ADMIN",
  permissions: { isAdmin: true }
}
[isAdminUser] returning true - permissions.isAdmin is true
```

**If you see "access denied":**
- Root cause: `isAdminUser()` is returning false
- Check: What values are in the log? Are they what we expect?

### Step 4: Check Database
```sql
-- Check if UserOrganization record exists
SELECT uo.*, u.email, o.name as org_name
FROM user_organizations uo
JOIN users u ON u.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE u.email = 'admin@zephix.ai';

-- Check user.role
SELECT id, email, role, organization_id
FROM users
WHERE email = 'admin@zephix.ai';
```

**If UserOrganization doesn't exist:**
- Root cause: User was created but UserOrganization record was never created
- Solution: Create UserOrganization record with `role: 'admin'`

**If UserOrganization.role is not 'admin' or 'owner':**
- Root cause: Wrong role value
- Solution: Update to `role: 'admin'`

---

## Most Likely Root Causes (Ranked)

### 1. **UserOrganization Record Missing or Wrong Role** (80% probability)
- User was created with `role: 'admin'` in users table
- But UserOrganization record either:
  - Doesn't exist
  - Has `role: 'pm'` or `'viewer'`
  - Has `isActive: false`
- `buildUserResponse()` falls back to `user.role` which might not normalize correctly

### 2. **Permissions Object Not Being Set** (15% probability)
- `buildUserResponse()` logic error
- `isAdmin = platformRole === PlatformRole.ADMIN` evaluates to false
- Even though role should be ADMIN

### 3. **API Response Structure Issue** (5% probability)
- Response is wrapped differently than expected
- Permissions object is nested or missing
- API interceptor modifying response

---

## What to Check First

1. **Database Check** (Highest Priority):
   ```sql
   SELECT * FROM user_organizations WHERE user_id = (SELECT id FROM users WHERE email = 'admin@zephix.ai');
   ```
   - Does record exist?
   - What is `role` value?
   - What is `isActive` value?
   - What is `organization_id`?

2. **Network Response Check**:
   - Open DevTools → Network → `/api/auth/me` → Response
   - Copy the full JSON response
   - Check if `permissions.isAdmin` is `true`

3. **Console Logs Check**:
   - After login, check for `[AuthContext] user loaded` log
   - When clicking Administration, check for `[AdminRoute]` and `[isAdminUser]` logs
   - Copy all relevant logs

---

## Next Steps

Once you provide:
1. The actual `/api/auth/me` JSON response
2. The `[AuthContext] user loaded` console log
3. The `[AdminRoute]` console log (if it appears)
4. The database query results for UserOrganization

I can pinpoint the exact root cause and provide the fix.
