# Phase 4 Implementation Plan

## Overview
Build Portfolio and Program rollups to provide executive-level visibility into capacity utilization, conflicts, and project status across organizational hierarchies.

## Phase 4.1: Portfolio and Program Summaries

### Implementation Status

#### Step 0: Sanity and Baseline ✅ (Complete)
- [x] Confirmed existing modules and entities
- [x] Confirmed existing capacity rollup logic
- [x] Identified patterns for reuse

#### Step 1: Data Model Design Decisions ✅ (Complete)
- [x] Portfolio entity: organizationId, name, description, status, createdById
- [x] Program entity: organizationId, portfolioId, name, description, status, createdById
- [x] PortfolioProject join table: organizationId, portfolioId, projectId
- [x] Added programId directly to Project entity
- [x] Added portfolioId directly to Program entity
- [x] Unique constraints: portfolios (org_id, name), programs (org_id, portfolio_id, name), portfolio_projects (portfolio_id, project_id)

#### Step 2: Implement Migrations ✅ (Complete)
- [x] Created `Phase4PortfoliosPrograms` migration
- [x] Created portfolios, programs, portfolio_projects tables
- [x] Added program_id to projects table
- [x] Added foreign keys and indexes
- [x] Migration tested locally

#### Step 3: Create Entities and Repositories ✅ (Complete)
- [x] Portfolio entity with PortfolioStatus enum
- [x] Program entity with ProgramStatus enum
- [x] PortfolioProject join entity
- [x] Updated Project entity with program relation
- [x] All entities include organizationId and tenant scoping

#### Step 4: Create DTOs with Strict Validation ✅ (Complete)
- [x] CreatePortfolioDto, UpdatePortfolioDto
- [x] AddProjectsToPortfolioDto, RemoveProjectsFromPortfolioDto
- [x] CreateProgramDto, UpdateProgramDto
- [x] AssignProgramToProjectDto, UnassignProgramFromProjectDto
- [x] All DTOs include UUID validation and required fields

#### Step 5: Build Services ✅ (Complete)
- [x] PortfoliosService: CRUD, addProjects, removeProjects, getPortfolioSummary
- [x] ProgramsService: CRUD, assignProgramToProject, unassignProgramFromProject, getProgramSummary
- [x] Summary computation: weekly rollups, capacity utilization, conflict metrics, project status counts
- [x] Performance guardrails: aggregate SQL, filter by organization_id and workspace_id

#### Step 6: Controllers and Routing Order ✅ (Complete)
- [x] PortfoliosController with routes in exact order (static before dynamic)
- [x] ProgramsController with routes in exact order (static before dynamic)
- [x] Summary endpoints require x-workspace-id header
- [x] All handlers use JwtAuthGuard and tenant context
- [x] Response wrapper uses ResponseService.success()

#### Step 7: API Docs and Error Contract Alignment ✅ (Complete)
- [x] Added ApiTags, ApiOperation, ApiParam, ApiQuery, ApiHeader annotations
- [x] Added ApiResponse for 200, 201, 400, 401, 403, 404
- [x] Missing x-workspace-id returns 403 (not 400)
- [x] Invalid UUID for x-workspace-id returns 403 (not 500)
- [x] Global prefix confirmed (/api)

#### Step 8: End to End Tests ✅ (Complete)
- [x] Created portfolios-programs.e2e-spec.ts
- [x] Workspace header enforcement tests (403 for missing/invalid/wrong workspace)
- [x] Portfolio CRUD tests
- [x] Portfolio project management tests
- [x] Portfolio summary structure validation
- [x] Program CRUD tests
- [x] Program project assignment tests
- [x] Route order guard tests

#### Step 9: Verification Script ✅ (Complete)
- [x] Created scripts/phase4-portfolio-program-verify.sh
- [x] Preflight: commitShaTrusted check
- [x] Auto-discover ORG_ID, WORKSPACE_ID, PROJECT_ID
- [x] Create portfolio and program
- [x] Add project to portfolio
- [x] Assign program to project
- [x] Call both summary endpoints
- [x] Validate response structure (weeks array, conflicts fields, projectCounts)

#### Step 10: Documentation ✅ (Complete)
- [x] Created PHASE4_IMPLEMENTATION_PLAN.md
- [x] Created RELEASE_LOG_PHASE4.md template

## Endpoints

### Portfolios
- `GET /api/portfolios` - List all portfolios
- `POST /api/portfolios` - Create portfolio
- `GET /api/portfolios/:id` - Get portfolio by ID
- `PATCH /api/portfolios/:id` - Update portfolio
- `GET /api/portfolios/:id/summary` - Get portfolio summary (requires x-workspace-id header)
- `POST /api/portfolios/:id/projects` - Add projects to portfolio
- `DELETE /api/portfolios/:id/projects` - Remove projects from portfolio

### Programs
- `GET /api/programs` - List all programs (optional portfolioId filter)
- `POST /api/programs` - Create program
- `GET /api/programs/:id` - Get program by ID
- `PATCH /api/programs/:id` - Update program
- `GET /api/programs/:id/summary` - Get program summary (requires x-workspace-id header)
- `POST /api/programs/:id/assign-project` - Assign project to program
- `POST /api/programs/:id/unassign-project` - Unassign project from program

## Required Headers for Summary Endpoints

All summary endpoints require:
- `Authorization: Bearer <token>` - JWT authentication
- `x-workspace-id: <workspace-uuid>` - Workspace ID (required)

Missing or invalid `x-workspace-id` returns 403 Forbidden.

## Example curl Commands

### Create Portfolio
```bash
curl -X POST "$BASE/api/portfolios" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2025 Portfolio",
    "description": "All Q1 initiatives",
    "status": "active"
  }'
```

### Get Portfolio Summary
```bash
curl -X GET "$BASE/api/portfolios/$PORTFOLIO_ID/summary?startDate=2025-01-01&endDate=2025-03-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID"
```

### Create Program
```bash
curl -X POST "$BASE/api/programs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolioId": "$PORTFOLIO_ID",
    "name": "Mobile App Development",
    "description": "All mobile initiatives",
    "status": "active"
  }'
```

### Get Program Summary
```bash
curl -X GET "$BASE/api/programs/$PROGRAM_ID/summary?startDate=2025-01-01&endDate=2025-03-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID"
```

## Verification Script Usage

```bash
# Set environment variables
export BASE="https://zephix-backend-production.up.railway.app"
source scripts/auth-login.sh  # Exports TOKEN

# Run verification script
bash scripts/phase4-portfolio-program-verify.sh
```

## Stop Conditions

The verification script stops on:
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error

## Files Changed

### Created:
- `zephix-backend/src/modules/portfolios/entities/portfolio.entity.ts`
- `zephix-backend/src/modules/portfolios/entities/portfolio-project.entity.ts`
- `zephix-backend/src/modules/programs/entities/program.entity.ts`
- `zephix-backend/src/modules/portfolios/dto/create-portfolio.dto.ts`
- `zephix-backend/src/modules/portfolios/dto/update-portfolio.dto.ts`
- `zephix-backend/src/modules/portfolios/dto/add-projects-to-portfolio.dto.ts`
- `zephix-backend/src/modules/portfolios/dto/remove-projects-from-portfolio.dto.ts`
- `zephix-backend/src/modules/programs/dto/create-program.dto.ts`
- `zephix-backend/src/modules/programs/dto/update-program.dto.ts`
- `zephix-backend/src/modules/programs/dto/assign-program-to-project.dto.ts`
- `zephix-backend/src/modules/programs/dto/unassign-program-from-project.dto.ts`
- `zephix-backend/src/modules/portfolios/services/portfolios.service.ts`
- `zephix-backend/src/modules/programs/services/programs.service.ts`
- `zephix-backend/src/modules/portfolios/portfolios.controller.ts`
- `zephix-backend/src/modules/portfolios/programs.controller.ts`
- `zephix-backend/src/migrations/1767485030157-Phase4PortfoliosPrograms.ts`
- `zephix-backend/test/portfolios-programs.e2e-spec.ts`
- `scripts/phase4-portfolio-program-verify.sh`
- `docs/PHASE4_IMPLEMENTATION_PLAN.md`
- `docs/RELEASE_LOG_PHASE4.md`

### Modified:
- `zephix-backend/src/modules/projects/entities/project.entity.ts` (added programId)
- `zephix-backend/src/modules/portfolios/portfolios.module.ts`
- `zephix-backend/src/app.module.ts` (removed ProgramsModule import)
- `zephix-backend/src/config/data-source.ts` (added new entities)


