# Phase 6 Tester Ready Checklist

## Overview
This checklist verifies that Phase 6 (Workspace-Scoped Portfolios, Programs, and Rollups) is ready for first testers.

**Important: Rollup Concept**
- **Workspace Dashboard Rollup**: All projects in one workspace (for project managers)
- **Program Rollup**: Subset of projects in the same workspace grouped under a program
- **Portfolio Rollup**: Programs and projects in the same workspace grouped under a portfolio
- **NOT Phase 6**: Cross-workspace organization rollups (Phase 9-10)

**Recommended Setup for First Tester**: Start with **one workspace** to learn the system quickly.

## Setup Flow for First Tester (Recommended: One Workspace)

### 1. Admin Setup (10 minutes)

#### Create One Workspace
1. Login as Admin user
2. Navigate to `/workspaces`
3. Create 1 workspace: "Test Workspace" (or your team name)
4. Click on the workspace to enter it

#### Assign Workspace Owner
1. Go to workspace settings (`/workspaces/:id/settings` or click workspace name → Settings)
2. Add a workspace member
3. Assign them as `workspace_owner` (this will be the PM)

#### Create Portfolio and Program
1. In the workspace, click "Portfolios" in the sidebar (or navigate to `/workspaces/:workspaceId/portfolios`)
2. Click "+ New Portfolio" button (Admin only)
3. Fill in:
   - Name: "Q1 2025 Delivery" (required)
   - Description: Optional
4. Click "Create"
5. Click "Programs" in the sidebar (or navigate to `/workspaces/:workspaceId/programs`)
6. Click "+ New Program" button (Admin only)
7. Fill in:
   - Portfolio: Select "Q1 2025 Delivery" (required)
   - Name: "Mobile App Launch" (required)
   - Description: Optional
8. Click "Create"

**Expected Result**: Portfolio and program created in under 60 seconds. Member/Guest users do not see create buttons.

### 2. Workspace Owner Setup (15 minutes)

#### Create Projects
1. Login as workspace owner (PM)
2. Navigate to workspace home (`/w/:slug/home` or click workspace name in sidebar)
3. Click "Create Project" or "+ New Project"
4. Create 5 projects:
   - Project 1: "Standalone Project A" (leave unlinked)
   - Project 2: "Standalone Project B" (leave unlinked)
   - Project 3: "Program Project A" (will link to program)
   - Project 4: "Program Project B" (will link to program)
   - Project 5: "Portfolio Project" (will link to portfolio only)

#### Populate Projects (Optional for Phase 6)
1. For each project:
   - Add work items with due dates (some overdue, some due soon)
   - Set project status (active, at-risk, etc.)
   - Add project members if needed

### 3. Admin Linking (5 minutes)

#### Link Projects to Programs/Portfolios
1. Login as Admin
2. Navigate to a project detail page (click on any project)
3. Scroll to "Program & Portfolio" section
4. Click "Link Project" button
5. In the modal:
   - For "Program Project A": Select program "Mobile App Launch" → Portfolio auto-sets → Click "Link"
   - For "Program Project B": Select program "Mobile App Launch" → Portfolio auto-sets → Click "Link"
   - For "Portfolio Project": Leave program empty, select portfolio "Q1 2025 Delivery" → Click "Link"
6. Verify tags update immediately (no refresh needed):
   - "Program Project A" shows: "Program: Mobile App Launch"
   - "Portfolio Project" shows: "Portfolio: Q1 2025 Delivery"
   - Standalone projects show: "Standalone"

**Expected Result**: Tags update without page refresh. Unlink button appears for linked projects.

## What Each Role Can Do

### Admin
**Workspace Home (`/w/:slug/home`)**
- ✅ View all widgets (active projects, standalone vs linked, work items, risks, conflicts)
- ✅ Click numbers to filter projects
- ✅ See project tags (Standalone, Program: X, Portfolio: Y)

**Portfolios (`/workspaces/:workspaceId/portfolios`)**
- ✅ View all portfolios in workspace
- ✅ Create new portfolio
- ✅ View portfolio detail with rollup
- ✅ See program list with health
- ✅ See projects list with health

**Programs (`/workspaces/:workspaceId/programs`)**
- ✅ View all programs in workspace
- ✅ Create new program (within portfolio)
- ✅ View program detail with rollup
- ✅ See projects table with health

**Project Linking**
- ✅ Link project to program (portfolio auto-set)
- ✅ Link project to portfolio only
- ✅ Unlink project
- ✅ Change existing link

### Member (Workspace Owner/Member)
**Workspace Home**
- ✅ View all widgets (same as Admin)
- ✅ Click numbers to filter projects
- ✅ See project tags (read-only)

**Portfolios**
- ✅ View all portfolios in workspace
- ✅ View portfolio detail with rollup
- ❌ Cannot create/edit portfolios
- ❌ Cannot create/edit programs

**Programs**
- ✅ View all programs in workspace
- ✅ View program detail with rollup
- ❌ Cannot create/edit programs

**Project Linking**
- ✅ See read-only tags (Standalone, Program: X, Portfolio: Y)
- ❌ Cannot link/unlink projects

### Guest (Viewer)
**Workspace Home**
- ✅ View workspace home if invited to workspace
- ✅ View widgets (read-only)
- ✅ See project tags (read-only)
- ❌ Cannot access inbox
- ❌ Cannot access paid routes

**Portfolios**
- ✅ View portfolios list if has workspace access
- ✅ View portfolio detail with rollup
- ❌ Cannot create/edit anything
- ❌ Cannot link projects

**Programs**
- ✅ View programs list if has workspace access
- ✅ View program detail with rollup
- ❌ Cannot create/edit anything

**Project Linking**
- ✅ See read-only tags
- ❌ Cannot link/unlink projects

## 60-Minute Validation Checklist

### Create UI (5 minutes)
- [ ] Admin clicks "+ New Portfolio" → Modal opens → Fill name → Click "Create" → Portfolio appears in list
- [ ] Admin clicks "+ New Program" → Modal opens → Select portfolio → Fill name → Click "Create" → Program appears in list
- [ ] Member/Guest do NOT see create buttons (403 if they try API)
- [ ] Create completes in under 60 seconds

### Workspace Scoping (5 minutes)
- [ ] Member with access to Workspace A only cannot see Workspace B portfolios/programs (404)
- [ ] Guest with access to Workspace A can read but cannot write (403 for create/link)
- [ ] Admin can access all workspaces they have access to

### Linking Integrity (10 minutes)
- [ ] Admin clicks "Link Project" → Modal shows current status (Standalone/Program/Portfolio)
- [ ] Admin selects program → Portfolio field shows "derived from program" (disabled)
- [ ] Admin clicks "Link" → Tag updates immediately without refresh
- [ ] Admin clicks "Unlink" → Confirmation modal appears → Click "Unlink" → Tag updates to "Standalone"
- [ ] Admin links project to portfolio only → programId stays null
- [ ] Admin tries to link project to program from different workspace → 404 (no leak)
- [ ] Admin provides mismatched programId and portfolioId → 400 error
- [ ] Member/Guest see read-only tags with clear status, cannot link

### Rollup Accuracy (15 minutes)
- [ ] Program rollup shows correct project counts
- [ ] Program rollup shows correct work items (open, overdue)
- [ ] Program rollup shows correct health status
- [ ] Portfolio rollup shows correct program counts
- [ ] Portfolio rollup shows correct project totals
- [ ] Portfolio rollup shows program health list
- [ ] Rollups are workspace-scoped (workspace B data doesn't affect workspace A)

### UI/UX (10 minutes)
- [ ] Workspace home widgets display correctly
- [ ] Clicking widget numbers filters project list
- [ ] Project tags display correctly (Standalone, Program, Portfolio)
- [ ] Portfolios/Programs list pages show breadcrumbs
- [ ] Detail pages handle 404 gracefully
- [ ] Linking modal shows derived portfolio when program selected
- [ ] Linking submit button disabled until valid selection
- [ ] Empty states display correctly

### Access Control (10 minutes)
- [ ] Admin can create portfolios and programs
- [ ] Member cannot create portfolios/programs (403)
- [ ] Guest cannot create anything (403)
- [ ] All GET endpoints return 404 for non-members (not 403)
- [ ] All write endpoints return 403 for non-Admin (not 404)

## Alternative Setup: Multiple Workspaces (If Needed)

If you need to test with 3 project managers:

1. **Admin creates 3 workspaces** (Engineering, Product, Marketing)
2. **Admin assigns workspace owners** to each workspace
3. **Each workspace owner** creates projects in their own workspace
4. **Admin links projects** into programs/portfolios **within each workspace only**
5. **Do NOT try cross-workspace rollups** - portfolios and programs are workspace-scoped

**Important**: Each workspace has its own portfolios and programs. A portfolio in Workspace A cannot contain projects from Workspace B.

## Known Limitations (Not Blockers)

1. ✅ **Portfolio/Program Create UI**: Now available! Admin can create via UI in under 60 seconds.

2. **No Cross-Workspace Rollups**: Portfolios and programs are workspace-scoped by design. Organization-level rollups are Phase 9-10.

3. **Fixed Health Algorithm**: Uses v1 deterministic health (red/yellow/green based on counts). Custom KPIs coming in Phase 8+.

4. **No Template Integration**: Project linking is manual. Template-based project creation with auto-linking coming in Phase 8.

## Next Steps After Phase 6

- **Phase 7**: Work management hardening for real execution
- **Phase 8**: Template builder MVP, make it usable
- **Phase 9**: Dashboards widget completeness, keep it simple, no NLP yet

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify workspace access (404 = no access, 403 = no permission)
3. Ensure you're using the correct workspace ID in URLs
4. Verify project/program/portfolio belong to the same workspace
