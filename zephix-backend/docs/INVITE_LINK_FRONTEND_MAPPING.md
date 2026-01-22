# Invite Link Frontend Mapping

## Current DTOs and Responses

### Create Invite Link

**Request DTO:**
```typescript
// POST /api/workspaces/:id/invite-link
{
  expiresInDays?: number; // Optional, 1-365, default: 30
}
```

**Response:**
```typescript
{
  data: {
    url: string;           // Full URL: "http://localhost:5173/join/workspace?token=abc123..."
    expiresAt: Date | null; // ISO date string or null if no expiry
  }
}
```

**Error Codes:**
- `WORKSPACE_NOT_FOUND` - Workspace doesn't exist
- `INVITE_LINK_CREATION_FAILED` - Generic creation failure
- `403` - Insufficient permissions (`manage_workspace_members` required)

---

### Get Active Invite Link

**Request:**
```typescript
// GET /api/workspaces/:id/invite-link
// No body
```

**Response:**
```typescript
{
  data: {
    exists: true;
    expiresAt: Date | null;
    createdAt: Date;
  } | null  // null if no active link exists
}
```

**Note:** Backend does NOT return the actual token/URL for security. Frontend must create a new link to see the URL.

**Error Codes:**
- `404` - Workspace not found
- `403` - Insufficient permissions (workspace_viewer or higher required)

---

### Join Workspace

**Request DTO:**
```typescript
// POST /api/workspaces/join
{
  token: string; // From URL query param: ?token=abc123...
}
```

**Response:**
```typescript
{
  data: {
    workspaceId: string;
  }
}
```

**Error Codes:**
- `UNAUTHENTICATED` (401) - User not logged in (frontend should redirect to login)
- `INVITE_LINK_INVALID` (400) - Token doesn't match any invite link
- `INVITE_LINK_REVOKED` (409) - Link was revoked
- `INVITE_LINK_EXPIRED` (409) - Link expired
- `WORKSPACE_NOT_FOUND` (404) - Workspace doesn't exist
- `USER_NOT_IN_ORG` (403) - User not in organization
- `ALREADY_MEMBER` (409) - User already a member
- `JOIN_WORKSPACE_FAILED` (400) - Generic failure

---

### Revoke Invite Link

**Request:**
```typescript
// DELETE /api/workspaces/:id/invite-link/:linkId
// No body
```

**Response:**
```typescript
{
  data: {
    ok: true;
  }
}
```

**Error Codes:**
- `404` - Link not found
- `403` - Insufficient permissions
- `INVITE_LINK_REVOKE_FAILED` (400) - Generic failure

---

## Frontend State Machine

### 1. Workspace Settings → Members Tab

**Initial State:**
```typescript
interface MembersPageState {
  members: Member[];
  loading: boolean;
  inviteLink: {
    exists: boolean;
    expiresAt: Date | null;
    createdAt: Date | null;
  } | null;
  showInviteModal: boolean;
}
```

**Load Sequence:**
1. `GET /api/workspaces/:id/members` → Load members list
2. `GET /api/workspaces/:id/invite-link` → Check for active link
3. Render table with members
4. Show "Invite Link" button (if `manage_workspace_members` permission)

---

### 2. Invite Link Modal

**State:**
```typescript
interface InviteLinkModalState {
  link: {
    url: string;
    expiresAt: Date | null;
  } | null;
  loading: boolean;
  creating: boolean;
  revoking: boolean;
}
```

**User Actions:**

**A. Create New Link:**
1. User clicks "Create Invite Link" button
2. Optional: Show expiry picker (default 30 days)
3. `POST /api/workspaces/:id/invite-link` with `{ expiresInDays?: number }`
4. On success:
   - Store `response.data.url` and `response.data.expiresAt`
   - Show URL in copyable input
   - Show "Copy" button
   - Show "Revoke" button
   - Display expiry date

**B. View Existing Link:**
1. If `GET /api/workspaces/:id/invite-link` returns `{ exists: true }`
2. Show "Active link exists" message
3. Show "Create New Link" button (revokes old one)
4. Show expiry date if available
5. **Note:** Cannot show URL without creating new link (security)

**C. Copy Link:**
1. Copy `link.url` to clipboard
2. Show "Copied!" toast

**D. Revoke Link:**
1. User clicks "Revoke"
2. `DELETE /api/workspaces/:id/invite-link/:linkId`
3. On success:
   - Clear link state
   - Show "Link revoked" message
   - Hide URL and revoke button

---

### 3. Join Workspace Page

**Route:** `/join/workspace` or `/invites/workspace`

**State:**
```typescript
interface JoinWorkspacePageState {
  token: string | null;
  status: 'loading' | 'checking-auth' | 'joining' | 'success' | 'error';
  error: {
    code: string;
    message: string;
  } | null;
  workspaceId: string | null;
}
```

**State Machine:**

```
[Initial]
  ↓
  Extract token from URL: ?token=abc123...
  ↓
[Checking Auth]
  ↓
  Is user logged in?
  ├─ NO → Redirect to /login?returnUrl=/join/workspace?token=abc123...
  └─ YES → [Joining]
            ↓
            POST /api/workspaces/join { token }
            ↓
            Response?
            ├─ 401 UNAUTHENTICATED → Redirect to login
            ├─ 400/409/404 Error → [Error State]
            └─ 200 Success → [Success]
                                  ↓
                                  Store workspaceId
                                  ↓
                                  Refresh user session (GET /api/auth/me)
                                  ↓
                                  Redirect to /workspaces/:workspaceId/home
```

**Error Handling:**

```typescript
switch (error.code) {
  case 'UNAUTHENTICATED':
    // Redirect to login with returnUrl
    redirect(`/login?returnUrl=${encodeURIComponent(window.location.href)}`);
    break;
  
  case 'INVITE_LINK_INVALID':
    showError('This invite link is invalid or has been used.');
    break;
  
  case 'INVITE_LINK_REVOKED':
    showError('This invite link has been revoked.');
    break;
  
  case 'INVITE_LINK_EXPIRED':
    showError('This invite link has expired.');
    break;
  
  case 'USER_NOT_IN_ORG':
    showError('You must be a member of the organization to join this workspace.');
    break;
  
  case 'ALREADY_MEMBER':
    // This is actually success - user is already a member
    redirect(`/workspaces/${workspaceId}/home`);
    break;
  
  default:
    showError('Failed to join workspace. Please try again.');
}
```

---

## Frontend API Calls

### TypeScript Interface

```typescript
// API Client
interface WorkspaceInviteAPI {
  // Create invite link
  createInviteLink(
    workspaceId: string,
    expiresInDays?: number
  ): Promise<{ url: string; expiresAt: Date | null }>;
  
  // Get active invite link
  getActiveInviteLink(
    workspaceId: string
  ): Promise<{ exists: boolean; expiresAt: Date | null; createdAt: Date } | null>;
  
  // Revoke invite link
  revokeInviteLink(
    workspaceId: string,
    linkId: string
  ): Promise<void>;
  
  // Join workspace
  joinWorkspace(
    token: string
  ): Promise<{ workspaceId: string }>;
}
```

### Example Implementation

```typescript
// Create invite link
const createInviteLink = async (
  workspaceId: string,
  expiresInDays?: number
) => {
  const response = await api.post(
    `/workspaces/${workspaceId}/invite-link`,
    { expiresInDays }
  );
  return response.data.data; // { url, expiresAt }
};

// Get active link
const getActiveInviteLink = async (workspaceId: string) => {
  const response = await api.get(
    `/workspaces/${workspaceId}/invite-link`
  );
  return response.data.data; // { exists, expiresAt, createdAt } | null
};

// Revoke link
const revokeInviteLink = async (workspaceId: string, linkId: string) => {
  await api.delete(
    `/workspaces/${workspaceId}/invite-link/${linkId}`
  );
};

// Join workspace
const joinWorkspace = async (token: string) => {
  const response = await api.post('/workspaces/join', { token });
  return response.data.data; // { workspaceId }
};
```

---

## Backend Fixes Needed

### 1. Join Endpoint Auth Behavior ✅ Already Correct

Current behavior:
- Returns `401 UNAUTHENTICATED` if no JWT
- Code: `UNAUTHENTICATED`
- Message: `'Sign in to join this workspace'`

**Status:** ✅ No changes needed

---

### 2. Invite Link Role Assignment

**Current Behavior:**
- Guest platform role → `workspace_viewer`
- Member platform role → `workspace_member`
- Admin platform role → `workspace_member`

**Decision Needed:**
- Option A: Always assign `workspace_viewer` (safest, recommended)
- Option B: Allow choosing role at link creation (future enhancement)

**Recommendation:** Keep current behavior (default viewer for guests, member for members/admins). Add role selection later if needed.

---

### 3. "Cannot Remove Last Owner" Error ✅ Verified

**Current Error Codes:**
- `LAST_OWNER_REQUIRED` - Used when removing/demoting last owner
- `LAST_OWNER_PROTECTION` - Used in some contexts

**Error Format:**
```typescript
{
  code: 'LAST_OWNER_REQUIRED' | 'LAST_OWNER_PROTECTION',
  message: 'Cannot remove the last workspace owner' // or similar message
}
```

**Status:** ✅ Error codes exist and are clear for UI display

---

## UI Component Structure

### 1. MembersPage Component

```typescript
<MembersPage>
  <MembersTable 
    members={members}
    onRoleChange={handleRoleChange}
    onSuspend={handleSuspend}
    onRemove={handleRemove}
  />
  <InviteLinkButton onClick={openInviteModal} />
  <InviteLinkModal 
    open={showModal}
    workspaceId={workspaceId}
    onClose={closeModal}
  />
</MembersPage>
```

### 2. InviteLinkModal Component

```typescript
<InviteLinkModal>
  {link ? (
    <>
      <InviteUrlDisplay url={link.url} />
      <CopyButton onClick={copyToClipboard} />
      <ExpiryDisplay expiresAt={link.expiresAt} />
      <RevokeButton onClick={handleRevoke} />
    </>
  ) : (
    <>
      <ExpiryPicker onChange={setExpiresInDays} />
      <CreateButton onClick={handleCreate} />
    </>
  )}
</InviteLinkModal>
```

### 3. JoinWorkspacePage Component

```typescript
<JoinWorkspacePage>
  {status === 'loading' && <LoadingSpinner />}
  {status === 'error' && <ErrorMessage error={error} />}
  {status === 'success' && <SuccessMessage />}
</JoinWorkspacePage>
```

---

## Next Steps

1. ✅ **Backend:** Verify join endpoint returns `401 UNAUTHENTICATED` (already correct)
2. ✅ **Backend:** Verify "cannot remove last owner" error code (check needed)
3. **Frontend:** Build MembersPage with invite link button
4. **Frontend:** Build InviteLinkModal component
5. **Frontend:** Build JoinWorkspacePage with auth redirect flow
6. **Frontend:** Add route `/join/workspace` or `/invites/workspace`
7. **Frontend:** Implement post-join redirect and session refresh
