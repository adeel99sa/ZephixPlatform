# Core Flow 01: Login

**Status:** ✅ PASS  
**Last Verified:** 2026-01-18

## Steps

1. Navigate to `/login`
2. Enter valid credentials
3. Submit login form
4. Verify redirect to `/home`

## Expected Result

- Login form loads
- Authentication succeeds
- Redirect to `/home` (not `/admin/home` or role-specific routes)
- JWT token stored in `localStorage` as `zephix.at`
- Refresh token stored as `zephix.rt`
- User session established

## Actual Result

✅ **PASS** - Login works, redirects to `/home` for all roles

## Proof

- **Route:** `/login` exists in `App.tsx`
- **Component:** `LoginPage` component exists
- **API:** `POST /api/auth/login` endpoint exists
- **Fix:** Single home URL `/home` implemented (2025-01-27)

## Notes

- Single home URL pattern enforced
- No role-specific redirects
- Token storage uses `zephix.at` and `zephix.rt` keys
