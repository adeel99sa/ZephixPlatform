# Workspace Permissions - Implementation Plan

## Final Rules Summary

### 1. Invitation & Membership Rules

| Action | Who Can Do It | Description |
|--------|---------------|-------------|
| Invite new users (not yet in org) | **Org Admin only** | Admins are the only ones who can send external invites (new user creation) |
| Add existing platform users to a workspace | **Workspace Owner or Admin** | They can only add users who already exist in the organization's user directory |
| Promote/Demote workspace roles (member ↔ viewer) | **Workspace Owner or Admin** | Role changes limited to users already in that workspace |
| Remove members from workspace | **Workspace Owner or Admin** | Allowed only for users in the same workspace |
| Assign workspace owner | **Admin only** | Ownership can only be changed by an Admin via Admin Panel |
| Delete workspace | **Workspace Owner or Admin** | Owner can delete their workspace; Admin can delete any |

### 2. Permission Hierarchy

**Organization level:**
```
admin > project_manager > viewer
```

**Workspace level:**
```
workspace_owner > workspace_member > workspace_viewer
```

### 3. Key Enforcement Points

- ✅ Admin = only role allowed to invite external users
- ✅ Workspace Owner = can only manage existing org members
- ✅ All invites from Workspace Settings Modal should use **filtered org user list**, not an email invite form
- ✅ `/admin/invite` remains the **only entry point** for onboarding new users

---

## Implementation Checklist

### Backend Changes

- [ ] Update `WorkspaceGuard` to enforce workspace-level permissions
- [ ] Create `WorkspaceOwnerGuard` for owner-only actions
- [ ] Update workspace service methods:
  - [ ] `addMember()` - Allow workspace owner or admin, only existing users
  - [ ] `removeMember()` - Allow workspace owner or admin
  - [ ] `changeMemberRole()` - Allow workspace owner or admin
  - [ ] `assignOwner()` - Admin only, auto-demote previous owner
  - [ ] `deleteWorkspace()` - Workspace owner or admin
- [ ] Update project creation to require `workspaceId` (NOT NULL)
- [ ] Add telemetry events for all workspace actions

### Frontend Changes

#### Admin Panel
- [ ] Update `/admin/workspaces`:
  - [ ] Create workspace modal with owner assignment
  - [ ] Workspace detail page with owner management
  - [ ] "Change Owner" button (admin only)
  - [ ] Members table with add/remove/role change
- [ ] Update `/admin/invite`:
  - [ ] Keep as only entry point for external invites
  - [ ] Add users to organization directory

#### Workspace Settings Modal
- [ ] Update "Members" tab:
  - [ ] Show "Add Member" button (workspace owner or admin)
  - [ ] Use filtered org user list (not email invite)
  - [ ] Show "Invite new member" link to `/admin/invite` (admin only)
  - [ ] Role change dropdown (workspace owner or admin)
  - [ ] Remove member button (workspace owner or admin)
- [ ] Update "Settings" tab:
  - [ ] Delete workspace button (workspace owner or admin)

#### Project Creation
- [ ] Update project creation modal:
  - [ ] Require workspace selection (cannot be null)
  - [ ] Filter workspaces by user's membership
  - [ ] Show error if no workspace selected

---

## Backend Implementation Details

### Guards

```typescript
// workspace-owner.guard.ts
@Injectable()
export class WorkspaceOwnerGuard implements CanActivate {
  // Allows workspace owner or admin
}

// workspace-member.guard.ts
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  // Allows workspace owner, member, or admin
}
```

### Service Methods

```typescript
// WorkspacesService

async addMember(workspaceId: string, userId: string, role: WorkspaceRole, actorId: string) {
  // Check: actor is workspace owner or admin
  // Check: user exists in organization
  // Check: user is not already in workspace
  // Create workspace_member record
  // Emit telemetry: workspace.member.added
}

async removeMember(workspaceId: string, userId: string, actorId: string) {
  // Check: actor is workspace owner or admin
  // Check: cannot remove workspace owner (must change owner first)
  // Remove workspace_member record
  // Emit telemetry: workspace.member.removed
}

async changeMemberRole(workspaceId: string, userId: string, newRole: WorkspaceRole, actorId: string) {
  // Check: actor is workspace owner or admin
  // Check: cannot change workspace owner role (use assignOwner instead)
  // Update workspace_member role
  // Emit telemetry: workspace.role.changed
}

async assignOwner(workspaceId: string, newOwnerId: string, actorId: string) {
  // Check: actor is admin only
  // Check: new owner exists in organization
  // Demote previous owner to workspace_member
  // Update workspace.ownerId
  // Update workspace_member record for new owner
  // Emit telemetry: workspace.owner.changed
}
```

---

## Frontend Implementation Details

### Workspace Settings Modal - Members Tab

```typescript
// Components/WorkspaceSettingsModal.tsx

const MembersTab = () => {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [orgUsers, setOrgUsers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  const isAdmin = user.role === 'admin' || user.role === 'owner';
  const isWorkspaceOwner = workspace.ownerId === user.id;
  const canManageMembers = isAdmin || isWorkspaceOwner;

  // Fetch org users (existing users only)
  useEffect(() => {
    fetchOrgUsers();
  }, []);

  const handleAddMember = (userId: string, role: WorkspaceRole) => {
    // Call API: POST /api/workspaces/:id/members
    // Only existing org users can be added
  };

  return (
    <div>
      {canManageMembers && (
        <button onClick={openAddMemberModal}>
          Add Member
        </button>
      )}
      {isAdmin && (
        <Link to="/admin/invite">
          Invite New User to Organization
        </Link>
      )}
      {/* Members list with role change and remove */}
    </div>
  );
};
```

### Admin Panel - Workspace Management

```typescript
// pages/admin/AdminWorkspacesPage.tsx

const CreateWorkspaceModal = () => {
  const [orgUsers, setOrgUsers] = useState([]);

  const handleCreate = async (data: { name, description, ownerId }) => {
    // POST /api/workspaces
    // Requires: ownerId (must be existing org user)
    // Admin only
  };
};

const WorkspaceDetailPage = () => {
  const handleChangeOwner = async (newOwnerId: string) => {
    // PATCH /api/workspaces/:id/owner
    // Admin only
    // Auto-demotes previous owner
  };

  const handleAddMember = async (userId: string, role: WorkspaceRole) => {
    // POST /api/workspaces/:id/members
    // Admin or workspace owner
    // Only existing org users
  };
};
```

---

## Telemetry Events

```typescript
// All workspace actions should emit telemetry

track('workspace.member.added', {
  workspaceId,
  userId,
  role,
  actorId,
});

track('workspace.member.removed', {
  workspaceId,
  userId,
  actorId,
});

track('workspace.role.changed', {
  workspaceId,
  userId,
  oldRole,
  newRole,
  actorId,
});

track('workspace.owner.changed', {
  workspaceId,
  oldOwnerId,
  newOwnerId,
  actorId,
});
```

---

## Database Schema Updates

### Workspace Entity
```typescript
{
  id: uuid;
  name: string;
  description?: string;
  organizationId: uuid;
  ownerId: uuid; // User ID of workspace owner
  visibility: 'private' | 'public';
  createdAt: timestamp;
  updatedAt: timestamp;
  deletedAt: timestamp; // Soft delete
}
```

### Workspace Member Entity
```typescript
{
  id: uuid;
  workspaceId: uuid;
  userId: uuid;
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
  invitedBy: uuid; // User ID who added/invited
  createdAt: timestamp;
  updatedAt: timestamp;

  // Unique constraint: (workspaceId, userId)
}
```

### Project Entity
```typescript
{
  id: uuid;
  workspaceId: uuid; // REQUIRED - NOT NULL
  name: string;
  // ... other fields
}
```

---

## API Endpoints

### Workspace Management (Admin Only)
```
POST   /api/workspaces                    # Create workspace + assign owner
PATCH  /api/workspaces/:id/owner          # Change workspace owner (admin only)
DELETE /api/workspaces/:id                # Delete workspace (owner or admin)
```

### Workspace Members (Owner or Admin)
```
POST   /api/workspaces/:id/members        # Add existing user to workspace
PATCH  /api/workspaces/:id/members/:userId # Change member role
DELETE /api/workspaces/:id/members/:userId # Remove member
GET    /api/workspaces/:id/members        # List workspace members
```

### Organization Users (For Member Selection)
```
GET    /api/organizations/users           # Get all org users (for workspace member selection)
```

---

## Testing Checklist

- [ ] Admin can create workspace and assign owner
- [ ] Admin can change workspace owner (previous owner demoted to member)
- [ ] Admin can add existing org users to workspace
- [ ] Admin can remove members from workspace
- [ ] Workspace owner can add existing org users to workspace
- [ ] Workspace owner can change member roles (member ↔ viewer)
- [ ] Workspace owner can remove members from workspace
- [ ] Workspace owner CANNOT invite new users (external)
- [ ] Workspace owner CANNOT assign workspace owner
- [ ] Workspace member CANNOT add/remove members
- [ ] Workspace viewer CANNOT add/remove members
- [ ] Project creation requires workspaceId (NOT NULL)
- [ ] Project creation requires user to be workspace owner or member
- [ ] Workspace viewer cannot create projects
- [ ] Telemetry events are emitted for all actions

