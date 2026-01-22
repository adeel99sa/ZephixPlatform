# Core Flow 02: Home Page

**Status:** ✅ PASS  
**Last Verified:** 2026-01-18

## Steps

1. After login, verify URL is `/home`
2. Verify page renders content based on role
3. Verify sidebar shows workspace dropdown
4. Verify no redirect occurs

## Expected Result

- URL stays `/home` (not `/admin/home`, `/my-work`, or `/guest/home`)
- Page renders role-appropriate content in place
- Sidebar visible with workspace dropdown
- No full-screen workspace selection forced

## Actual Result

✅ **PASS** - `/home` works for all roles, renders content in place

## Proof

- **Route:** `/home` exists in `App.tsx`
- **Component:** `HomeRouterPage` renders role content
- **Fix:** Single home URL pattern implemented (2025-01-27)
- **Commit:** Workspace directory dropdown integration

## Notes

- `HomeRouterPage` uses `useAuth()` to determine role
- Renders `AdminDashboard`, `MyWorkPage`, or `GuestHomePage` based on role
- No navigation away from `/home` on role change
