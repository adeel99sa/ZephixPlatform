# Workspace Invite Link Flow Verification Checklist

This document provides exact steps to verify the end-to-end workspace invite link flow, including create, join, and revoke functionality.

## Prerequisites

- Backend running and accessible
- Frontend running and accessible
- At least one workspace with owner access
- Test user account (can be same as owner for testing)

## Verification Steps

### 1. Create Invite Link as Workspace Owner

**Steps:**
1. Log in as workspace owner
2. Navigate to Workspace Settings → Members page (`/workspaces/:workspaceId/members`)
3. Click "Invite Link" button (should be visible only if `canManageMembers` is true)
4. In the modal, verify:
   - If no active link exists: Shows "No active invite link found"
   - If active link exists: Shows "An active link already exists" with expiry and created date
5. Set expiry days (1-365, default 30)
6. Click "Create new link"
7. Verify:
   - Toast shows "Invite link created"
   - URL appears in the modal
   - Expiry date is displayed
   - Copy button is enabled

**Expected Result:**
- Modal shows the full invite URL
- URL format: `{FRONTEND_URL}/join/workspace?token={token}`
- Copy button successfully copies URL to clipboard

---

### 2. Join Link Redirects Unauthenticated User to Login

**Steps:**
1. Copy the invite link URL from step 1
2. Open a new private/incognito browser window
3. Paste the URL in the address bar and navigate
4. Verify:
   - Page shows "Join workspace" or "Joining workspace..." briefly
   - Redirects to `/login?returnUrl=/join/workspace?token={token}`
   - Login page loads with returnUrl in query param
   - `zephix.returnUrl` is stored in localStorage

**Expected Result:**
- Unauthenticated user is redirected to login
- returnUrl is preserved in both query param and localStorage
- Login page displays correctly

---

### 3. Login Completes Join and Redirects to Workspace Home

**Steps:**
1. On the login page from step 2, enter valid credentials
2. Click "Sign In Securely"
3. After successful login, verify:
   - User is redirected back to `/join/workspace?token={token}`
   - Join request is automatically executed
   - User is redirected to `/workspaces/:workspaceId/home`
   - Workspace home page loads successfully
   - User is now a member of the workspace

**Expected Result:**
- Join completes automatically after login
- User lands on workspace home page
- No manual steps required

---

### 4. Revoke Active Invite Link

**Steps:**
1. As workspace owner, navigate to Members page
2. Click "Invite Link" button
3. Verify modal shows "An active link already exists" (from step 1)
4. Click "Revoke link" button
5. Verify:
   - Button shows "Revoking..." during operation
   - Toast shows "Invite link revoked"
   - Modal refreshes and shows "No active invite link found"
   - Any previously created URL in memory is cleared

**Expected Result:**
- Revoke succeeds without requiring linkId
- GET invite-link returns null after revoke
- Modal state updates correctly

---

### 5. Revoked Link Shows Error

**Steps:**
1. Use the invite link URL from step 1 (before revoke)
2. Open in a new private/incognito window
3. Log in if needed
4. Attempt to join using the revoked link
5. Verify:
   - Backend returns error code `INVITE_LINK_REVOKED` or `INVITE_LINK_INVALID`
   - UI shows appropriate error message
   - User is not added to workspace

**Expected Result:**
- Revoked link cannot be used to join
- Clear error message displayed
- Workspace membership unchanged

---

### 6. Create New Link After Revoke

**Steps:**
1. After revoking in step 4, click "Create new link" in the modal
2. Verify:
   - New link is created successfully
   - New URL is displayed
   - New token is different from the revoked one
   - New link works for joining

**Expected Result:**
- New link can be created after revoke
- New link is functional and different from revoked link

---

## Edge Cases to Verify

### Already Member Attempt
- If user is already a member and tries to join again:
  - Should handle gracefully (either show success or redirect to workspace)

### Expired Link
- Create link with short expiry (1 day)
- Wait for expiry or manually set expiresAt in database
- Attempt to join:
  - Should return `INVITE_LINK_EXPIRED` error
  - UI shows appropriate message

### Missing Token
- Navigate to `/join/workspace` without token param:
  - Should show "Invalid invite link" error
  - Should not attempt API call

### Permission Gating
- As non-owner (member/viewer), verify:
  - "Invite Link" button is NOT visible
  - Direct API calls to create/revoke return 403

---

## API Endpoints Verified

- `GET /api/workspaces/:id/invite-link` - Returns metadata only (no URL)
- `POST /api/workspaces/:id/invite-link` - Creates link, returns URL
- `DELETE /api/workspaces/:id/invite-link/active` - Revokes active link
- `POST /api/workspaces/join` - Joins workspace (requires auth)

---

## Notes

- All invite link URLs are stored in component state only (memory), never in localStorage
- Revoke is idempotent: revoking when no active link exists returns ok
- GET endpoint never returns the actual token or URL for security
- Join endpoint requires authentication and returns 401 if not logged in
