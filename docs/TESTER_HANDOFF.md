# Workspace Ownership & Membership - Tester Handoff

## ✅ Pre-Testing Checklist

Before handing off to testers, verify:

- [ ] Migration `1765000000008-UpdateWorkspaceMemberRoles` has been run
- [ ] Backend is running and healthy (`GET /api/health` returns 200)
- [ ] Clean tester organization has been created (Option A recommended)
- [ ] Three test accounts exist and can log in:
  - `tester-admin@zephix.ai` (admin role)
  - `tester-member@zephix.ai` (member role)
  - `tester-viewer@zephix.ai` (viewer role)
- [ ] Tester organization has zero workspaces (or only tester-created ones)

## 📋 Documents for Tester

Provide these four documents:

1. **`docs/SETUP_TESTER_ENVIRONMENT.md`** - Environment setup instructions
2. **`docs/TESTER_WORKSPACE_SCRIPT.md`** - Step-by-step testing script
3. **`docs/VERIFICATION_CHECKLIST.md`** - Quick verification checklist
4. **`docs/WORKSPACE_IMPLEMENTATION_STATUS.md`** - What's implemented vs planned

## 🎯 Key Testing Focus Areas

### 1. Workspace Creation Visibility
- ✅ Admin sees "Create workspace" button
- ❌ Member does NOT see "Create workspace" button
- ❌ Viewer does NOT see "Create workspace" button

### 2. Empty State (CRITICAL)
- ✅ New workspace shows clean empty state
- ❌ NO projects auto-created
- ❌ NO folders auto-created
- ❌ NO demo content
- ✅ Clear action buttons visible (Template Center, New Blank Project, etc.)

### 3. Ownership & Membership
- ✅ Creator becomes workspace_owner
- ✅ Owner can add members (workspace_member, workspace_viewer)
- ✅ Owner can promote members to owner
- ❌ Cannot remove/demote last owner
- ❌ Member/viewer cannot manage members

## ⚠️ Critical Bug to Watch For

**If ANY content (projects, folders, etc.) appears in a brand new workspace that the user did not explicitly create, this is a bug and must be reported immediately.**

## 🔧 Setup Instructions for Tester

### Option A: Clean Organization (Recommended)

1. Run setup script:
   ```bash
   cd zephix-backend
   npm run setup:tester-org
   ```

2. Test accounts created:
   - Email: `tester-admin@zephix.ai` / Password: `Test123!@#`
   - Email: `tester-member@zephix.ai` / Password: `Test123!@#`
   - Email: `tester-viewer@zephix.ai` / Password: `Test123!@#`

3. Verify clean state:
   - Log in as admin
   - Should see zero workspaces
   - Should see "Create workspace" button

### Option B: Clean Existing Org

See `docs/SETUP_TESTER_ENVIRONMENT.md` for instructions.

## 📝 What Testers Should Report

For each issue, report:
1. **Step number** from tester script
2. **Expected behavior** (from script)
3. **Actual behavior** (what happened)
4. **Browser console errors** (if any)
5. **Screenshot** (if helpful)
6. **Account used** (admin/member/viewer)

## 🚀 Post-Testing Next Steps

After testers complete first pass:

1. **Backend Tests**
   - Workspace creation creates workspace_owner membership
   - getEffectiveWorkspaceRole returns correct roles
   - Membership endpoints enforce permissions
   - Last owner protection works

2. **Frontend E2E Tests**
   - Workspace creation visibility
   - Empty state flows
   - Membership actions and protections

3. **Fix any bugs** reported by testers

4. **Re-test** after fixes

## 📚 Related Documentation

- `docs/WORKSPACES_OWNERSHIP_AND_MEMBERSHIP.md` - Technical implementation details
- `docs/PHASE_0_WORKSPACE_BASELINE.md` - Architecture baseline
- `docs/SETUP_TESTER_ENVIRONMENT.md` - Environment setup guide

