# Invite Link Frontend Implementation Plan

## File Structure Mapping

### API Client Files

**Location:** `src/features/workspaces/api/workspace-invite.api.ts`
- ✅ File exists but needs updates to match exact backend behavior
- Update types and error handling

**Location:** `src/lib/api.ts`
- ✅ Main API client with interceptors
- Already handles envelope unwrapping
- Already handles auth tokens

---

### Component Files

**Location:** `src/features/workspaces/pages/WorkspaceMembersPage.tsx`
- ✅ File exists
- Already has invite link loading logic (lines 84-89, 129+)
- Needs: Invite link modal component integration

**Location:** `src/views/workspaces/JoinWorkspacePage.tsx`
- ✅ File exists
- Needs: Complete rewrite to match state machine

**New Component:** `src/features/workspaces/components/InviteLinkModal.tsx`
- ❌ Create new file
- Implements invite link modal state machine

---

## API Client Implementation

### Update: `src/features/workspaces/api/workspace-invite.api.ts`

```typescript
/**
 * Workspace Invite API
 *
 * Matches backend behavior:
 * - GET /workspaces/:id/invite-link returns metadata only (no URL)
 * - POST /workspaces/:id/invite-link returns URL only at creation
 * - POST /workspaces/join requires auth (returns 401 if not logged in)
 */
import { api } from '@/lib/api';
import { unwrapData } from '@/lib/api/unwrapData';
import { AxiosError } from 'axios';

// Types matching backend exactly
export type ApiEnvelope<T> = {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  code?: string;
  message?: string;
  statusCode?: number;
};

export type InviteLinkMeta = {
  exists: true;
  expiresAt: string | null;   // ISO string
  createdAt: string;           // ISO string
};

export type CreateInviteLinkRequest = {
  expiresInDays?: number;     // optional, 1-365 expected by backend validation
};

export type CreateInviteLinkResult = {
  url: string;                // full URL with token
  expiresAt: string | null;   // ISO string or null
};

export type JoinWorkspaceRequest = {
  token: string;
};

export type JoinWorkspaceResult = {
  workspaceId: string;
};

// Error helper
function toApiError(e: unknown): ApiError {
  const err = e as AxiosError<any>;
  const data = err?.response?.data;
  if (data?.code || data?.message) {
    return { ...data, statusCode: err.response?.status };
  }
  return {
    code: 'UNKNOWN',
    message: 'Request failed',
    statusCode: err.response?.status
  };
}

// API implementation
export const workspaceInvitesApi = {
  /**
   * Get active invite link metadata
   * GET /api/workspaces/:id/invite-link
   *
   * Returns metadata only (exists, expiresAt, createdAt)
   * Does NOT return URL or token for security
   */
  async getActiveInviteLink(workspaceId: string): Promise<ApiEnvelope<InviteLinkMeta | null>> {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/invite-link`);
      // API interceptor already unwraps { data: T } to T
      // But we need to handle the envelope format
      const data = unwrapData<InviteLinkMeta | null>(res);
      return { data: data ?? null };
    } catch (e) {
      throw toApiError(e);
    }
  },

  /**
   * Create invite link
   * POST /api/workspaces/:id/invite-link
   *
   * Returns URL and expiresAt only at creation time
   * Store URL in component state (memory only)
   */
  async createInviteLink(
    workspaceId: string,
    body: CreateInviteLinkRequest
  ): Promise<ApiEnvelope<CreateInviteLinkResult>> {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/invite-link`, body);
      const data = unwrapData<CreateInviteLinkResult>(res);
      if (!data) {
        throw new Error('Create invite link returned no data');
      }
      return { data };
    } catch (e) {
      throw toApiError(e);
    }
  },

  /**
   * Join workspace
   * POST /api/workspaces/join
   *
   * Requires authentication
   * Returns 401 UNAUTHENTICATED if not logged in
   */
  async joinWorkspace(body: JoinWorkspaceRequest): Promise<ApiEnvelope<JoinWorkspaceResult>> {
    try {
      const res = await api.post('/workspaces/join', body);
      const data = unwrapData<JoinWorkspaceResult>(res);
      if (!data?.workspaceId) {
        throw new Error('Join workspace returned no workspaceId');
      }
      return { data };
    } catch (e) {
      const error = toApiError(e);
      // Re-throw with proper error structure for UI handling
      throw error;
    }
  },

  /**
   * Revoke invite link
   * DELETE /api/workspaces/:id/invite-link/:linkId
   */
  async revokeInviteLink(
    workspaceId: string,
    linkId: string
  ): Promise<void> {
    try {
      await api.delete(`/workspaces/${workspaceId}/invite-link/${linkId}`);
    } catch (e) {
      throw toApiError(e);
    }
  },
};
```

---

## Component Implementation

### 1. InviteLinkModal Component

**File:** `src/features/workspaces/components/InviteLinkModal.tsx`

**State Machine:**
```typescript
type InviteLinkModalState =
  | { status: "idle"; meta: InviteLinkMeta | null; createdLink: null; error: null }
  | { status: "loading-meta"; meta: InviteLinkMeta | null; createdLink: null; error: null }
  | { status: "ready"; meta: InviteLinkMeta | null; createdLink: CreateInviteLinkResult | null; error: null }
  | { status: "creating"; meta: InviteLinkMeta | null; createdLink: CreateInviteLinkResult | null; error: null }
  | { status: "error"; meta: InviteLinkMeta | null; createdLink: CreateInviteLinkResult | null; error: ApiError };
```

**Implementation:**
- On open: Load meta (GET /workspaces/:id/invite-link)
- If meta exists: Show "active link exists" message + "Create new link" button
- On create: POST to create, store URL in state (memory only)
- Copy button: Uses `createdLink.url` (disabled if null)
- Revoke: DELETE endpoint (requires linkId - need to track this)

**Note:** Backend GET doesn't return linkId. Options:
1. Store linkId from create response (if backend adds it)
2. Track linkId in component state after creation
3. Use workspaceId + created timestamp to identify link

---

### 2. JoinWorkspacePage Component

**File:** `src/views/workspaces/JoinWorkspacePage.tsx`

**State Machine:**
```typescript
type JoinState =
  | { status: "boot"; token: string | null; error: ApiError | null }
  | { status: "missing-token"; token: null; error: ApiError }
  | { status: "joining"; token: string; error: null }
  | { status: "success"; token: string; workspaceId: string; error: null }
  | { status: "error"; token: string; error: ApiError };
```

**Implementation:**
1. **boot**: Parse token from `?token=...` query param
2. **missing-token**: Show error if token missing
3. **joining**: Call `POST /workspaces/join { token }`
4. **401 UNAUTHENTICATED**: Redirect to `/login?returnUrl=<current-url>`
5. **success**:
   - Refresh user session (`GET /api/auth/me`)
   - Navigate to `/workspaces/:workspaceId/home`
6. **error**: Show error message based on error code

**Error Mapping:**
- `UNAUTHENTICATED` (401) → Redirect to login
- `INVITE_LINK_INVALID` (400) → "This invite link is invalid"
- `INVITE_LINK_EXPIRED` (409) → "This invite link has expired"
- `INVITE_LINK_REVOKED` (409) → "This invite link has been revoked"
- `USER_NOT_IN_ORG` (403) → "You must be a member of the organization to join"
- `ALREADY_MEMBER` (409) → Treat as success, redirect to workspace

---

### 3. WorkspaceMembersPage Updates

**File:** `src/features/workspaces/pages/WorkspaceMembersPage.tsx`

**Changes Needed:**
1. Replace existing invite link logic with `InviteLinkModal` component
2. Add "Invite Link" button (only if `canManageMembers`)
3. Integrate modal state management

**Current State (lines 84-89, 129+):**
- Already has `inviteLink` state
- Already has `loadInviteLink()` function
- Needs: Modal component integration

---

## Route Configuration

**File:** `src/App.tsx`

**Current Route (line 94):**
```typescript
<Route path="/join/workspace" element={<JoinWorkspacePage />} />
```

**Status:** ✅ Already configured

**Alternative Route (if needed):**
```typescript
<Route path="/invites/workspace" element={<JoinWorkspacePage />} />
```

---

## Implementation Checklist

### Phase 1: API Client
- [ ] Update `workspace-invite.api.ts` with exact types
- [ ] Add error handling with `toApiError` helper
- [ ] Test GET endpoint (should return metadata only)
- [ ] Test POST create endpoint (should return URL)
- [ ] Test POST join endpoint (should handle 401)

### Phase 2: InviteLinkModal
- [ ] Create `InviteLinkModal.tsx` component
- [ ] Implement state machine
- [ ] Add "Create new link" flow
- [ ] Add copy to clipboard functionality
- [ ] Add revoke functionality (if linkId available)
- [ ] Add expiry display
- [ ] Handle error states

### Phase 3: JoinWorkspacePage
- [ ] Rewrite component with state machine
- [ ] Parse token from URL query param
- [ ] Implement 401 redirect to login
- [ ] Implement success redirect to workspace
- [ ] Add error message display
- [ ] Add loading states
- [ ] Test all error codes

### Phase 4: WorkspaceMembersPage Integration
- [ ] Add "Invite Link" button
- [ ] Integrate `InviteLinkModal` component
- [ ] Update invite link loading logic
- [ ] Test permission gating (only owners/admins see button)

### Phase 5: Testing
- [ ] Test create link flow
- [ ] Test join flow (logged in)
- [ ] Test join flow (not logged in → redirect)
- [ ] Test error cases
- [ ] Test revoke flow
- [ ] Test copy to clipboard

---

## Key Design Decisions

### 1. URL Storage
- ✅ Store URL in component state (memory only)
- ❌ Do NOT store in localStorage
- ❌ Do NOT store server-side (backend doesn't support retrieval)

### 2. LinkId for Revoke
- **Issue:** GET endpoint doesn't return linkId
- **Options:**
  1. Backend enhancement: Return linkId in GET response
  2. Store linkId after creation (if backend returns it)
  3. Use workspaceId + timestamp to identify link
- **Recommendation:** Check if POST create returns linkId, store it

### 3. Invite Link Role
- ✅ Current: Default viewer for guests, member for members/admins
- ✅ No change needed for Sprint 1

### 4. Join Auth Behavior
- ✅ Backend already returns `401 UNAUTHENTICATED`
- ✅ Frontend should redirect to login with returnUrl

---

## Files to Create/Modify

### Create
1. `src/features/workspaces/components/InviteLinkModal.tsx` (new)

### Modify
1. `src/features/workspaces/api/workspace-invite.api.ts` (update types and error handling)
2. `src/views/workspaces/JoinWorkspacePage.tsx` (rewrite with state machine)
3. `src/features/workspaces/pages/WorkspaceMembersPage.tsx` (integrate modal)

### Verify
1. `src/App.tsx` (route already exists)
2. `src/lib/api.ts` (interceptor already handles envelope unwrapping)

---

## Next Steps

1. **Update API client** with exact types and error handling
2. **Create InviteLinkModal** component with state machine
3. **Rewrite JoinWorkspacePage** with complete state machine
4. **Integrate modal** into WorkspaceMembersPage
5. **Test end-to-end** flow
