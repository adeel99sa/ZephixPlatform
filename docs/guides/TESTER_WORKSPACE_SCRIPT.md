# Workspace Ownership & Membership - Tester Script

## ⚠️ IMPORTANT NOTE

**You should never see precreated projects or folders in a new workspace. If you do, record it as a bug.**

A brand new workspace must be completely empty - no auto-generated content of any kind.

## Prerequisites

You need three test accounts in the same organization:
- **Admin**: `tester-admin@zephix.ai` / `Test123!@#` (org admin/owner)
- **Member**: `tester-member@zephix.ai` / `Test123!@#` (org member)
- **Viewer**: `tester-viewer@zephix.ai` / `Test123!@#` (org viewer)

**Note**: If you see old demo workspaces from development, ignore them. Focus only on workspaces you create during testing.

## How to Use This Script

1. Follow each step in order
2. Compare "Actual" results with "Expected" results
3. If they don't match, report it using BUG_REPORT_TEMPLATE.md
4. Take screenshots when reporting bugs
5. Check browser console for errors (F12 → Console tab)

---

## 1. Admin Flow - Workspace Creation & Ownership

### Step 1.1: Verify Create Workspace Visibility
1. Log in as **admin@zephix.ai**
2. Look at the sidebar workspace selector
3. **Expected**: You see "Add new workspace" button or "+" icon
4. **If you don't see it**: This is a bug - only org admin/owner should see this

### Step 1.2: Create Workspace
1. Click "Add new workspace" or "+"
2. Fill in:
   - **Name**: `Workspace A`
   - **Slug**: (optional) `workspace-a`
3. Click "Create"
4. **Expected**:
   - Workspace is created
   - You are redirected to the workspace
   - No errors in console

### Step 1.3: Verify Ownership
1. Open workspace settings (⌘K or click settings icon)
2. Go to "Members" tab
3. **Expected**:
   - You see yourself listed
   - Your role shows as **"Owner"** (or "workspace_owner" in API)
   - You see "Invite Member" or "Add Member" button

### Step 1.4: Add Members
1. Click "Invite Member" or "Add Member"
2. Select an existing org user (e.g., `member@zephix.ai`)
3. Choose role: **"Member"** (workspace_member)
4. Click "Add"
5. **Expected**: User appears in members list with "Member" role
6. Repeat with another user as **"Viewer"** (workspace_viewer)
7. **Expected**: User appears with "Viewer" role

### Step 1.5: Test Last Owner Protection
1. Try to change your own role from "Owner" to "Member"
2. **Expected**: Error message: "Cannot demote the last workspace owner. This workspace needs at least one owner."
3. Try to remove yourself
4. **Expected**: Error message about last owner protection

### Step 1.6: Add Second Owner
1. Add another user as "Owner" (workspace_owner)
2. **Expected**: Success
3. Now try to demote the first owner
4. **Expected**: Success (since there's another owner)

---

## 2. Member Flow - No Creation, Limited Access

### Step 2.1: Verify No Create Button
1. Log out
2. Log in as **member@zephix.ai**
3. Look at sidebar workspace selector
4. **Expected**:
   - You do NOT see "Add new workspace" button
   - You only see workspace dropdown if you're a member of workspaces

### Step 2.2: Access Workspace A
1. If you were added as workspace_member to Workspace A:
   - You should see "Workspace A" in the dropdown
   - Click to open it
2. **Expected**:
   - Workspace opens successfully
   - You can see workspace content

### Step 2.3: Verify Members Tab (Read-Only)
1. Open workspace settings (⌘K)
2. Go to "Members" tab
3. **Expected**:
   - You see the members list
   - You do NOT see "Invite Member" or "Add Member" button
   - You do NOT see role change dropdowns
   - You do NOT see remove (X) buttons
   - Members are grouped by role: Owners, Members, Viewers

---

## 3. Viewer Flow - Read-Only Access

### Step 3.1: Access Workspace A
1. Log out
2. Log in as **viewer@zephix.ai**
3. If you were added as workspace_viewer to Workspace A:
   - You should see "Workspace A" in dropdown
   - Click to open it
4. **Expected**: Workspace opens successfully

### Step 3.2: Verify Members Tab (Read-Only)
1. Open workspace settings
2. Go to "Members" tab
3. **Expected**:
   - You see members list (read-only)
   - No management controls visible
   - Members grouped by role

---

## 4. Empty State Verification

### Step 4.1: Create New Empty Workspace
1. Log in as **admin@zephix.ai**
2. Create a brand new workspace: **"Workspace B"**
3. After creation, you should be redirected to the workspace

### Step 4.2: Verify Empty State
**Expected**:
- You see an empty state screen (not a dashboard with empty sections)
- Title: "[Workspace Name] is empty"
- Description: "Get started by creating your first project, document, or template."
- Action buttons visible:
  - **Template Center** (links to `/templates`)
  - **New Blank Project** (opens project creation modal)
  - **New Document** (may be disabled/coming soon)
  - **New Folder** (may be disabled/coming soon)

### Step 4.3: Verify No Auto Content ⚠️ CRITICAL
**Expected**:
- **NO projects auto-created** - If you see any projects, this is a bug
- **NO folders auto-created** - If you see any folders, this is a bug
- **NO demo content** - If you see demo projects/folders, this is a bug
- **NO navigation to internal demo projects** - Workspace should stay on empty state
- Workspace home does not show empty KPI cards or error messages
- **Nothing appears that the user did not explicitly create**

**If ANY content appears that you did not create, record it as a bug immediately.**

### Step 4.4: Test Action Buttons
1. Click **"Template Center"**
   - **Expected**: Navigates to template center page
2. Go back to Workspace B
3. Click **"New Blank Project"**
   - **Expected**: Opens project creation modal
   - Fill in name and create
   - **Expected**: Project is created, you're redirected to project page
   - **Expected**: Empty state disappears (workspace now has content)

---

## 5. API-Level Verification (Optional - Using REST Client)

### As Admin:
```bash
# Create workspace
POST /api/workspaces
{
  "name": "Test Workspace",
  "slug": "test-workspace"
}
# Expected: 201 Created

# Check members
GET /api/workspaces/{workspaceId}/members
# Expected: 200, one member with role "workspace_owner" (your user)

# Add member
POST /api/workspaces/{workspaceId}/members
{
  "userId": "{memberUserId}",
  "role": "workspace_member"
}
# Expected: 201 Created
```

### As Member:
```bash
# Try to create workspace
POST /api/workspaces
# Expected: 403 Forbidden

# Try to add member
POST /api/workspaces/{workspaceId}/members
# Expected: 403 Forbidden
```

### Last Owner Protection:
```bash
# As admin, try to remove only owner
DELETE /api/workspaces/{workspaceId}/members/{ownerUserId}
# Expected: 400/409 with message about last owner

# Add second owner first, then remove first
# Expected: Success (at least one owner remains)
```

---

## 6. Edge Cases to Verify

### 6.1: Workspace with Multiple Owners
- Add 2-3 owners
- Verify all can manage members
- Remove one owner → should succeed
- Remove all but one → last removal should fail

### 6.2: Role Changes
- Owner → Member: Should work if other owners exist
- Member → Viewer: Should work
- Viewer → Member: Should work
- Viewer → Owner: Should work (if you have permission)

### 6.3: Empty Workspace Navigation
- Create workspace → should show empty state
- Don't create any projects → empty state should persist
- Refresh page → empty state should still show
- Navigate away and back → empty state should still show

---

## Expected Behaviors Summary

| Action | Admin | Owner | Member | Viewer |
|--------|-------|-------|--------|--------|
| Create workspace | ✅ | ✅ | ❌ | ❌ |
| See "Add workspace" button | ✅ | ✅ | ❌ | ❌ |
| Add members | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| View members list | ✅ | ✅ | ✅ | ✅ |
| Remove last owner | ❌ | ❌ | ❌ | ❌ |

---

## Known Issues / Notes

- **Demo Workspaces**: If you see old demo workspaces from development, ignore them. Focus only on workspaces you create during testing.
- **404 Errors**: Empty workspaces may show 404s in browser console for tasks/updates endpoints - this is expected and handled gracefully. Users should not see these errors.
- **Role Display**: UI shows "Owner", "Member", "Viewer" but API uses "workspace_owner", "workspace_member", "workspace_viewer" - both are correct.
- **Auto Content**: If you see ANY projects, folders, or content in a brand new workspace that you did not create, this is a bug. Record it immediately.

---

## Reporting Issues

If you encounter any behavior that doesn't match the "Expected" results above, please report:
1. Which step number
2. What you expected
3. What actually happened
4. Browser console errors (if any)
5. Screenshot (if helpful)

