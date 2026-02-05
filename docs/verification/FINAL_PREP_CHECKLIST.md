# Final Prep Checklist - Before Tester Handoff

## ✅ Pre-Handoff Steps

### 0. Ensure Database Migrations Are Run
```bash
cd zephix-backend
npm run migration:run
```

**Important:** The setup script requires database tables to exist. Run migrations first.

### 1. Setup Tester Organization
```bash
cd zephix-backend
npm run setup:tester-org
```

**Expected Output:**
- Organization "Tester Organization" created
- Three test accounts created:
  - tester-admin@zephix.ai
  - tester-member@zephix.ai
  - tester-viewer@zephix.ai
- Password: Test123!@#
- Zero workspaces in org

**Note:** If you see "relation does not exist" error, run migrations first (step 0).

### 2. Start Services

**Backend:**
```bash
cd zephix-backend
npm run start:dev
```

**Frontend:**
```bash
cd zephix-frontend
npm run dev
```

### 3. Sanity Check (As You)

Log in as `tester-admin@zephix.ai` / `Test123!@#`

**Checklist:**
- [ ] You see "Create workspace" button in sidebar
- [ ] You can click and open workspace creation modal
- [ ] You can create a workspace (e.g., "Test Workspace 1")
- [ ] After creation, workspace appears in sidebar
- [ ] New workspace shows empty state (no projects, no folders)
- [ ] Empty state shows action buttons (Template Center, New Blank Project, etc.)
- [ ] Open workspace settings (⌘K or settings icon)
- [ ] Go to "Members" tab
- [ ] You see yourself listed as "Owner" (or workspace_owner)
- [ ] You see "Invite Member" or "Add Member" button
- [ ] Members are grouped by role (Owners, Members, Viewers sections)

**If all pass:** ✅ Ready for tester handoff

**If any fail:** Fix the issue before handing off

### 4. Prepare Documents for Tester

Send these files:
- [ ] `docs/SETUP_TESTER_ENVIRONMENT.md`
- [ ] `docs/TESTER_WORKSPACE_SCRIPT.md`
- [ ] `docs/VERIFICATION_CHECKLIST.md`
- [ ] `docs/TESTER_HANDOFF.md`
- [ ] `docs/BUG_REPORT_TEMPLATE.md`
- [ ] `docs/TESTER_MESSAGE.md` (or use as template for your message)

### 5. Send Tester Message

Use `docs/TESTER_MESSAGE.md` as template or send it directly.

Include:
- Test account credentials
- Links to all documents
- Focus areas
- How to report bugs

## 🚫 During Testing

**DO NOT:**
- Change workspace behavior
- Modify membership logic
- Update role definitions
- Add new features

**DO:**
- Monitor for critical bugs
- Answer tester questions about expected behavior
- Collect bug reports

## 📋 After Testing

When you receive tester feedback:

1. **Categorize Issues:**
   - Must fix before next round
   - Safe to defer to Phase B/C/D
   - Environment or data issues

2. **Fix Critical Bugs:**
   - Auto content in new workspace
   - Wrong visibility (non-admin seeing create button)
   - Last owner protection failures
   - API errors on basic flows

3. **Plan Next Phase:**
   - Phase B: Workspace ownership UX polish
   - Phase C: Project transfer
   - Phase D: Project duplication

