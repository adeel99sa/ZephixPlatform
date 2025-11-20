# Zephix Workspace Permission Model - Architecture

## Core Principles

### 1. **Workspace Creation & Ownership**
- ✅ **Only Admins** can create workspaces
- ✅ **Only Admins** can add users to workspaces
- ✅ **Only Admins** can assign workspace owners
- ✅ **Workspace Owners** can invite members to their workspace
- ✅ **Workspace Owners** cannot create new workspaces (only admins)

### 2. **Project Creation**
- ✅ Projects **MUST** be created inside a workspace
- ❌ Projects **CANNOT** be created outside a workspace
- ✅ Workspace owners and members can create projects
- ❌ Workspace viewers cannot create projects

### 3. **Role Hierarchy**
```
Organization Level:
  Admin/Owner > PM > Viewer

Workspace Level:
  workspace_owner > workspace_member > workspace_viewer
```

---

## Permission Matrix

| Capability | Workspace Owner | Workspace Member | Workspace Viewer |
|------------|----------------|------------------|------------------|
| **Workspace Management** |
| Create Workspace | ❌ (Admin only) | ❌ | ❌ |
| Edit Workspace Name/Description | ✅ | ❌ | ❌ |
| Delete Workspace | ✅ | ❌ | ❌ |
| Invite Members to Workspace | ✅ | ✅ | ❌ |
| Remove Members from Workspace | ✅ | ❌ | ❌ |
| Change Member Roles | ✅ | ❌ | ❌ |
| View Members List | ✅ | ✅ | ✅ |
| Manage Workspace Settings | ✅ | ❌ | ❌ |
| View Workspace Settings | ✅ | ✅ | ✅ (read-only) |
| **Project Management** |
| Create Projects | ✅ | ✅ | ❌ |
| Edit Projects | ✅ | ✅ (own only) | ❌ |
| Delete Projects | ✅ | ✅ (own only, if granted) | ❌ |
| Duplicate/Save as Template | ✅ | ✅ | ❌ |
| **Templates** |
| Access Templates Center | ✅ | ✅ | ✅ (read-only) |
| Apply Templates to New Projects | ✅ | ✅ | ❌ |
| **Analytics & Dashboards** |
| View Analytics Dashboards | ✅ | ✅ | ✅ |
| Create/Edit Dashboards | ✅ | ✅ | ❌ |
| **Resources & Portfolio** |
| Access Resource Directory | ✅ | ✅ | ✅ |
| Edit Resource Allocations | ✅ | ✅ | ❌ |
| Access Portfolio View | ✅ | ✅ | ✅ |
| Create Portfolio Reports | ✅ | ✅ | ❌ |
| **Tasks** |
| View Tasks | ✅ | ✅ | ✅ |
| Edit Tasks | ✅ | ✅ (own tasks) | ❌ |
| Assign Tasks | ✅ | ✅ | ❌ |
| Comment on Tasks | ✅ | ✅ | ✅ |
| **Automation & Integrations** |
| Manage Automations | ✅ | ✅ (if granted) | ❌ |
| Manage Workspace Integrations | ✅ | ❌ | ❌ |
| **Archive & Trash** |
| Access Workspace Trash/Archive | ✅ | ✅ (view only) | ❌ |
| Restore Deleted Items | ✅ | ❌ | ❌ |
| **AI & Insights** |
| Access AI Assistant | ✅ | ✅ | ✅ (read-only) |

---

## Admin Panel Implications

### **Admin-Only Functions**

1. **Workspace Creation** (`/admin/workspaces`)
   - Create new workspace
   - Set workspace name, description
   - Assign initial workspace owner
   - Set workspace visibility (private/public)

2. **Workspace Ownership Assignment** (`/admin/workspaces/:id`)
   - View current workspace owner
   - Change workspace owner (only admins can do this)
   - View all workspace members

3. **User-to-Workspace Assignment** (`/admin/users` or `/admin/workspaces/:id/members`)
   - Add users to workspaces
   - Assign workspace roles (owner/member/viewer)
   - Remove users from workspaces
   - **Note**: Once added, workspace owners can invite more members

### **Workspace Owner Functions** (Not in Admin Panel)

Workspace owners manage their workspace through the main app:
- Invite members (via workspace settings)
- Change member roles within their workspace
- Manage workspace settings
- Create projects
- Manage workspace content

---

## Admin Panel Structure (Updated)

### **Workspaces & Projects Section**

```
📁 Workspaces & Projects
   ├─ All Workspaces
   │   ├─ Create Workspace (Admin only)
   │   ├─ Edit Workspace
   │   ├─ Delete Workspace
   │   ├─ Assign Workspace Owner (Admin only)
   │   └─ View Workspace Members
   ├─ All Projects
   │   ├─ View all projects across workspaces
   │   ├─ Filter by workspace
   │   └─ View project details
   ├─ Archive
   │   ├─ View archived workspaces
   │   ├─ View archived projects
   │   └─ Restore (Admin only)
   └─ Trash
       ├─ View deleted items
       └─ Purge (Admin only)
```

### **Key Admin Actions**

1. **Create Workspace Modal**
   - Workspace name
   - Description
   - Initial owner selection (dropdown of users)
   - Visibility settings
   - **Action**: Creates workspace and assigns owner

2. **Workspace Detail Page**
   - Current owner display
   - "Change Owner" button (Admin only)
   - Members list with roles
   - "Add Member" button (Admin only)
   - Workspace settings (read-only for admin, editable by owner in main app)

3. **User Management Integration**
   - When viewing a user, show:
     - Workspaces they belong to
     - Their role in each workspace
     - "Add to Workspace" action (Admin only)

---

## Backend API Requirements

### **Workspace Creation** (Admin Only)
```typescript
POST /api/workspaces
{
  name: string;
  description?: string;
  ownerId: string; // User ID to assign as workspace owner
  visibility: 'private' | 'public';
}

// Enforce: Only admins can call this
@UseGuards(JwtAuthGuard, AdminGuard)
```

### **Assign Workspace Owner** (Admin Only)
```typescript
PATCH /api/workspaces/:id/owner
{
  ownerId: string; // New owner user ID
}

// Enforce: Only admins can call this
@UseGuards(JwtAuthGuard, AdminGuard)
```

### **Add User to Workspace** (Admin Only)
```typescript
POST /api/workspaces/:id/members
{
  userId: string;
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
}

// Enforce: Only admins can call this
@UseGuards(JwtAuthGuard, AdminGuard)
```

### **Workspace Owner Invite** (Owner Only)
```typescript
POST /api/workspaces/:id/invite
{
  email: string;
  role: 'workspace_member' | 'workspace_viewer'; // Cannot assign owner
}

// Enforce: Only workspace owners can call this
@UseGuards(JwtAuthGuard, WorkspaceOwnerGuard)
```

### **Project Creation** (Owner/Member Only)
```typescript
POST /api/projects
{
  workspaceId: string; // REQUIRED - cannot be null
  name: string;
  // ... other fields
}

// Enforce: workspaceId is required, user must be workspace owner or member
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
```

---

## Frontend UI Rules

### **Admin Panel**

1. **Workspace List** (`/admin/workspaces`)
   - "Create Workspace" button (always visible for admins)
   - Each workspace shows:
     - Name, description
     - Current owner (with "Change Owner" button)
     - Member count
     - Project count

2. **Workspace Detail** (`/admin/workspaces/:id`)
   - Owner section with "Change Owner" dropdown
   - Members table with:
     - User name, email
     - Role badge
     - "Remove" button (admin only)
   - "Add Member" button (admin only)
   - Projects list (read-only)

3. **User Detail** (`/admin/users/:id`)
   - Workspaces section showing:
     - Workspace name
     - Role in workspace
     - "Remove from Workspace" action
   - "Add to Workspace" button (admin only)

### **Main App (Workspace Owner View)**

1. **Workspace Settings** (accessible to workspace owners)
   - General settings (name, description)
   - Members tab:
     - List of members
     - "Invite Member" button
     - Role change dropdown (for owners)
     - Remove member (for owners)
   - Integrations
   - Permissions matrix view

2. **Project Creation**
   - Project creation modal requires workspace selection
   - Cannot create project without workspace
   - Workspace dropdown shows only workspaces where user is owner/member

---

## Database Schema Implications

### **Workspace Entity**
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
}
```

### **Workspace Member Entity**
```typescript
{
  id: uuid;
  workspaceId: uuid;
  userId: uuid;
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
  invitedBy: uuid; // User ID who added/invited
  createdAt: timestamp;
}
```

### **Project Entity**
```typescript
{
  id: uuid;
  workspaceId: uuid; // REQUIRED - NOT NULL
  name: string;
  // ... other fields
}
```

---

## Validation Rules

### **Backend Validation**

1. **Workspace Creation**
   - ✅ Require `AdminGuard`
   - ✅ Validate `ownerId` exists and belongs to organization
   - ✅ Create workspace with owner
   - ✅ Create workspace_member record with role 'workspace_owner'

2. **Project Creation**
   - ✅ Require `workspaceId` (NOT NULL)
   - ✅ Validate user is workspace owner or member
   - ✅ Reject if user is workspace viewer
   - ✅ Reject if workspaceId is invalid

3. **Workspace Owner Assignment**
   - ✅ Require `AdminGuard`
   - ✅ Validate new owner belongs to organization
   - ✅ Update workspace.ownerId
   - ✅ Update workspace_member role to 'workspace_owner'
   - ✅ Optionally demote previous owner to 'workspace_member'

4. **Workspace Member Invitation (by Owner)**
   - ✅ Require `WorkspaceOwnerGuard`
   - ✅ Cannot assign 'workspace_owner' role (only admins can)
   - ✅ Can only assign 'workspace_member' or 'workspace_viewer'

---

## Summary

### **Admin Responsibilities**
- Create workspaces
- Assign workspace owners
- Add users to workspaces
- Remove users from workspaces
- Change workspace ownership
- View all workspaces and projects

### **Workspace Owner Responsibilities**
- Invite members to their workspace
- Change member roles (within their workspace)
- Manage workspace settings
- Create and manage projects
- Manage workspace content

### **Key Constraints**
- Projects MUST have a workspace
- Only admins can create workspaces
- Only admins can assign workspace owners
- Workspace owners can invite members but cannot assign owners
- Workspace owners cannot create new workspaces

---

## Questions for Clarification

1. **Can a user be owner of multiple workspaces?** (I assume yes)
2. **Can a user be member of multiple workspaces?** (I assume yes)
3. **When admin changes workspace owner, what happens to the previous owner?**
   - Option A: Demote to workspace_member
   - Option B: Remove from workspace
   - Option C: Keep as workspace_owner (multiple owners allowed)
4. **Can workspace owners delete their workspace?** (I assume yes, but should confirm)
5. **Can admins see all projects across all workspaces?** (I assume yes)

