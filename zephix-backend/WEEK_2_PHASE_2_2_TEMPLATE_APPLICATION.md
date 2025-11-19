# Week 2 - Phase 2.2: Template Application with Transactions

## Objective

Add an atomic "apply template" flow that creates a new project from a template, including phases and tasks, using a transaction. No UI changes in this phase.

## Method

### TemplatesService.applyTemplate

**Full Signature:**
```typescript
async applyTemplate(
  templateId: string,
  payload: {
    name: string;
    workspaceId: string;
    startDate?: Date;
    description?: string;
  },
  organizationId: string,
  userId: string,
): Promise<Project>
```

**High-Level Flow Steps:**

1. **Start Transaction** - Wrap all operations in `this.dataSource.transaction()`
2. **Load Template** - Verify template exists, is active, and belongs to organization (or is system template)
3. **Load Workspace** - Verify workspace exists and belongs to organization
4. **Create Project** - Create project row with fields matching `ProjectsService.createProject` pattern
5. **Create Tasks** - If template has `taskTemplates`, create tasks from template structure
6. **Return Project** - Return the created project entity

**Transaction Boundary:**
All operations inside the `dataSource.transaction()` callback:
- Template lookup and validation
- Workspace lookup and validation
- Project creation
- Task creation (if template has tasks)
- Any failure at any step causes complete rollback (no partial project or tasks)

## Entities Touched

### Project
- **Fields Set:**
  - `name` (from payload)
  - `description` (from payload, optional)
  - `workspaceId` (from payload)
  - `organizationId` (from auth context)
  - `createdById` (from auth context)
  - `status` (default: `PLANNING`)
  - `priority` (default: `MEDIUM`)
  - `riskLevel` (default: `MEDIUM`)
  - `methodology` (from template)
  - `startDate` (from payload, optional)

### Task
- **Fields Set:**
  - `projectId` (from created project)
  - `title` (from template task name)
  - `description` (from template task description)
  - `estimatedHours` (from template)
  - `priority` (from template, default: 'medium')
  - `status` (default: 'not_started')
  - `taskNumber` (generated: `TASK-{count + index + 1}`)
  - `taskType` (default: 'task')
  - `assignmentType` (default: 'internal')
  - `progressPercentage` (default: 0)
  - `isMilestone` (default: false)
  - `isBlocked` (default: false)
  - `createdById` (from auth context)
  - `organizationId` (from project, **required by database but not in entity**)

**Note:** Phase entity does not exist in the codebase (commented out everywhere), so phase creation is skipped. Template `phases` structure is stored but not applied.

## Transaction Boundary

**Inside Transaction:**
- Template lookup by ID and organizationId (with isActive check)
- Template organization validation
- Workspace lookup by ID
- Workspace organization validation
- Project entity creation and save
- Task count query (for task number generation)
- Task creation (raw SQL insert for each task to handle organization_id)

**Rollback Triggers:**
- Template not found or not active → `NotFoundException`
- Template doesn't belong to organization → `ForbiddenException`
- Workspace not found → `NotFoundException`
- Workspace doesn't belong to organization → `ForbiddenException`
- Any database constraint violation during project or task creation
- Any exception thrown during the transaction

**Atomicity Guarantee:**
If any step fails, the entire transaction rolls back. No partial project or tasks are created.

## API Endpoint

### POST /admin/templates/:id/apply

**Auth Requirements:**
- `JwtAuthGuard` - User must be authenticated
- `RequireOrgRoleGuard` - User must have org admin role
- `@RequireOrgRole('admin')` - Explicit admin role requirement

**Request Body (ApplyTemplateDto):**
```json
{
  "name": "My Project from Template",
  "workspaceId": "uuid-of-workspace",
  "startDate": "2025-01-01T00:00:00Z",  // Optional ISO date string
  "description": "Project description"   // Optional
}
```

**Response (201 Created):**
```json
{
  "id": "project-uuid",
  "name": "My Project from Template",
  "description": "Project description",
  "workspaceId": "uuid-of-workspace",
  "organizationId": "org-uuid",
  "status": "planning",
  "priority": "medium",
  "riskLevel": "medium",
  "methodology": "agile",
  "startDate": "2025-01-01T00:00:00Z",
  "createdById": "user-uuid",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Template not found or not active
- `403 Forbidden` - Template or workspace doesn't belong to organization
- `400 Bad Request` - Invalid request body (validation errors)
- `500 Internal Server Error` - Database constraint violation or other server error

**Org Isolation:**
- `organizationId` extracted from `req.user.organizationId` (never from client)
- `userId` extracted from `req.user.id` (never from client)
- Template must belong to organization (or be system template)
- Workspace must belong to organization

## Tests

### New Tests Added

**File:** `test/template-application.e2e-spec.ts`

**Test Cases:**

1. **Happy Path - Template Application**
   - Creates template with phases and tasks
   - Applies template via POST `/admin/templates/:id/apply`
   - Verifies project is created with correct fields
   - Verifies tasks are created from template `taskTemplates`
   - Verifies task details match template (name, estimatedHours, priority)

2. **Rollback - Invalid Workspace**
   - Attempts to apply template with workspace from different organization
   - Verifies 403/404 error response
   - Verifies NO project exists in database
   - Verifies NO tasks exist for the would-be project

3. **Rollback - Invalid Template**
   - Attempts to apply non-existent template
   - Verifies 404 error response
   - Verifies NO project exists in database

**Test Results:**
- ✅ All 3 tests passing
- ✅ Happy path creates project and tasks correctly
- ✅ Rollback tests verify atomicity

### Test Coverage Summary

**Happy Path Coverage:**
- ✅ Template application creates project
- ✅ Tasks are created from template `taskTemplates`
- ✅ Task fields are correctly mapped (title, description, estimatedHours, priority)
- ✅ Project fields match `ProjectsService.createProject` pattern

**Rollback Coverage:**
- ✅ Workspace org mismatch causes rollback
- ✅ Invalid template ID causes rollback
- ✅ No partial data created on failure

**Regression Tests:**
- ✅ `workspace-membership-filtering.e2e-spec.ts` - 17/17 passing
- ✅ `workspace-rbac.e2e-spec.ts` - 27/27 passing
- ✅ `workspace-backfill.e2e-spec.ts` - 6/6 passing

## Limitations and Future Work

### Current Limitations

1. **Phase Entity Not Supported**
   - Phase entity does not exist in codebase (commented out everywhere)
   - Template `phases` structure is stored but not applied
   - Tasks are created without phase linkage
   - `phaseOrder` from template is ignored

2. **Task Entity Mismatch**
   - Database requires `organization_id` column
   - TypeScript entity doesn't define `organizationId` field
   - Workaround: Use raw SQL INSERT to set `organization_id`
   - **Future:** Add `organizationId` to Task entity or remove from database

3. **Template Usage Tracking**
   - No `TemplateUsage` entity exists
   - Template application is not tracked
   - **Future:** Add usage tracking entity and record template applications

4. **Task Number Generation**
   - Simple sequential numbering: `TASK-{count + index + 1}`
   - May conflict if tasks are created concurrently
   - **Future:** Use database sequence or more robust numbering

### Future Work

1. **Phase Support**
   - Create or uncomment Phase entity
   - Apply template phases to create ProjectPhase records
   - Link tasks to phases based on `phaseOrder`

2. **Refactor Project Creation**
   - Current implementation duplicates logic from `ProjectsService.createProject`
   - **Future:** Extract shared project creation logic to a helper method
   - **Future:** Consider calling `ProjectsService.createProject` within transaction (requires refactoring)

3. **Template Usage Tracking**
   - Create `TemplateUsage` entity
   - Record template application with project ID, template ID, applied date
   - Add analytics endpoint for template usage

4. **Additional Template Sections**
   - Milestones (not in template structure yet)
   - Risks (not in template structure yet)
   - KPIs (exists in template but not applied)

5. **Task Entity Alignment**
   - Add `organizationId` to Task entity definition
   - Or remove `organization_id` from database if not needed
   - Remove raw SQL workaround

## Files Created or Modified

### Created Files

1. **DTO**
   - `src/modules/templates/dto/apply-template.dto.ts`
   - Fields: `name`, `workspaceId`, `startDate?`, `description?`

2. **Tests**
   - `test/template-application.e2e-spec.ts`
   - 3 test cases covering happy path and rollback scenarios

3. **Documentation**
   - `WEEK_2_PHASE_2_2_TEMPLATE_APPLICATION.md` (this file)

### Modified Files

1. **Service**
   - `src/modules/templates/services/templates.service.ts`
   - Added `applyTemplate()` method with transaction
   - Imports: `Project`, `Task`, `Workspace` entities

2. **Controller**
   - `src/modules/templates/controllers/templates.controller.ts`
   - Added `POST /admin/templates/:id/apply` endpoint
   - Imported `ApplyTemplateDto`
   - Route placed before `DELETE :id` to avoid conflict

3. **Module**
   - `src/modules/templates/template.module.ts`
   - Added `Task` and `Workspace` to `TypeOrmModule.forFeature()`

## Constraints Verified

- ✅ Only backend changes (no frontend)
- ✅ Uses existing templates module and entity
- ✅ Uses `DataSource.transaction` (not QueryRunner)
- ✅ Project creation is atomic
- ✅ Existing project creation API untouched
- ✅ No new feature flags
- ✅ Scope limited to templates, projects, tasks (phases skipped)
- ✅ All org isolation uses `organizationId` from auth context
- ✅ Changes minimal and localized
- ✅ All previously passing tests remain green

## Summary

Phase 2.2 is complete. Template application is implemented with:
- Atomic transaction wrapping all operations
- Project creation from template
- Task creation from template `taskTemplates`
- Proper organization isolation and validation
- Rollback on any failure
- All tests passing (3/3 template tests, 50/50 workspace tests)

Ready for Phase 2.3 or next phase when authorized.

