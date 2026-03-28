# Wave 3A Implementation Report

**Date**: 2026-02-15
**PR**: #35
**Tag**: v0.6.0-rc.21
**Branch**: feat/wave3a-backend (squash-merged to main)

## Scope

Wave 3A adds three backend modules with migration, unit tests, and gating floor increase.
No frontend changes.

## Modules Delivered

### 1. Change Requests

- **Route**: `/api/work/workspaces/:wsId/projects/:projId/change-requests`
- **Entity**: `change_requests` table with UUID PK, workspace/project scoping
- **Lifecycle**: DRAFT → SUBMITTED → APPROVED/REJECTED → IMPLEMENTED
- **Role gating**: approve/reject require OWNER or ADMIN
- **State machine**: edit/delete only in DRAFT, submit only from DRAFT
- **Files**: 9 files (entity, enums, 3 DTOs, service, controller, module, test)

### 2. Project Budgets

- **Route**: `/api/work/workspaces/:wsId/projects/:projId/budget`
- **Entity**: `project_budgets` table with unique (workspace_id, project_id)
- **Upsert**: GET auto-creates zero budget if none exists
- **Role gating**: PATCH requires OWNER or ADMIN
- **Fields**: baselineBudget, revisedBudget, contingency, approvedChangeBudget, forecastAtCompletion
- **Files**: 5 files (entity, service+DTO, controller, module, test)

### 3. Standalone Documents

- **Route**: `/api/work/workspaces/:wsId/projects/:projId/documents`
- **Entity**: `documents` table with JSONB content, version tracking
- **Versioning**: version increments on every update
- **CRUD**: list, get, create, update, delete
- **Files**: 7 files (entity, 2 DTOs, service, controller, module, test)

## Migration

- **File**: `17980248000000-CreateWave3ATables.ts`
- **Tables**: change_requests, project_budgets, documents
- **Idempotent**: Uses `IF NOT EXISTS` for tables, indexes, and enum types
- **Down**: Drops all 3 tables and enum types

## Critical Fix Applied

All three entities received explicit `name: 'snake_case'` column mappings because
`SnakeNamingStrategy` is globally disabled. Without this fix, TypeORM would look
for camelCase column names (e.g., `workspaceId`) instead of snake_case (`workspace_id`),
causing runtime failures on staging.

## Gating

| Metric | Before | After |
|--------|--------|-------|
| Test Suites | 119 | 122 |
| Tests | 1282 | 1310 |
| New Suites | - | change-requests, budgets, documents |
| New Tests | - | 28 |

## Test Coverage

### ChangeRequestsService (15 tests)
- create defaults to DRAFT
- update only allowed in DRAFT
- submit transitions DRAFT → SUBMITTED
- approve requires OWNER/ADMIN role
- approve rejects when not SUBMITTED
- reject requires OWNER/ADMIN role and stores reason
- implement only from APPROVED
- implement rejects when not APPROVED
- delete only from DRAFT
- delete rejects when not DRAFT
- get throws NotFoundException

### ProjectBudgetsService (5 tests)
- returns existing budget
- auto-creates zero budget (upsert-on-read)
- OWNER can patch
- ADMIN can patch
- MEMBER/GUEST rejected

### DocumentsService (8 tests)
- create sets version to 1
- create accepts custom content
- update increments version
- update increments version even with only content change
- remove deletes document
- get throws NotFoundException
- list returns ordered by updatedAt DESC

## CI Results

- Backend Gating Tests: PASS (122/1310)
- Frontend Gating Tests: PASS
- Sprint Merge Gate: PASS
- Security & Compliance: PASS
- Auth tests: PASS (both paths)
- Contract Tests Gate: FAIL (pre-existing admin.controller.spec.ts — already excluded from gating)

## Staging Verification

- Deploy to Staging: SUCCESS (via GitHub Actions)
- Health check during deploy: 200 OK
- Post-deploy availability: Railway service returning "Application not found" (infrastructure cold start / idle timeout)
- Status: Pending manual verification when Railway service recovers

## Wave 3A Smoke Test Plan (when staging is available)

1. Login with demo@zephix.ai
2. Create change request → expect DRAFT status
3. Submit change request → expect SUBMITTED
4. Approve change request → expect APPROVED
5. Create document → expect version 1
6. Update document → expect version 2
7. GET budget → expect zero defaults
8. PATCH budget → expect updated values
9. GET budget again → expect persisted values
