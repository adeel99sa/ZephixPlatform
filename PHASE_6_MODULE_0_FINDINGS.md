# Phase 6 Module 0: Current State Inspection

## Summary
Inspected existing portfolios and programs modules. Found significant mismatch with Phase 6 requirements.

---

## What Exists ✅

### Entities
1. **Portfolio Entity** (`portfolios/entities/portfolio.entity.ts`)
   - ✅ id, organizationId, name, description, status (ACTIVE/ARCHIVED)
   - ✅ createdAt, updatedAt
   - ✅ Relations: programs, portfolioProjects
   - ❌ **MISSING: workspaceId** (currently org-level, not workspace-scoped)

2. **Program Entity** (`programs/entities/program.entity.ts`)
   - ✅ id, organizationId, portfolioId, name, description, status
   - ✅ createdAt, updatedAt
   - ✅ Relations: portfolio, projects
   - ❌ **MISSING: workspaceId** (currently org-level, not workspace-scoped)

3. **PortfolioProject Join Entity** (`portfolios/entities/portfolio-project.entity.ts`)
   - ✅ Join table linking portfolios to projects
   - ✅ organizationId, portfolioId, projectId
   - ✅ Unique constraint: (portfolioId, projectId)

4. **Project Entity** (`projects/entities/project.entity.ts`)
   - ✅ Has `programId` (nullable) column
   - ✅ Has `workspaceId` and `organizationId`
   - ❌ **MISSING: portfolioId** (should derive from program, but Phase 6 may want direct link)

### Controllers
1. **PortfoliosController** (`portfolios/portfolios.controller.ts`)
   - ✅ Routes: `/api/portfolios` (org-level, NOT workspace-scoped)
   - ✅ CRUD operations exist
   - ❌ **MISSING: workspace-scoped routes** (`/api/workspaces/:workspaceId/portfolios`)
   - ❌ **MISSING: workspace access guards**

2. **ProgramsController** (`programs/programs.controller.ts`)
   - ✅ Routes: `/api/programs` (org-level, NOT workspace-scoped)
   - ✅ CRUD operations exist
   - ❌ **MISSING: workspace-scoped routes** (`/api/workspaces/:workspaceId/portfolios/:portfolioId/programs`)
   - ❌ **MISSING: workspace access guards**

3. **Portfolio ProgramsController** (`portfolios/programs.controller.ts`)
   - ✅ Exists but routes are org-level

### Services
1. **PortfoliosService** (`portfolios/services/portfolios.service.ts`)
   - ✅ CRUD methods exist
   - ✅ Uses org-level queries (no workspace filtering)
   - ❌ **MISSING: workspace scoping**

2. **ProgramsService** (`programs/services/programs.service.ts`)
   - ✅ CRUD methods exist
   - ✅ Uses org-level queries (no workspace filtering)
   - ❌ **MISSING: workspace scoping**

### Migrations
1. **Phase4PortfoliosPrograms** (`1767485030157-Phase4PortfoliosPrograms.ts`)
   - ✅ Creates portfolios, programs, portfolio_projects tables
   - ✅ Adds programId to projects
   - ✅ Creates indexes and foreign keys
   - ❌ **MISSING: workspaceId columns** on portfolios and programs
   - ❌ **MISSING: workspace-scoped constraints**

### Rollups
- ✅ Rollup endpoints exist in controllers (lines 93, 101)
- ⚠️ **NEED TO VERIFY:** Rollup logic exists in services
- ❌ **MISSING: workspace-scoped rollup endpoints** per Phase 6 spec

---

## What Is Missing ❌

### Critical Gaps
1. **Workspace Scoping**
   - Portfolios and Programs are org-level, Phase 6 requires workspace-scoped
   - No workspaceId columns on portfolios/programs tables
   - No workspace access guards on endpoints
   - Routes are not workspace-scoped

2. **Data Model Mismatch**
   - Current: Portfolio → Program → Project (org-level)
   - Required: Workspace → Portfolio → Program → Project (workspace-scoped)
   - Project has programId but no portfolioId (Phase 6 may want direct link)

3. **Security Gaps**
   - No workspace access validation
   - No Member/Guest scoping enforcement
   - Org-level queries leak cross-workspace data

4. **Route Structure**
   - Current: `/api/portfolios`, `/api/programs`
   - Required: `/api/workspaces/:workspaceId/portfolios`, `/api/workspaces/:workspaceId/portfolios/:portfolioId/programs`

5. **Rollup Endpoints**
   - Current: May exist but need verification
   - Required: `/api/workspaces/:workspaceId/portfolios/:portfolioId/rollup`, `/api/workspaces/:workspaceId/programs/:programId/rollup`

6. **Project Linking**
   - Current: Uses PortfolioProject join table + programId on Project
   - Required: PATCH `/api/workspaces/:workspaceId/projects/:projectId/link` endpoint

---

## What Is Unsafe ⚠️

### Security Risks
1. **Data Leakage**
   - Org-level queries return portfolios/programs from all workspaces
   - Member/Guest can see data from inaccessible workspaces
   - No workspace boundary enforcement

2. **Access Control**
   - No workspace access guards
   - No validation that workspaceId belongs to user's accessible workspaces
   - Admin can see all, but Member/Guest should be scoped

3. **Cross-Workspace Linking**
   - No validation that projects belong to same workspace as portfolio/program
   - PortfolioProject join table doesn't enforce workspace consistency

### Data Integrity Risks
1. **Orphaned Data**
   - Portfolios/Programs exist without workspace context
   - Projects can link to programs in different workspaces (if not validated)

2. **Constraint Gaps**
   - No unique constraint on (workspaceId, name) for portfolios
   - No unique constraint on (workspaceId, portfolioId, name) for programs
   - Current constraints are org-level only

---

## Recommended Approach

### Option 1: Migrate Existing (Recommended)
- Add workspaceId columns to portfolios and programs
- Migrate existing data (assign to default workspace or require manual assignment)
- Update all queries to filter by workspaceId
- Add workspace-scoped routes alongside existing (or replace)
- Add workspace access guards

### Option 2: New Workspace-Scoped Module
- Create new workspace-scoped portfolios/programs modules
- Keep existing org-level modules for backward compatibility
- Phase 6 uses new modules only

### Option 3: Hybrid
- Keep org-level for Admin cross-workspace views
- Add workspace-scoped for Member/Guest
- Use feature flag or role-based routing

---

## Phase 6 Adjustment Needed

**Current state is org-level, Phase 6 requires workspace-scoped.**

**Decision needed:**
1. Migrate existing to workspace-scoped? (Requires data migration)
2. Create new workspace-scoped alongside existing? (Duplication risk)
3. Adjust Phase 6 to work with org-level? (Security risk)

**Recommendation:** Option 1 (migrate) with careful data migration strategy.

---

## Next Steps

1. **User decision:** How to handle existing org-level portfolios/programs?
2. **Migration plan:** If migrating, plan for workspaceId backfill
3. **Route strategy:** Replace or add workspace-scoped routes?
4. **Rollup verification:** Check if rollup logic exists and is workspace-aware
