# Invites and Members API Endpoints

## Current Backend Routes

### Organization Invites (Org-Level)

**Base Path:** `/api/orgs/:orgId/invites`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `POST` | `/api/orgs/:orgId/invites` | Create organization invitation | JWT + Email Verified | workspace_owner or Platform ADMIN |

**Base Path:** `/api/invites`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `POST` | `/api/invites/accept` | Accept organization invitation | JWT | Authenticated user |

---

### Workspace Members (Workspace-Level)

**Base Path:** `/api/workspaces/:id/members`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `GET` | `/api/workspaces/:id/members` | List workspace members | JWT + Workspace Access | workspace_owner, workspace_member, workspace_viewer, or org admin |
| `POST` | `/api/workspaces/:id/members` | Add existing user to workspace | JWT + Workspace Permission | `manage_workspace_members` |
| `PATCH` | `/api/workspaces/:id/members/:userId` | Change member role | JWT + Workspace Permission | `manage_workspace_members` |
| `DELETE` | `/api/workspaces/:id/members/:userId` | Remove member from workspace | JWT + Workspace Permission | `manage_workspace_members` |
| `PATCH` | `/api/workspaces/:id/members/:memberId/suspend` | Suspend workspace member | JWT + Workspace Permission | `manage_workspace_members` |
| `PATCH` | `/api/workspaces/:id/members/:memberId/reinstate` | Reinstate suspended member | JWT + Workspace Permission | `manage_workspace_members` |

**Base Path:** `/api/workspaces/:id` (Owner Management)

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `POST` | `/api/workspaces/:id/change-owner` | Change workspace owner | JWT + Org Role | Platform ADMIN only |
| `PATCH` | `/api/workspaces/:id/owners` | Update workspace owners (bulk) | JWT + Org Role | Platform ADMIN only |

---

### Workspace Invite Links (Workspace-Level)

**Base Path:** `/api/workspaces/:id/invite-link`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `POST` | `/api/workspaces/:id/invite-link` | Create invite link | JWT + Workspace Permission | `manage_workspace_members` |
| `GET` | `/api/workspaces/:id/invite-link` | Get active invite link | JWT + Workspace Access | workspace_viewer or higher |
| `DELETE` | `/api/workspaces/:id/invite-link/:linkId` | Revoke invite link | JWT + Workspace Permission | `manage_workspace_members` |

**Base Path:** `/api/workspaces`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `POST` | `/api/workspaces/join` | Join workspace using invite token | Optional JWT | Public (but requires auth to complete) |

**Base Path:** `/api/workspaces/:id/members`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `POST` | `/api/workspaces/:id/members/invite` | Invite members by email | JWT + Workspace Permission | `manage_workspace_members` |
| | | **Status:** Not implemented (returns 400 FEATURE_NOT_AVAILABLE) | | |

---

### Admin Workspace Members (Admin-Only)

**Base Path:** `/api/workspaces/:workspaceId/members` (Admin Controller)

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| `GET` | `/api/workspaces/:workspaceId/members` | List workspace members (admin view) | JWT + Org Role | Platform ADMIN only |
| `POST` | `/api/workspaces/:workspaceId/members` | Add member (admin) | JWT + Org Role | Platform ADMIN only |
| `PATCH` | `/api/workspaces/:workspaceId/members/:memberId` | Update member role (admin) | JWT + Org Role | Platform ADMIN only |
| `DELETE` | `/api/workspaces/:workspaceId/members/:memberId` | Remove member (admin) | JWT + Org Role | Platform ADMIN only |

---

## Request/Response DTOs

### Create Organization Invite
**POST** `/api/orgs/:orgId/invites`
```typescript
// Request
{
  email: string;
  role: 'admin' | 'member' | 'viewer';
  message?: string;
}

// Response
{
  token: string;
  expiresAt: Date;
  message: string;
}
```

### Accept Organization Invite
**POST** `/api/invites/accept`
```typescript
// Request
{
  token: string;
}

// Response
{
  orgId: string;
  message: string;
}
```

### List Workspace Members
**GET** `/api/workspaces/:id/members?limit=50&offset=0&search=john`
```typescript
// Response
{
  data: Array<{
    id: string;
    userId: string;
    workspaceId: string;
    role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
    status: 'active' | 'suspended';
    user: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
}
```

### Add Workspace Member
**POST** `/api/workspaces/:id/members`
```typescript
// Request
{
  userId: string;
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
}

// Response
{
  data: {
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    status: 'active';
  };
}
```

### Change Member Role
**PATCH** `/api/workspaces/:id/members/:userId`
```typescript
// Request
{
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
}

// Response
{
  data: {
    id: string;
    userId: string;
    role: string;
  };
}
```

### Create Invite Link
**POST** `/api/workspaces/:id/invite-link`
```typescript
// Request
{
  expiresInDays?: number; // Default: 30
}

// Response
{
  data: {
    url: string; // Full URL with token
    expiresAt: Date;
  };
}
```

### Join Workspace
**POST** `/api/workspaces/join`
```typescript
// Request
{
  token: string; // From invite link
}

// Response
{
  data: {
    workspaceId: string;
    role: 'workspace_viewer' | 'workspace_member';
    message: string;
  };
}
```

---

## Permission Matrix

### Workspace Member Management

| Action | workspace_owner | workspace_member | workspace_viewer | Platform ADMIN |
|--------|----------------|------------------|------------------|----------------|
| List members | ✅ | ✅ | ✅ | ✅ |
| Add member | ✅ | ❌ | ❌ | ✅ |
| Change role | ✅ | ❌ | ❌ | ✅ |
| Remove member | ✅ | ❌ | ❌ | ✅ |
| Suspend member | ✅ | ❌ | ❌ | ✅ |
| Create invite link | ✅ | ❌ | ❌ | ✅ |
| View invite link | ✅ | ✅ | ✅ | ✅ |
| Revoke invite link | ✅ | ❌ | ❌ | ✅ |
| Join workspace | ✅ | ✅ | ✅ | ✅ |

### Organization Invites

| Action | workspace_owner | Platform ADMIN | Others |
|--------|----------------|----------------|--------|
| Create org invite | ✅ | ✅ | ❌ |
| Accept org invite | ✅ | ✅ | ✅ (if invited) |

---

## Notes

1. **Feature Flags:** Workspace member endpoints are gated behind `WorkspaceMembershipFeatureGuard`
2. **Email Invites:** `/api/workspaces/:id/members/invite` is not implemented (returns 400)
3. **Admin Endpoints:** Separate admin controller at `/api/workspaces/:workspaceId/members` requires Platform ADMIN role
4. **Owner Protection:** Cannot remove last workspace_owner
5. **Join Flow:** `/api/workspaces/join` requires authentication but endpoint itself is public (returns 401 if not logged in)
