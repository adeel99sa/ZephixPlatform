# Smoke Test Checklist - Before Tester Handoff

## ✅ Pre-Smoke Test Setup

1. **Run Migrations**
   ```bash
   cd zephix-backend
   npm run migration:run
   ```
   Expected: "No migrations are pending" or successful migration execution

2. **Setup Tester Org**
   ```bash
   npm run setup:tester-org
   ```
   Expected: Three test accounts created, zero workspaces

3. **Start Backend**
   ```bash
   npm run start:dev
   ```
   Expected: Backend starts on port 3000 (or configured port)

4. **Start Frontend**
   ```bash
   cd zephix-frontend
   npm run dev
   ```
   Expected: Frontend starts on port 5173 (or configured port)

## 🧪 Smoke Test Steps

### Step 1: Login
- [ ] Open http://localhost:5173
- [ ] Log in as `tester-admin@zephix.ai` / `Test123!@#`
- [ ] Login succeeds, no errors

### Step 2: Verify Create Workspace Button
- [ ] Sidebar shows "Create workspace" button or "+" icon
- [ ] Button is visible and clickable

### Step 3: Create Workspace
- [ ] Click "Create workspace"
- [ ] Modal/form opens
- [ ] Enter:
  - Name: "Tester WS 1"
  - Slug: "tester-ws-1" (optional)
- [ ] Click "Create"
- [ ] Workspace creates without error
- [ ] No 4xx/5xx errors in browser console

### Step 4: Verify Empty State
- [ ] After creation, redirected to workspace
- [ ] Workspace home shows empty state (not dashboard with empty sections)
- [ ] Empty state title: "Tester WS 1 is empty" (or similar)
- [ ] Empty state shows action buttons:
  - Template Center
  - New Blank Project
  - New Document (may be disabled)
  - New Folder (may be disabled)
- [ ] **NO projects visible**
- [ ] **NO folders visible**
- [ ] **NO auto-generated content of any kind**

### Step 5: Verify Members Tab
- [ ] Open workspace settings (⌘K or settings icon)
- [ ] Navigate to "Members" tab
- [ ] You see yourself listed
- [ ] Your role shows as "Owner" (or workspace_owner)
- [ ] You see "Invite Member" or "Add Member" button
- [ ] Members are grouped by role (Owners section visible)

## ✅ Pass Criteria

**All checks must pass before handing off to tester:**

- ✅ Create workspace button visible
- ✅ Workspace creation succeeds
- ✅ Empty state appears (not dashboard)
- ✅ No projects or folders in new workspace
- ✅ Members tab shows you as Owner
- ✅ No console errors during basic flow

## ❌ Stop Criteria

**If ANY of these fail, STOP and report:**

- ❌ Cannot log in
- ❌ Create workspace button not visible
- ❌ Workspace creation fails
- ❌ Empty state doesn't appear
- ❌ Projects or folders visible in new workspace
- ❌ Members tab doesn't show you as Owner
- ❌ Console errors on basic operations

## 📝 Report Format

If smoke test fails, report:

```
Smoke Test Failure Report

Step that failed: [Step number]
Expected: [What should happen]
Actual: [What actually happened]
Error: [Exact error message]
Console errors: [Paste console errors]
Network errors: [Paste network tab errors]
```









