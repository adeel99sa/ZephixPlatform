# Phase 6 Module 4: Architecture Confirmation

## Core Data Model Rule ✅

**Every project belongs to exactly one workspace.**
- Project has `workspaceId` (required)
- Project has `programId` (nullable) - reference only, not ownership
- Project has `portfolioId` (nullable) - reference only, not ownership
- Programs and Portfolios never "own" projects - they reference projects that already exist in the workspace

## Linking Model ✅

### Current Implementation
- Project entity has: `workspaceId`, `programId` (nullable), `portfolioId` (nullable)
- Link endpoint (`PATCH /api/workspaces/:workspaceId/projects/:projectId/link`) already implements:
  - If `programId` is set, `portfolioId` is derived from `program.portfolioId`
  - Validation ensures program and portfolio belong to same workspace as project
  - Admin-only enforcement already in place

### V1 Guardrails
- ✅ One project belongs to one program at most
- ✅ Portfolio membership comes from program in v1 (preferred)
- ✅ Direct portfolio linking supported but not primary path
- ✅ No cross-workspace programs or portfolios

## Three Views of Same Data ✅

### 1. Workspace Home/Dashboard
- **Shows**: All projects in the workspace
- **Data Source**: `WHERE workspaceId = X AND organizationId = Y`
- **Use Case**: Primary execution view for workspace owner
- **Features**: Work items, risks, resource conflicts, due items

### 2. Program View
- **Shows**: Only projects linked to that program
- **Data Source**: `WHERE workspaceId = X AND organizationId = Y AND programId = Z`
- **Use Case**: Program-level execution view
- **Same Projects**: No duplicates, no moving

### 3. Portfolio View
- **Shows**: Programs and projects linked to the portfolio
- **Data Source**:
  - Projects via programs: `WHERE workspaceId = X AND organizationId = Y AND programId IN (programIds)`
  - Direct portfolio projects: `WHERE workspaceId = X AND organizationId = Y AND portfolioId = Z` (v1: prefer program path)
- **Use Case**: Portfolio-level strategic view
- **Same Projects**: Only grouped differently

## Rollup Implementation ✅

### Program Rollup
- **Query**: Projects where `programId = X AND workspaceId = Y AND organizationId = Z`
- **Aggregates**: Projects, work items, resource conflicts, risks
- **Health**: Computed from aggregated counts
- **Scoping**: Strictly workspace-scoped

### Portfolio Rollup
- **Query**:
  - Programs where `portfolioId = X AND workspaceId = Y AND organizationId = Z`
  - Projects via programs: `programId IN (programIds) AND workspaceId = Y AND organizationId = Z`
  - Direct portfolio projects: `portfolioId = X AND workspaceId = Y AND organizationId = Z` (optional in v1)
- **Aggregates**: Programs, projects, work items, resource conflicts, risks
- **Health**: Computed from aggregated counts
- **Scoping**: Strictly workspace-scoped

## Current Rollup Implementation Status

### ✅ What's Working
1. **Workspace Scoping**: All queries filter by `organizationId` AND `workspaceId`
2. **Program Rollup**: Correctly queries projects by `programId` within workspace
3. **Portfolio Rollup**: Queries projects via programs (primary) and direct portfolio link (optional)
4. **Security**: `RequireWorkspaceAccessGuard` on all endpoints
5. **404 Behavior**: Returns 404 for inaccessible workspace or missing resource
6. **No Cross-Workspace Leakage**: All queries enforce workspace boundary

### 📝 Notes on Portfolio Rollup
- Current implementation supports both:
  - Projects via programs (primary path in v1)
  - Direct portfolio projects via `portfolio_projects` join table (optional)
- This is correct - supports v1 (program-based) and future flexibility
- In v1, most projects will link via programs, so direct portfolio linking is rare but supported

## Next Steps: Frontend Integration

### 1. Workspace Home Dashboard Widgets
**Endpoints Needed:**
- `GET /api/workspaces/:workspaceId/projects` (already exists)
- Widget data can be computed from existing project list or new endpoint:
  - Active projects count
  - Standalone vs linked counts (filter by `programId IS NULL`)
  - Work items due soon (from work items endpoint)
  - Overdue work items (from work items endpoint)
  - Risks open (from risks endpoint)
  - Resource conflicts open (from resource conflicts endpoint)

**Project Tags/Pills:**
- Standalone: `programId IS NULL AND portfolioId IS NULL`
- Program: Show program name from `programId`
- Portfolio: Show portfolio name (derived from `program.portfolioId` or direct `portfolioId`)

**Filters:**
- All projects
- Standalone only (`programId IS NULL`)
- By program (`programId = X`)
- By portfolio (projects where `portfolioId = X` OR `program.portfolioId = X`)

### 2. Program and Portfolio Pages
**Endpoints:**
- `GET /api/workspaces/:workspaceId/programs/:programId/rollup` ✅ (implemented)
- `GET /api/workspaces/:workspaceId/portfolios/:portfolioId/rollup` ✅ (implemented)
- `GET /api/workspaces/:workspaceId/programs/:programId` (detail)
- `GET /api/workspaces/:workspaceId/portfolios/:portfolioId` (detail)
- `GET /api/workspaces/:workspaceId/portfolios/:portfolioId/programs` (list programs)

**UI Components:**
- Reuse same project cards from workspace dashboard
- Show rollup widgets (health, totals, etc.)
- Filter projects by program/portfolio

### 3. KPI Foundation v1 (Future)
**Layer 1: KPI Definitions (Org Level)**
- Entity: `KpiDefinition`
  - `id`, `organizationId`, `key`, `name`, `type`, `targetRule`, `aggregationRule`
  - `appliesToTemplateIds` (optional), `appliesToProjectTypes` (optional)
- Admin creates once per organization
- UI: Inside template center

**Layer 2: KPI Instances (Project Level)**
- Entity: `KpiInstance`
  - `id`, `projectId`, `kpiDefinitionId`, `currentValue`, `status`, `lastUpdatedAt`
- Created when project is created from template (if template has KPI definitions)
- Project manager updates values through workflows

**Rollups:**
- Workspace rollup: Aggregate KPI instances for projects in workspace
- Program rollup: Aggregate KPI instances for projects linked to program
- Portfolio rollup: Aggregate KPI instances for projects linked to portfolio
- Same data, different grouping

## Implementation Verification

### ✅ Data Model Alignment
- [x] Project belongs to exactly one workspace
- [x] Program and portfolio reference projects (not own)
- [x] `programId` nullable on project
- [x] `portfolioId` nullable on project
- [x] `portfolioId` derived from `program.portfolioId` when `programId` set
- [x] All queries workspace-scoped

### ✅ Rollup Implementation
- [x] Program rollup queries by `programId` within workspace
- [x] Portfolio rollup queries projects via programs (primary)
- [x] Portfolio rollup supports direct portfolio link (optional)
- [x] All aggregations workspace-scoped
- [x] Health algorithm deterministic

### ✅ Security
- [x] All endpoints use `RequireWorkspaceAccessGuard`
- [x] All queries filter by `organizationId` AND `workspaceId`
- [x] Returns 404 for inaccessible workspace
- [x] Returns 404 for missing resource
- [x] No cross-workspace leakage

## Summary

The current implementation correctly follows the architectural model:
- Projects belong to workspaces (not programs/portfolios)
- Programs and portfolios reference projects (not own them)
- Rollups aggregate the same projects, just grouped differently
- All queries are workspace-scoped
- Security boundaries are enforced

The rollup endpoints are ready for frontend integration. The next phase should focus on:
1. Workspace dashboard widgets
2. Program and Portfolio detail pages
3. KPI foundation (future)
