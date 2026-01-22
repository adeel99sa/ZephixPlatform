# Phase 6 Implementation Status

## Module 1: Data Model Migration ✅ COMPLETE
- ✅ Created migration `1788000000000-MigratePortfoliosProgramsToWorkspaceScoped.ts`
- ✅ Adds workspace_id columns to portfolios and programs (nullable initially)
- ✅ Backfills workspace_id from linked projects
- ✅ Handles multi-workspace portfolios/programs by splitting
- ✅ Handles orphaned portfolios/programs
- ✅ Sets NOT NULL constraints after backfill
- ✅ Adds indexes: `idx_portfolio_org_workspace`, `idx_program_org_workspace`, `idx_program_org_workspace_portfolio`
- ✅ Adds portfolio_id to projects table
- ✅ Updates unique constraints: portfolio unique per workspace, program unique per portfolio

## Module 2: Update Entities ✅ COMPLETE
- ✅ Updated `Portfolio` entity: Added `workspaceId` column and `workspace` relation
- ✅ Updated `Program` entity: Added `workspaceId` column and `workspace` relation
- ✅ Updated `Project` entity: Added `portfolioId` column and `portfolio` relation
- ✅ All entities compile successfully

## Module 3: Replace Routes with Workspace-Scoped Routes 🔄 IN PROGRESS
**Status:** Starting implementation

**Required Routes:**
- Portfolios:
  - `GET /api/workspaces/:workspaceId/portfolios`
  - `POST /api/workspaces/:workspaceId/portfolios`
  - `GET /api/workspaces/:workspaceId/portfolios/:portfolioId`
  - `PATCH /api/workspaces/:workspaceId/portfolios/:portfolioId`
  - `POST /api/workspaces/:workspaceId/portfolios/:portfolioId/archive`

- Programs:
  - `GET /api/workspaces/:workspaceId/portfolios/:portfolioId/programs`
  - `POST /api/workspaces/:workspaceId/portfolios/:portfolioId/programs`
  - `GET /api/workspaces/:workspaceId/programs/:programId`
  - `PATCH /api/workspaces/:workspaceId/programs/:programId`
  - `POST /api/workspaces/:workspaceId/programs/:programId/archive`

- Project Linking:
  - `PATCH /api/workspaces/:workspaceId/projects/:projectId/link`

**Next Steps:**
1. Update `PortfoliosController` to use `@Controller('workspaces/:workspaceId/portfolios')`
2. Update `ProgramsController` to use workspace-scoped routes
3. Add workspace access guards to all routes
4. Update services to require workspaceId parameter
5. Remove or deprecate old org-level routes

## Module 4: Rollups ⏳ PENDING
- Rollup endpoints need to be workspace-scoped
- Filter by workspaceId in addition to organizationId

## Module 5: Tests ⏳ PENDING
- Workspace scoping tests
- 404 behavior for non-members
- Link endpoint validation

## Module 6: Frontend UI ⏳ PENDING
- Routes and pages for portfolios/programs

## Module 7: Quality Gates ⏳ PENDING
- Lint, test, build verification
