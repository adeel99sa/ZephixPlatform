# Phase 6 Tester Script - One Page

**Time**: 60 minutes | **Setup**: One workspace, one portfolio, one program

---

## 1. One Workspace Setup (10 min)

**As Admin:**
- [ ] Login → Go to `/workspaces` → Create workspace "Test Workspace"
- [ ] Open workspace → Settings → Add member → Assign as `workspace_owner`
- [ ] Owner invites 2-5 members to workspace

**Expected**: Workspace created, owner assigned, members invited.

---

## 2. Template to Project Flow (15 min)

**As Owner:**
- [ ] Go to workspace home (`/w/:slug/home`)
- [ ] Click "Create Project" → Select existing template → Create 3 projects from template
- [ ] Click "Create Project" → Create 2 standalone projects (no template)

**Expected**: 5 projects total (3 from template, 2 standalone).

---

## 3. Work Execution Proof (15 min)

**As Owner:**
- [ ] Open a project → Assign tasks to members
- [ ] Members update task status and add comments
- [ ] Return to workspace home → Check widgets show:
  - Active projects count
  - Work items due soon
  - Overdue work items

**Expected**: Tasks assigned, status updated, widgets reflect progress.

---

## 4. Rollup Proof (15 min)

**As Admin:**
- [ ] Go to Portfolios (`/workspaces/:id/portfolios`) → Click "+ New Portfolio"
- [ ] Name: "Q1 2025 Delivery" → Click "Create" (should complete in <60 seconds)
- [ ] Go to Programs (`/workspaces/:id/programs`) → Click "+ New Program"
- [ ] Portfolio: "Q1 2025 Delivery" → Name: "Mobile App Launch" → Click "Create"
- [ ] Open 2 projects → "Program & Portfolio" section → Click "Link Project"
- [ ] Select "Mobile App Launch" program → Portfolio auto-sets → Click "Link"
- [ ] Verify tags update immediately: "Program: Mobile App Launch"
- [ ] Go to Program detail page → Check rollup totals (projects, work items, health)
- [ ] Go to Portfolio detail page → Check rollup totals (programs, projects, health)

**Expected**: Portfolio/program created quickly, projects linked, rollups show correct totals.

---

## 5. Unlink Proof (5 min)

**As Admin:**
- [ ] Open linked project → "Program & Portfolio" section
- [ ] Click "Unlink" → Confirmation modal appears
- [ ] Click "Unlink" in modal → Tag updates to "Standalone" immediately
- [ ] Refresh Program detail page → Verify rollup numbers decreased

**Expected**: Unlink works, tag updates instantly, rollup recalculates.

---

## Role Checks (Quick Verification)

**As Member:**
- [ ] Go to Portfolios list → NO "+ New Portfolio" button visible
- [ ] Go to Programs list → NO "+ New Program" button visible
- [ ] Open project → "Program & Portfolio" shows read-only tag (no Link button)

**As Guest:**
- [ ] Same as Member (read-only everywhere)
- [ ] Try `/inbox` → Redirects to home (no access)

**Expected**: Member/Guest see read-only UI, no create/link controls.

---

## What NOT to Test Yet

❌ Multiple workspaces rollup reporting
❌ Custom KPI templates
❌ Advanced dashboards
❌ Cross-workspace linking

**These require Phase 7-8 stability first.**

---

## Success Criteria

✅ Owner can run 5 projects with tasks without confusion
✅ Members can see assigned work in under 2 clicks
✅ Admin creates portfolio/program in under 60 seconds
✅ Linking/unlinking updates tags instantly
✅ Rollups show accurate totals
✅ Member/Guest never see create buttons

---

## If Something Breaks

1. Check browser console for errors
2. Verify workspace access (404 = no access, 403 = no permission)
3. Ensure project/program/portfolio belong to same workspace
4. Report: What you did → What you expected → What happened
