# Tester Focus Areas - Explicit Instructions

## 🎯 What to Focus On

### Admin Flow (tester-admin@zephix.ai)

**Test these specific behaviors:**

1. **Workspace Creation**
   - ✅ Workspace creation works without errors
   - ✅ After creation, you are redirected to the workspace
   - ✅ No errors in browser console

2. **Empty Workspace State**
   - ✅ Empty workspace shows correct empty state (not dashboard with empty sections)
   - ✅ Empty state has clear title: "[Workspace Name] is empty"
   - ✅ Empty state shows action buttons:
     - Template Center
     - New Blank Project
     - New Document (may be disabled)
     - New Folder (may be disabled)
   - ❌ **NO prepopulated projects or folders** - If you see any, this is a bug

3. **Ownership and Member Roles**
   - ✅ You appear as "Owner" (or workspace_owner) in Members tab
   - ✅ You can add workspace owners, members, and viewers
   - ✅ Role changes work correctly
   - ✅ Members are grouped by role (Owners, Members, Viewers)

4. **Last Owner Protection**
   - ✅ Cannot remove yourself as owner if you're the only owner
   - ✅ Cannot demote yourself if you're the only owner
   - ✅ Clear error message when attempting to remove/demote last owner
   - ✅ Can remove/demote yourself if another owner exists

### Member Flow (tester-member@zephix.ai)

**Test these specific behaviors:**

1. **No Workspace Creation Entry Point**
   - ❌ Does NOT see "Create workspace" button in sidebar
   - ❌ Does NOT see workspace creation in any menu

2. **Access Rights**
   - ✅ Can see workspaces where added as member
   - ✅ Can see members list (read-only)
   - ❌ Cannot add members
   - ❌ Cannot change member roles
   - ❌ Cannot remove members
   - ❌ No "owner" controls visible

### Viewer Flow (tester-viewer@zephix.ai)

**Test these specific behaviors:**

1. **No Workspace Creation Entry Point**
   - ❌ Does NOT see "Create workspace" button
   - ❌ Does NOT see workspace creation in any menu

2. **Access Rights**
   - ✅ Can see workspaces where added as viewer
   - ✅ Can see members list (read-only)
   - ❌ Cannot change anything
   - ❌ No management controls visible

## 🚩 Red Flags - Report Immediately

These are critical bugs:

1. **Any prepopulated projects or folders in a new workspace**
   - A brand new workspace must be completely empty
   - If you see ANY content you didn't create, report it

2. **Any non-admin with "Create workspace" button**
   - Only admin/owner should see this
   - If member or viewer sees it, report it

3. **Any unexpected 4xx/5xx errors on basic flows**
   - Creating workspace should return 201
   - Adding members should return 201
   - Listing members should return 200
   - If you see 403, 404, 500, etc. on these basic flows, report it

4. **Last owner can be removed or demoted**
   - This should be blocked with a clear error message
   - If it's allowed, report it

## 📝 Reporting

Use **BUG_REPORT_TEMPLATE.md** for each issue.

For each red flag, include:
- Screenshot
- Browser console errors (F12 → Console)
- Network tab details (F12 → Network → find the failed request)









