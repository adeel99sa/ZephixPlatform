# Workspace Ownership & Membership - Verification Checklist

## Pre-Testing Setup

- [ ] Migration `1765000000008-UpdateWorkspaceMemberRoles` has been run
- [ ] Backend is running and healthy (`GET /api/health` returns 200)
- [ ] Three test accounts exist in same organization:
  - Admin/Owner account
  - Member account
  - Viewer account

## Backend Verification

### Database Check
```sql
-- Verify role values in workspace_members
SELECT DISTINCT role FROM workspace_members ORDER BY role;
-- Expected: workspace_owner, workspace_member, workspace_viewer
```

### API Health Check
- [ ] `GET /api/health` → 200 OK
- [ ] `GET /api/workspaces` → 200 OK (no errors in logs)

## Frontend Verification

### 1. Workspace Creation Visibility
- [ ] Admin sees "Create workspace" button
- [ ] Member does NOT see "Create workspace" button
- [ ] Viewer does NOT see "Create workspace" button

### 2. Workspace Creation Flow
- [ ] Admin can create workspace
- [ ] After creation, admin appears as workspace_owner in members tab
- [ ] Workspace appears in sidebar dropdown

### 3. Empty State
- [ ] New workspace shows empty state (not dashboard with empty sections)
- [ ] Empty state has clear title and description
- [ ] Empty state shows action buttons:
  - [ ] Template Center
  - [ ] New Blank Project
  - [ ] New Document (may be disabled)
  - [ ] New Folder (may be disabled)
- [ ] No projects auto-created
- [ ] No folders auto-created
- [ ] No demo content
- [ ] No 404 errors visible to user (handled gracefully)

### 4. Members Management
- [ ] Admin/owner can add members
- [ ] Admin/owner can change member roles
- [ ] Admin/owner can remove members (except last owner)
- [ ] Member cannot add/change/remove members
- [ ] Viewer cannot add/change/remove members
- [ ] Members grouped by role (Owners, Members, Viewers)
- [ ] Last owner protection works (cannot remove/demote)

### 5. API-Level Checks
- [ ] Admin: `POST /api/workspaces` → 201
- [ ] Admin: `GET /api/workspaces/:id/members` → 200, shows workspace_owner
- [ ] Admin: `POST /api/workspaces/:id/members` → 201
- [ ] Member: `POST /api/workspaces` → 403
- [ ] Member: `POST /api/workspaces/:id/members` → 403
- [ ] Last owner removal → 400/409 with clear message

## Known Issues / Notes

- Old demo workspaces may exist - ignore them, focus on newly created workspaces
- Console may show 404s for tasks/updates endpoints on empty workspaces - this is expected and handled
- Role display: UI shows "Owner/Member/Viewer", API uses "workspace_owner/workspace_member/workspace_viewer" - both correct

## Issues Found

List any behavior that doesn't match expected results:

1.
2.
3.








