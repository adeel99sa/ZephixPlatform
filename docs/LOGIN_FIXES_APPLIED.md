# Login Fixes Applied

**Date:** 2026-01-18  
**Status:** ✅ Complete

## Problems Fixed

### Problem 1: Login Response Parsing Wrong ✅

**Issue:** Backend wraps responses in envelope, but AuthContext was reading tokens from wrong place.

**Fix:** Updated `login` function in `AuthContext.tsx` to use `unwrapApiData` helper.

**File:** `zephix-frontend/src/state/AuthContext.tsx`

**Changes:**
- Import `unwrapApiData` and `getErrorMessage` from `@/lib/api`
- Use `unwrapApiData<LoginResponse>(res.data)` to unwrap envelope
- Validate `accessToken` and `user` exist before proceeding
- Clear tokens and user on error
- Throw error with proper message

### Problem 2: API Client Tries Refresh After Login 401 ✅

**Issue:** API interceptor was attempting refresh after 401 from `/auth/login`, spamming `/auth/refresh`.

**Fix:** Added early return in response interceptor to skip refresh for login/register/logout failures.

**File:** `zephix-frontend/src/services/api.ts`

**Changes:**
- Added check before refresh logic: if 401 and URL includes `/auth/login`, `/auth/register`, `/auth/signup`, or `/auth/logout`, reject immediately
- Prevents refresh attempts for auth endpoint failures

### Problem 3: Auto-Logout on Mount ✅

**Status:** No auto-logout found in AuthContext. The `useEffect` only calls `hydrate()`, which loads user from token. No logout call on mount.

**Verified:** No `logout()` calls in `useEffect` with empty dependency array.

## Files Changed

1. `zephix-frontend/src/state/AuthContext.tsx`
   - Updated `login` function to use `unwrapApiData`
   - Added proper error handling with `getErrorMessage`
   - Clear tokens and user on login failure

2. `zephix-frontend/src/services/api.ts`
   - Added early return for auth endpoint 401s to prevent refresh attempts

3. `zephix-frontend/src/lib/api.ts`
   - Added exports for `unwrapApiData` and `getErrorMessage`

4. `.cursor/rules/20-zephix-frontend.mdc`
   - Added "Auth response rule"
   - Added "No refresh on login failures"
   - Added "No automatic logout"
   - Added "Proof rule for auth changes"

## Build Status

```bash
npm run build
# ✅ Exit code: 0 - Build successful
```

## Next Steps

1. **Test login:**
   - Start backend: `cd zephix-backend && npm run start:dev`
   - Open `http://localhost:5173/login`
   - Enter credentials or create new account
   - Check Network tab for POST /api/auth/login

2. **Capture for verification:**
   - Request URL (should be `http://localhost:5173/api/auth/login`)
   - Response body JSON (should show envelope with `data` field containing `accessToken` and `user`)

3. **Verify:**
   - Login succeeds
   - Token stored in `localStorage.getItem('zephix.at')`
   - Redirects to `/home`
   - No refresh attempts after login failure

## Expected Response Shape

```json
{
  "data": {
    "user": {
      "id": "...",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      "role": "...",
      "platformRole": "...",
      "permissions": {...}
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "sessionId": "...",
    "organizationId": "...",
    "expiresIn": 900
  },
  "meta": {
    "timestamp": "...",
    "requestId": "..."
  }
}
```

After `unwrapApiData`, we get:
```typescript
{
  user: {...},
  accessToken: "eyJ...",
  refreshToken: "eyJ...",
  sessionId: "...",
  organizationId: "...",
  expiresIn: 900
}
```

---

**Fixes Applied** ✅

Ready for testing. Once login works, proceed with Core Flow 04 proof capture.
