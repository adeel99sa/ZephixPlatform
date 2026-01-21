# RBAC and Workspace Behavior - One Pager

**For testers and new team members**

## Platform Roles (Organization Level)

### ADMIN
- **Can:** Create workspaces, manage all content, access admin dashboards, manage organization settings
- **Cannot:** N/A (full authority)
- **Workspace access:** Automatically has `workspace_owner` role in all workspaces

### MEMBER
- **Can:** Access workspaces where they are members, create/update projects and work items
- **Cannot:** Create workspaces, manage organization settings, manage workspace membership (unless workspace_owner)
- **Workspace access:** Based on WorkspaceMember record

### VIEWER
- **Can:** View content in workspaces where they have access
- **Cannot:** Create workspaces, create or edit content, manage anything
- **Workspace access:** Read-only based on WorkspaceMember record

## Workspace Roles (Per Workspace)

### workspace_owner
- **Can:** Manage workspace settings, add/remove members, change member roles, delete workspace
- **Cannot:** Remove or demote the last workspace_owner (must transfer ownership first)

### workspace_member
- **Can:** View workspace, create projects, create/update tasks and work items
- **Cannot:** Manage workspace settings, manage membership

### workspace_viewer
- **Can:** View workspace content
- **Cannot:** Create or edit anything

## Key Behaviors

### Workspace Creation
- **Only ADMIN can create workspaces**
- Creator automatically becomes `workspace_owner`
- New workspace starts **completely empty** (no auto-created projects or folders)

### Last Owner Protection
- A workspace must always have at least one `workspace_owner`
- Cannot remove or demote the last owner
- Must transfer ownership to another user first

### Effective Role
- Platform ADMIN → always `workspace_owner` in all workspaces (even without membership record)
- Platform MEMBER/VIEWER → role from WorkspaceMember record, or no access if no record

## UI Visibility Rules

### "Create workspace" Button
- **Visible to:** ADMIN only
- **Hidden from:** MEMBER and VIEWER

### Members Tab
- **Role dropdowns visible to:** ADMIN and workspace_owner only
- **Remove actions visible to:** ADMIN and workspace_owner only
- **Last owner protection:** UI disables demote/remove for last owner

### Empty Workspace
- Shows empty state with action buttons:
  - "Template Center"
  - "New Blank Project"
  - "New Document" (coming soon)
  - "New Folder" (coming soon)
- Actions respect workspace role (backend enforces)

## Testing Scenarios

### As ADMIN
1. ✅ Can see "Create workspace" button
2. ✅ Can create workspace and becomes owner
3. ✅ Can manage members in any workspace
4. ✅ Can transfer workspace ownership
5. ✅ Can delete workspaces

### As MEMBER
1. ❌ Cannot see "Create workspace" button
2. ✅ Can access workspaces where they are members
3. ✅ Can create projects in workspaces where they are workspace_member or workspace_owner
4. ❌ Cannot manage workspace membership (unless workspace_owner)
5. ❌ Cannot delete workspaces

### As VIEWER
1. ❌ Cannot see "Create workspace" button
2. ✅ Can view workspaces where they are workspace_viewer
3. ❌ Cannot create or edit anything
4. ❌ Cannot manage workspace membership

## Common Issues

### "I can't create a workspace"
- **Check:** Are you logged in as ADMIN? Only ADMIN can create workspaces.

### "I can't remove this member"
- **Check:** Is this the last workspace_owner? You must transfer ownership first.

### "I can't see the workspace"
- **Check:** Are you a member of this workspace? MEMBER and VIEWER need explicit membership.

### "Workspace is empty but shows errors"
- **Expected:** Empty workspaces may return 404 for KPIs/summaries. UI should show empty state gracefully.

## Quick Reference

| Platform Role | Can Create Workspace? | Workspace Access | Can Manage Members? |
|--------------|----------------------|------------------|---------------------|
| ADMIN | ✅ Yes | All (as workspace_owner) | ✅ Yes (all workspaces) |
| MEMBER | ❌ No | Only where member | Only if workspace_owner |
| VIEWER | ❌ No | Only where viewer | ❌ No |

| Workspace Role | Can Manage Settings? | Can Manage Members? | Can Create Projects? |
|----------------|---------------------|---------------------|---------------------|
| workspace_owner | ✅ Yes | ✅ Yes | ✅ Yes |
| workspace_member | ❌ No | ❌ No | ✅ Yes |
| workspace_viewer | ❌ No | ❌ No | ❌ No |

## Roadmap Features (Not Yet Available)

The following features are **planned but not yet implemented**. Do not test for them:

- **Ownership Transfer** (Phase B) - Transfer workspace ownership to another user
- **Project Transfer** (Phase C) - Move projects between workspaces
- **Project Duplication** (Phase D) - Duplicate projects as template or full copy

These features will be available in future releases. See `docs/PHASE_B_C_D_ROADMAP.md` for details.

---

**For detailed implementation docs, see:**
- `docs/RBAC_IMPLEMENTATION_COMPLETE.md`
- `docs/RBAC_ROLE_STRING_LEAKS.md`
- `docs/PHASE_B_C_D_ROADMAP.md` - Planned features







