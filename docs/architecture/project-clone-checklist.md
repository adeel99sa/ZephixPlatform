# Project Clone — Implementation Checklist

**Companion to:** `project-clone-spec.md`
**Phase:** 1 (Structure Only)
**Date:** 2026-02-12

---

## 1. Migrations

### 1.1 Add Lineage Columns to Project

**File:** `zephix-backend/src/migrations/1799000000000-AddProjectCloneLineageColumns.ts`

**Changes:**

```sql
ALTER TABLE "projects"
  ADD COLUMN "source_project_id" uuid NULL,
  ADD COLUMN "clone_depth" integer NOT NULL DEFAULT 0,
  ADD COLUMN "cloned_at" timestamptz NULL,
  ADD COLUMN "cloned_by" uuid NULL;

CREATE INDEX "IDX_projects_source_project" ON "projects"("source_project_id");

ALTER TABLE "projects"
  ADD CONSTRAINT "FK_projects_source_project"
  FOREIGN KEY ("source_project_id") REFERENCES "projects"("id")
  ON DELETE SET NULL;

ALTER TABLE "projects"
  ADD CONSTRAINT "FK_projects_cloned_by"
  FOREIGN KEY ("cloned_by") REFERENCES "users"("id")
  ON DELETE SET NULL;
```

**Down:** Drop constraints, index, and columns.

### 1.2 Create ProjectCloneRequest Table

**File:** `zephix-backend/src/migrations/1799000000001-CreateProjectCloneRequestsTable.ts`

**Changes:**

```sql
CREATE TABLE "project_clone_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_project_id" uuid NOT NULL,
  "target_workspace_id" uuid NOT NULL,
  "mode" varchar(30) NOT NULL,
  "requested_by" uuid NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'in_progress',
  "new_project_id" uuid NULL,
  "failure_reason" text NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz NULL
);

CREATE UNIQUE INDEX "IDX_clone_requests_idempotency"
  ON "project_clone_requests"("source_project_id", "target_workspace_id", "mode", "requested_by")
  WHERE "status" = 'in_progress';

CREATE INDEX "IDX_clone_requests_source"
  ON "project_clone_requests"("source_project_id");

CREATE INDEX "IDX_clone_requests_status"
  ON "project_clone_requests"("status");
```

**Down:** Drop table.

### 1.3 Seed Clone Policy

**File:** `zephix-backend/src/migrations/1799000000002-SeedProjectClonePolicy.ts`

**Changes:**

```sql
INSERT INTO "policy_definitions" ("key", "category", "description", "value_type", "default_value")
VALUES ('project_clone_enabled', 'projects', 'Enable project duplication feature', 'boolean', 'false')
ON CONFLICT ("key") DO NOTHING;
```

**Down:** Delete the row.

---

## 2. Backend Files — New

### 2.1 Entity: ProjectCloneRequest

**File:** `zephix-backend/src/modules/projects/entities/project-clone-request.entity.ts`

**Content:** TypeORM entity matching §7.1 of the spec.

### 2.2 Enum: ProjectCloneMode

**File:** `zephix-backend/src/modules/projects/enums/project-clone.enums.ts`

**Content:**

```typescript
export enum ProjectCloneMode {
  STRUCTURE_ONLY = 'structure_only',
  FULL_CLONE = 'full_clone',
}

export enum ProjectCloneRequestStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

### 2.3 DTO: CloneProjectDto

**File:** `zephix-backend/src/modules/projects/dto/clone-project.dto.ts`

**Content:**

```typescript
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ProjectCloneMode } from '../enums/project-clone.enums';

export class CloneProjectDto {
  @IsEnum(ProjectCloneMode)
  mode: ProjectCloneMode;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  newName?: string;

  @IsOptional()
  @IsUUID()
  targetWorkspaceId?: string;
}
```

### 2.4 DTO: CloneProjectResponseDto

**File:** `zephix-backend/src/modules/projects/dto/clone-project-response.dto.ts`

**Content:**

```typescript
export class CloneProjectResponseDto {
  newProjectId: string;
  sourceProjectId: string;
  mode: string;
  cloneRequestId: string;
  name: string;
  workspaceId: string;
}
```

### 2.5 Service: ProjectCloneService

**File:** `zephix-backend/src/modules/projects/services/project-clone.service.ts`

**Dependencies injected:**

| Dependency | Source |
|------------|--------|
| `DataSource` | `typeorm` |
| `DomainEventsPublisher` | `../domain-events/domain-events.publisher` |
| `PoliciesService` | `../policies/policies.service` |
| `WorkspaceAccessService` | `../workspace-access/workspace-access.service` |
| `Repository<ProjectCloneRequest>` | `TypeOrmModule` |

**Public methods:**

| Method | Signature |
|--------|-----------|
| `clone` | `(projectId: string, workspaceId: string, dto: CloneProjectDto, userId: string, organizationId: string) → Promise<CloneProjectResponseDto>` |

**Private methods:**

| Method | Purpose |
|--------|---------|
| `generateCloneName` | Name deduplication (§4 of spec) |
| `cloneStructure` | Mode A copy sequence (steps 10-15) |
| `cloneOperationalData` | Mode B add-on (steps 16-21, Phase 2) |
| `buildPhaseIdMap` | Copy phases, return old→new ID map |
| `copyGateDefinitions` | Copy gates with phase ID remap |
| `copyWorkflowConfig` | Copy workflow config |
| `copyKpiAssignments` | Copy ProjectKpi rows, return old→new ID map |
| `copyProjectViews` | Copy views |

### 2.6 Controller: ProjectCloneController

**File:** `zephix-backend/src/modules/projects/controllers/project-clone.controller.ts`

**Route:** `POST /workspaces/:workspaceId/projects/:projectId/clone`

**Guards:** `JwtAuthGuard`, `RequireWorkspaceAccessGuard`

**Handler:**

```typescript
@Post(':projectId/clone')
async clone(
  @Param('workspaceId') workspaceId: string,
  @Param('projectId') projectId: string,
  @Body() dto: CloneProjectDto,
  @CurrentUser() user: UserJwt,
) {
  const result = await this.cloneService.clone(
    projectId, workspaceId, dto, user.id, user.organizationId,
  );
  return formatResponse(result);
}
```

### 2.7 Domain Event Type

**File (modify):** `zephix-backend/src/modules/domain-events/domain-events.types.ts`

**Add:**

```typescript
export interface ProjectClonedEvent extends DomainEvent {
  name: 'project.cloned';
  data: {
    newProjectId: string;
    sourceProjectId: string;
    cloneMode: string;
    targetWorkspaceId: string;
    sourceWorkspaceId: string;
    cloneDepth: number;
    entityCounts: {
      phases: number;
      gateDefinitions: number;
      kpiAssignments: number;
      views: number;
      workflowConfig: boolean;
      tasks?: number;
      dependencies?: number;
      allocations?: number;
      risks?: number;
      kpiValues?: number;
      documents?: number;
    };
  };
}
```

---

## 3. Backend Files — Modified

### 3.1 Project Entity

**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`

**Add 4 columns:**

```typescript
@Column({ type: 'uuid', name: 'source_project_id', nullable: true })
sourceProjectId: string | null;

@Column({ type: 'int', name: 'clone_depth', default: 0 })
cloneDepth: number;

@Column({ type: 'timestamptz', name: 'cloned_at', nullable: true })
clonedAt: Date | null;

@Column({ type: 'uuid', name: 'cloned_by', nullable: true })
clonedBy: string | null;
```

### 3.2 Projects Module

**File:** `zephix-backend/src/modules/projects/projects.module.ts`

**Add to imports:**

```typescript
TypeOrmModule.forFeature([..., ProjectCloneRequest])
```

**Add to imports (modules):**

```typescript
DomainEventsModule,   // for DomainEventsPublisher
PoliciesModule,       // for PoliciesService
```

**Add to controllers:**

```typescript
ProjectCloneController,
```

**Add to providers:**

```typescript
ProjectCloneService,
```

**Add to exports:**

```typescript
ProjectCloneService,
```

### 3.3 Domain Events Types

**File:** `zephix-backend/src/modules/domain-events/domain-events.types.ts`

**Add:** `ProjectClonedEvent` interface (see §2.7).

---

## 4. Frontend Files — New

### 4.1 Clone Modal Component

**File:** `zephix-frontend/src/features/projects/components/DuplicateProjectModal.tsx`

**Behavior:**

- Title: "Duplicate project"
- Two radio options:
  - "Structure only" — enabled, selected by default
  - "Clone with work" — disabled, label "(Coming next)"
- Optional "New name" text input, prefilled with `"${project.name} (Copy)"`
- Optional workspace selector (dropdown of user's workspaces, defaults to current)
- Confirm button: "Duplicate"
- Cancel button: "Cancel"

### 4.2 Clone API Hook

**File:** `zephix-frontend/src/features/projects/api/useCloneProject.ts`

**Content:**

```typescript
export function useCloneProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      workspaceId: string;
      projectId: string;
      mode: 'structure_only' | 'full_clone';
      newName?: string;
      targetWorkspaceId?: string;
    }) => api.post(
      `/workspaces/${params.workspaceId}/projects/${params.projectId}/clone`,
      { mode: params.mode, newName: params.newName, targetWorkspaceId: params.targetWorkspaceId },
    ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Navigate to new project
      // Show toast
    },
  });
}
```

### 4.3 Frontend Entry Points (Modified Files)

| File | Change |
|------|--------|
| `zephix-frontend/src/components/shell/Sidebar.tsx` | Add "Duplicate" to project overflow menu |
| `zephix-frontend/src/features/projects/views/ProjectShellPage.tsx` | Add "Duplicate" to project header overflow menu |

---

## 5. Test Files — New

### 5.1 Unit Tests

**File:** `zephix-backend/src/modules/projects/services/__tests__/project-clone.service.spec.ts`

**Test cases:**

| # | Test | Mode |
|---|------|------|
| 1 | clones project with correct lineage fields | A |
| 2 | generates unique name when default name exists | A |
| 3 | copies all WorkPhases and remaps projectId | A |
| 4 | copies PhaseGateDefinitions and remaps phaseId | A |
| 5 | copies ProjectWorkflowConfig with new projectId | A |
| 6 | copies ProjectKpis with new projectId | A |
| 7 | copies ProjectViews without unique constraint violation | A |
| 8 | does NOT copy WorkTasks | A |
| 9 | does NOT copy WorkRisks | A |
| 10 | does NOT copy KpiValues | A |
| 11 | does NOT copy WorkResourceAllocations | A |
| 12 | does NOT copy PhaseGateSubmissions | A |
| 13 | does NOT copy comments or activities | A |
| 14 | resets status to PLANNING | A |
| 15 | resets state to DRAFT | A |
| 16 | resets actualCost to null | A |
| 17 | resets structureLocked to false | A |
| 18 | resets templateLocked to false | A |
| 19 | resets projectManagerId to null | A |
| 20 | resets portfolioId and programId to null | A |
| 21 | sets sourceProjectId to original project ID | A |
| 22 | increments cloneDepth from source | A |
| 23 | rolls back all entities on failure | A |
| 24 | emits project.cloned event after commit | A |
| 25 | rejects full_clone mode in Phase 1 | A |

### 5.2 Integration Tests

**File:** `zephix-backend/src/modules/projects/services/__tests__/project-clone.integration.spec.ts`

**Test cases:**

| # | Test |
|---|------|
| 1 | clones project across workspaces in same org |
| 2 | blocks clone to workspace in different org |
| 3 | blocks clone when user is not member of target workspace |
| 4 | blocks clone when user is VIEWER on target workspace |
| 5 | returns 409 when clone is already in progress |
| 6 | returns completed clone request on duplicate call after success |
| 7 | blocks clone when project_clone_enabled policy is false |
| 8 | full transaction: project + phases + gates + config + kpis + views all created |
| 9 | full transaction: rollback creates zero entities on error |

### 5.3 Controller Tests

**File:** `zephix-backend/src/modules/projects/controllers/__tests__/project-clone.controller.spec.ts`

**Test cases:**

| # | Test |
|---|------|
| 1 | returns 200 with correct response shape |
| 2 | returns 400 for missing mode |
| 3 | returns 400 for invalid mode |
| 4 | returns 404 for non-existent project |
| 5 | calls clone service with correct parameters |

### 5.4 Frontend Tests

**File:** `zephix-frontend/src/features/projects/components/__tests__/DuplicateProjectModal.test.tsx`

**Test cases:**

| # | Test |
|---|------|
| 1 | renders two options with "Structure only" selected |
| 2 | "Clone with work" option is disabled |
| 3 | prefills name with "(Copy)" suffix |
| 4 | calls clone API with correct payload |
| 5 | navigates to new project on success |
| 6 | shows toast on success |
| 7 | shows error message on 409 conflict |

---

## 6. Modules and Services Dependency Map

```
ProjectsModule
├── imports
│   ├── TypeOrmModule.forFeature([Project, ProjectView, ProjectCloneRequest, ...])
│   ├── DomainEventsModule          (NEW import)
│   ├── PoliciesModule              (NEW import)
│   ├── WorkspaceAccessModule       (existing)
│   └── TenancyModule               (existing)
├── controllers
│   ├── ProjectsController          (existing)
│   ├── ProjectsViewController      (needs registration if not already)
│   ├── ProjectCloneController      (NEW)
│   └── WorkspaceProjectsController (existing)
├── providers
│   ├── ProjectsService             (existing)
│   ├── ProjectsViewService         (existing)
│   ├── ProjectCloneService         (NEW)
│   └── ...
└── exports
    ├── ProjectsService             (existing)
    └── ProjectCloneService         (NEW)
```

**External module dependencies for clone:**

| Module | What It Provides | Already Imported? |
|--------|-----------------|-------------------|
| `DomainEventsModule` | `DomainEventsPublisher` | No — must add |
| `PoliciesModule` | `PoliciesService` | No — must add |
| `WorkspaceAccessModule` | `WorkspaceAccessService` | Yes |
| `TenancyModule` | `TenantContextService` | Yes |

---

## 7. Entity Registration Checklist

Entities that must be registered in `TypeOrmModule.forFeature()` within `ProjectsModule`:

| Entity | Currently Registered | Needs Adding |
|--------|---------------------|--------------|
| `Project` | Yes | No |
| `ProjectView` | No (used via TenantAwareRepo) | Verify |
| `ProjectCloneRequest` | No | Yes |
| `WorkPhase` | No (lives in WorkManagementModule) | Access via DataSource |
| `PhaseGateDefinition` | No (lives in WorkManagementModule) | Access via DataSource |
| `ProjectWorkflowConfig` | No (lives in WorkManagementModule) | Access via DataSource |
| `ProjectKpi` | No (lives in TemplateCenterModule) | Access via DataSource |

**Strategy:** The `ProjectCloneService` uses `QueryRunner` for all copy operations, so it accesses entities via raw `queryRunner.manager.find()` and `queryRunner.manager.save()`. This means it does NOT need entity registration in `TypeOrmModule.forFeature()` for the entities it copies — only for `ProjectCloneRequest` which it manages directly.

---

## 8. Rollout Checklist

### Pre-Deploy (Staging)

- [ ] Migrations pass on staging database
- [ ] `project_clone_enabled` policy seeded as `false`
- [ ] Backend builds clean
- [ ] Unit tests pass
- [ ] Integration tests pass

### Staging Verification

- [ ] Enable policy: `UPDATE policy_definitions SET default_value = 'true' WHERE key = 'project_clone_enabled'` (or via policy override for staging workspace)
- [ ] Create a project with phases, gates, KPIs, workflow config, views
- [ ] Clone it (Structure Only)
- [ ] Verify entity counts match: phases, gates, kpis, views, config
- [ ] Verify zero tasks, risks, allocations, values on clone
- [ ] Verify lineage fields: sourceProjectId, cloneDepth, clonedAt, clonedBy
- [ ] Verify project name is unique
- [ ] Verify clone across workspaces works
- [ ] Verify clone blocked for non-members
- [ ] Verify 409 on double-click rapid fire
- [ ] Verify domain event emitted (check logs)

### Production

- [ ] Deploy with policy `default_value = 'false'`
- [ ] Enable per-workspace via policy override for pilot workspaces
- [ ] Monitor error rates for 24 hours
- [ ] Enable org-wide after pilot

---

## 9. File Summary — All Files Touched

### New Files (Backend)

| # | Path |
|---|------|
| 1 | `zephix-backend/src/migrations/1799000000000-AddProjectCloneLineageColumns.ts` |
| 2 | `zephix-backend/src/migrations/1799000000001-CreateProjectCloneRequestsTable.ts` |
| 3 | `zephix-backend/src/migrations/1799000000002-SeedProjectClonePolicy.ts` |
| 4 | `zephix-backend/src/modules/projects/entities/project-clone-request.entity.ts` |
| 5 | `zephix-backend/src/modules/projects/enums/project-clone.enums.ts` |
| 6 | `zephix-backend/src/modules/projects/dto/clone-project.dto.ts` |
| 7 | `zephix-backend/src/modules/projects/dto/clone-project-response.dto.ts` |
| 8 | `zephix-backend/src/modules/projects/services/project-clone.service.ts` |
| 9 | `zephix-backend/src/modules/projects/controllers/project-clone.controller.ts` |
| 10 | `zephix-backend/src/modules/projects/services/__tests__/project-clone.service.spec.ts` |
| 11 | `zephix-backend/src/modules/projects/services/__tests__/project-clone.integration.spec.ts` |
| 12 | `zephix-backend/src/modules/projects/controllers/__tests__/project-clone.controller.spec.ts` |

### Modified Files (Backend)

| # | Path | Change |
|---|------|--------|
| 1 | `zephix-backend/src/modules/projects/entities/project.entity.ts` | Add 4 lineage columns |
| 2 | `zephix-backend/src/modules/projects/projects.module.ts` | Register entity, controller, service, imports |
| 3 | `zephix-backend/src/modules/domain-events/domain-events.types.ts` | Add ProjectClonedEvent type |

### New Files (Frontend)

| # | Path |
|---|------|
| 1 | `zephix-frontend/src/features/projects/components/DuplicateProjectModal.tsx` |
| 2 | `zephix-frontend/src/features/projects/api/useCloneProject.ts` |
| 3 | `zephix-frontend/src/features/projects/components/__tests__/DuplicateProjectModal.test.tsx` |

### Modified Files (Frontend)

| # | Path | Change |
|---|------|--------|
| 1 | `zephix-frontend/src/components/shell/Sidebar.tsx` | Add "Duplicate" to project context menu |
| 2 | `zephix-frontend/src/features/projects/views/ProjectShellPage.tsx` | Add "Duplicate" to project header menu |

---

## 10. Implementation Order

Execute in this exact sequence:

```
Step 1.  Create enums file (project-clone.enums.ts)
Step 2.  Create ProjectCloneRequest entity
Step 3.  Add lineage columns to Project entity
Step 4.  Create migration: AddProjectCloneLineageColumns
Step 5.  Create migration: CreateProjectCloneRequestsTable
Step 6.  Create migration: SeedProjectClonePolicy
Step 7.  Create CloneProjectDto and CloneProjectResponseDto
Step 8.  Add ProjectClonedEvent to domain-events.types.ts
Step 9.  Create ProjectCloneService
Step 10. Create ProjectCloneController
Step 11. Register in ProjectsModule
Step 12. Write unit tests
Step 13. Write integration tests
Step 14. Write controller tests
Step 15. Run npm run build — verify clean
Step 16. Run npm run test — verify pass
Step 17. Create DuplicateProjectModal component
Step 18. Create useCloneProject hook
Step 19. Wire modal into Sidebar and ProjectShellPage
Step 20. Write frontend tests
Step 21. Run frontend lint and test
Step 22. Commit all changes
```
