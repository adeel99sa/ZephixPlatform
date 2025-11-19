# Week 2 - Phase 2.1: Template Center Backend Foundation

## Objective

Introduce a project templates backend that stores project structures in one table and exposes admin CRUD APIs. No template application yet. No frontend changes yet.

## Existing Template Code

**Status:** Extended existing template module

The codebase already had a template system in place:
- Entity: `ProjectTemplate` with phases, taskTemplates, KPIs, scope, etc.
- Service: `TemplatesService` with CRUD operations
- Controller: `TemplatesController` at `/api/templates`
- Module: `TemplateModule` registered in `AppModule`

**Changes Made:**
- Extended existing entity to add `isActive` field for archiving
- Extended existing service to add `archive()` method and filter by `isActive`
- Added new `AdminTemplatesController` at `/admin/templates` with admin-only access
- Created migration for `is_active` column

## Schema Summary

### project_templates Table

**Columns:**
- `id` (uuid, primary key)
- `organization_id` (uuid, nullable) - Organization isolation
- `name` (varchar 255) - Template name
- `description` (text, nullable) - Template description
- `methodology` (enum: agile, waterfall, kanban, hybrid, custom) - Methodology type
- `phases` (jsonb) - Array of phase definitions
- `task_templates` (jsonb) - Array of task template definitions
- `available_kpis` (jsonb) - Available KPIs (existing, not used in Phase 2.1)
- `default_enabled_kpis` (text[]) - Default enabled KPI IDs (existing, not used in Phase 2.1)
- `scope` (enum: organization, team, personal) - Template scope (existing)
- `team_id` (uuid, nullable) - Team-specific template (existing)
- `created_by_id` (uuid, nullable) - Creator user ID
- `is_default` (boolean) - Org-wide default flag (existing)
- `is_system` (boolean) - System template flag (existing)
- `is_active` (boolean, default true) - **NEW** - For soft archiving
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Update timestamp

**Indexes:**
- `idx_templates_org` - On `organization_id`
- `idx_templates_methodology` - On `methodology`
- `idx_templates_scope` - On `scope`
- `idx_templates_org_active` - **NEW** - On `(organization_id, is_active)` for efficient filtering

### Example Structure JSON

```json
{
  "phases": [
    {
      "name": "Planning",
      "description": "Project planning phase",
      "order": 1,
      "estimatedDurationDays": 5
    },
    {
      "name": "Development",
      "description": "Development phase",
      "order": 2,
      "estimatedDurationDays": 20
    }
  ],
  "taskTemplates": [
    {
      "name": "Create project plan",
      "description": "Draft initial project plan",
      "estimatedHours": 8,
      "phaseOrder": 1,
      "assigneeRole": "pm",
      "priority": "high"
    }
  ]
}
```

## API Endpoints

### Admin Templates Controller (`/admin/templates`)

All endpoints require:
- `JwtAuthGuard` - User must be authenticated
- `RequireOrgRoleGuard` - User must have org admin role
- Organization context from `req.user.organizationId` (never from client)

| Method | Route | Guard | Description | Org Scoping |
|--------|-------|-------|-------------|-------------|
| GET | `/admin/templates` | Admin | List active templates for current organization | `organizationId` from JWT |
| GET | `/admin/templates/:id` | Admin | Fetch single template by ID | `organizationId` + `id` filter |
| POST | `/admin/templates` | Admin | Create new template | `organizationId` from JWT, `userId` from JWT |
| PATCH | `/admin/templates/:id` | Admin | Update existing template | `organizationId` + `id` filter |
| DELETE | `/admin/templates/:id` | Admin | Archive template (soft delete via `isActive=false`) | `organizationId` + `id` filter |

**Note:** The existing `/api/templates` endpoints remain for backward compatibility but are not part of Phase 2.1 requirements.

## Files Created or Modified

### Entity
- **File:** `src/modules/templates/entities/project-template.entity.ts`
- **Changes:** Added `isActive` field for soft archiving

### DTOs
- **Files:**
  - `src/modules/templates/dto/create-template.dto.ts` (existing, no changes)
  - `src/modules/templates/dto/update-template.dto.ts` (existing, no changes)
- **Note:** DTOs already support phases and taskTemplates as required by Phase 2.1

### Service
- **File:** `src/modules/templates/services/templates.service.ts`
- **Changes:**
  - Added `DataSource` injection (for future transaction use)
  - Added `archive(id, organizationId)` method
  - Updated `findAll()` to filter by `isActive: true`
  - Updated `findOne()` to filter by `isActive: true`
  - Updated `create()` to set `isActive: true` by default

### Controller
- **File:** `src/modules/templates/controllers/templates.controller.ts`
- **Changes:**
  - Added `AdminTemplatesController` class
  - Added admin routes at `/admin/templates`
  - All admin routes require `@RequireOrgRole('admin')` decorator
  - Imported `RequireOrgRole` and `RequireOrgRoleGuard` from workspaces module

### Module
- **File:** `src/modules/templates/template.module.ts`
- **Changes:**
  - Added `AdminTemplatesController` to controllers array
  - Added `RequireOrgRoleGuard` to providers array

### Migration
- **File:** `src/migrations/1764000000000-AddIsActiveToProjectTemplates.ts`
- **Changes:**
  - Adds `is_active` column (boolean, default true, not null)
  - Creates index on `(organization_id, is_active)` for efficient filtering

## Organization Isolation and Auth Checks

### Service Level
- ✅ All queries include `organizationId` in where clauses
- ✅ `findAll()` filters by `organizationId` and `isActive: true`
- ✅ `findOne()` filters by `organizationId` and `isActive: true`
- ✅ `create()` sets `organizationId` from parameter (never from DTO)
- ✅ `update()` verifies `organizationId` matches before updating
- ✅ `archive()` verifies `organizationId` matches before archiving

### Controller Level
- ✅ All admin endpoints extract `organizationId` from `req.user.organizationId`
- ✅ All admin endpoints extract `userId` from `req.user.id`
- ✅ Controller never accepts `organizationId` from client
- ✅ All write endpoints (POST, PATCH, DELETE) require `@RequireOrgRole('admin')`
- ✅ All read endpoints (GET) require `@RequireOrgRole('admin')`

### Guard Implementation
- ✅ Uses `RequireOrgRoleGuard` from workspaces module (reused pattern)
- ✅ Role hierarchy: admin > project_manager > viewer
- ✅ Throws `ForbiddenException` if user doesn't have required role

## Test Results

### Build Status
```bash
npm run build
```
✅ **PASS** - No TypeScript errors

### Linter Status
```bash
npm run lint
```
✅ **PASS** - No linter errors

### Workspace E2E Suites

| Suite | Status | Tests Passed | Notes |
|-------|--------|--------------|-------|
| workspace-membership-filtering.e2e-spec.ts | ✅ PASS | 17/17 | No regressions |
| workspace-rbac.e2e-spec.ts | ✅ PASS | 27/27 | No regressions |
| workspace-backfill.e2e-spec.ts | ✅ PASS | 6/6 | No regressions |

**All existing tests pass** - No regressions introduced by template backend changes.

## Open Questions and Future Work

### Phase 2.1 Scope (Completed)
- ✅ Template entity with phases and tasks
- ✅ Admin CRUD APIs
- ✅ Organization isolation
- ✅ Soft archiving via `isActive`

### Future Phases (Not in Scope)

1. **Template Application**
   - Apply template to create project with phases and tasks
   - Transaction wrapping for template application
   - Template usage tracking

2. **Additional Template Sections**
   - Milestones (not in Phase 2.1)
   - Risks (not in Phase 2.1)
   - KPIs (existing in entity but not used in Phase 2.1)

3. **Frontend Integration**
   - Template selection UI
   - Template editor UI
   - Template application flow

4. **Template Categories**
   - Category field exists but not enforced in Phase 2.1
   - Category-based filtering (future)

5. **Template Validation**
   - Structure validation (phases must have tasks, etc.)
   - Custom validators for template structure

## Constraints Verified

- ✅ No template application logic in this phase
- ✅ No frontend changes in this phase
- ✅ No changes to ProjectsService in this phase
- ✅ All queries scoped by organizationId
- ✅ All writes restricted to org admins
- ✅ Followed patterns from `src/modules/workspaces`
- ✅ New code lives under `src/modules/templates`
- ✅ No feature flags for templates
- ✅ Existing tests keep passing

## Summary

Phase 2.1 is complete. The template backend foundation is in place with:
- Extended existing `ProjectTemplate` entity with `isActive` field
- Admin-only CRUD APIs at `/admin/templates`
- Proper organization isolation and RBAC
- Soft archiving capability
- All existing tests passing

Ready for Phase 2.2 (Template Application) when authorized.

