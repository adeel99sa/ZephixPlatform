# Phase 6 Frontend Implementation Plan

## Module 1: Inventory Complete ✅

**Findings:**
- Routes: App.tsx has `/w/:slug/home` → WorkspaceHomeBySlug → WorkspaceHome
- Sidebar: Shows workspace nav when `activeWorkspaceId` is set
- API: `api.ts` with token management, `/workspaces/slug/:slug/home` endpoint exists
- Workspace store: Zustand store with `activeWorkspaceId` persisted

**Backend Endpoints Available:**
- ✅ `GET /api/workspaces/slug/:slug/home` - workspace home data
- ✅ `GET /api/workspaces/:workspaceId/portfolios` - list portfolios
- ✅ `GET /api/workspaces/:workspaceId/portfolios/:portfolioId/programs` - list programs in portfolio
- ✅ `GET /api/workspaces/:workspaceId/programs/:programId/rollup` - program rollup
- ✅ `GET /api/workspaces/:workspaceId/portfolios/:portfolioId/rollup` - portfolio rollup
- ✅ `GET /api/projects?workspaceId=X` - list projects (includes programId/portfolioId)
- ✅ `PATCH /api/workspaces/:workspaceId/projects/:projectId/link` - link project

**Missing Endpoint:**
- ⚠️ No endpoint to list ALL programs in a workspace (only by portfolio)
  - **Solution**: Query all portfolios first, then get programs for each, OR create minimal endpoint

## Module 2: Workspace Dashboard Widgets

**Target**: `/w/:slug/home` (WorkspaceHome component)

**Changes Needed:**
1. Update `WorkspaceHome.tsx` to:
   - Use workspace home endpoint data
   - Fetch full project list with `programId`/`portfolioId`
   - Add widget cards section before projects list
   - Compute metrics from projects array
   - Make numbers clickable to filter projects

**Widgets to Add:**
- Active projects count (clickable)
- Standalone vs Linked counts (clickable)
- Work due soon count (if available, else hide)
- Overdue count (if available, else hide)
- Risks open count (from endpoint, hide if 0)
- Resource conflicts open count (if available, else hide)

## Module 3: Program Pages

**Routes to Add:**
- `/workspaces/:workspaceId/programs` → ProgramsListPage
- `/workspaces/:workspaceId/programs/:programId` → ProgramDetailPage

**Files to Create:**
- `zephix-frontend/src/pages/programs/ProgramsListPage.tsx`
- `zephix-frontend/src/pages/programs/ProgramDetailPage.tsx`

**Backend Calls:**
- List programs: Query all portfolios, then get programs for each (or create endpoint)
- Program rollup: `GET /api/workspaces/:workspaceId/programs/:programId/rollup`

## Module 4: Portfolio Pages

**Routes to Add:**
- `/workspaces/:workspaceId/portfolios` → PortfoliosListPage
- `/workspaces/:workspaceId/portfolios/:portfolioId` → PortfolioDetailPage

**Files to Create:**
- `zephix-frontend/src/pages/portfolios/PortfoliosListPage.tsx`
- `zephix-frontend/src/pages/portfolios/PortfolioDetailPage.tsx`

**Backend Calls:**
- List portfolios: `GET /api/workspaces/:workspaceId/portfolios`
- Portfolio rollup: `GET /api/workspaces/:workspaceId/portfolios/:portfolioId/rollup`

## Module 5: Linking UI

**Location**: Project detail page or project row actions

**Features:**
- Admin only: Link to program, link to portfolio (if supported)
- Validation: Only programs/portfolios from same workspace
- If program selected, portfolio derived automatically
- Member/Guest: Show read-only tag (Standalone/Program name/Portfolio name)

## Module 6: Navigation

**Sidebar Updates:**
- Add "Portfolios" and "Programs" links under workspace section
- Only show when `activeWorkspaceId` is set
- Route to `/workspaces` selection if no active workspace

## Module 7: Acceptance Checks

**Manual Tests:**
- Admin: All views, linking works, workspace home shows widgets
- Member: Read views, no create/edit/link controls
- Guest: Can view workspace home if invited, no inbox/paid routes

## Implementation Order

1. ✅ Module 1: Inventory (complete)
2. Module 2: Workspace dashboard widgets
3. Module 3: Program pages
4. Module 4: Portfolio pages
5. Module 5: Linking UI
6. Module 6: Navigation
7. Module 7: Acceptance checks
