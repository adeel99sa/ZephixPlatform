# Phase 3 Transaction Inspection

## Summary

This document contains the inspection results for multi-step operations that require transaction wrapping. All findings are read-only; no files were modified.

---

## 1. Projects Creation

### File and Method
- **File:** `zephix-backend/src/modules/projects/services/projects.service.ts`
- **Method:** `createProject(createProjectDto, organizationId, userId)`
- **Lines:** 38-114

### Current Flow Steps

1. Validate workspaceId is provided
2. Validate workspace belongs to organization (query workspace repository)
3. Extract phases from DTO (phases are currently not used)
4. Process and convert date strings to Date objects
5. Create project entity using parent class `this.create()` method
   - This calls `projectRepository.save()` internally
6. Return created project

### Repositories/Services Used

- `workspaceRepository` (injected via constructor)
- `projectRepository` (injected via constructor, used via parent class `create()` method)
- `WorkspaceAccessService` (injected, but not used in this method)

### Entities Created/Updated

- **Project** - Created via `this.create()` which internally uses `projectRepository.save()`

### Transaction Wrapper Present?

**NO** - No transaction wrapper exists. The method uses standard repository operations without any transaction boundary.

### DataSource Injection?

**NO** - No DataSource is injected in the constructor. The service uses `@InjectRepository` for repositories only.

### Partial Failure Risk

**Current Risk:** LOW (but could become HIGH if phases are enabled)

**Explanation:**
- Currently, only the project entity is created
- Phases creation is commented out (lines 126-140)
- If phases were enabled and phase creation failed after project creation, the project would exist without phases
- The `createProjectWithPhases` method (lines 119-143) calls `createProject` first, then would create phases separately - this is a multi-step operation that needs a transaction

**Priority:** **MEDIUM** (becomes HIGH if phases are enabled)

---

## 2. Workspaces Creation

### File and Method
- **File:** `zephix-backend/src/modules/workspaces/workspaces.service.ts`
- **Method:** `create(input)`
- **Lines:** 95-124

### Current Flow Steps

1. Create workspace entity using `this.repo.create()`
2. Save workspace entity using `this.repo.save()`
3. Return saved workspace

**Note:** The workspace member creation happens in the **controller** (`workspaces.controller.ts`, lines 67-75), not in the service method.

### Controller Flow (workspaces.controller.ts, lines 61-78)

1. Call `this.svc.create()` to create workspace
2. Call `this.members.addExisting()` to add owner as workspace member

### Repositories/Services Used

- `repo` (Workspace repository, injected via constructor)
- `memberRepo` (WorkspaceMember repository, injected via constructor, but not used in `create()` method)
- `WorkspaceMembersService.addExisting()` (called from controller)

### Entities Created/Updated

- **Workspace** - Created in service method
- **WorkspaceMember** - Created in controller via `members.addExisting()`

### Transaction Wrapper Present?

**NO** - No transaction wrapper exists. Workspace creation and member creation are separate operations.

### DataSource Injection?

**NO** - No DataSource is injected in the constructor. The service uses `@InjectRepository` for repositories only.

### Partial Failure Risk

**Current Risk:** **HIGH**

**Explanation:**
- Workspace is created first in the service
- Workspace member is created separately in the controller
- If `members.addExisting()` fails after workspace creation, the workspace exists without an owner member record
- This violates data integrity - a workspace should always have at least one member (the owner)
- The feature flag `ZEPHIX_WS_MEMBERSHIP_V1` requires `ownerId` to be set, making this a critical path

**Priority:** **HIGH**

---

## 3. Template Application

### File and Method
- **File:** `zephix-backend/src/modules/templates/services/template.service.ts`
- **Method:** `createProjectFromTemplate(dto, userId, organizationId)`
- **Lines:** 70-112

### Current Flow Steps

1. Handle "blank" template case (creates project without template)
2. Get template by ID
3. Create project entity using `projectRepository.create()`
4. Save project using `projectRepository.save()`
5. Create project phases if template has phases (calls `createProjectPhases()`)
6. Track template usage (calls `trackTemplateUsage()`)
7. Return saved project

### Repositories/Services Used

- `templateRepository` (injected via constructor)
- `projectRepository` (injected via constructor)
- `createProjectPhases()` (private method, lines 133-170)
- `trackTemplateUsage()` (private method, lines 173-176)

### Entities Created/Updated

- **Project** - Created and saved
- **ProjectPhase** - Would be created by `createProjectPhases()`, but currently commented out (returns empty array)
- **TemplateUsage** - Would be tracked by `trackTemplateUsage()`, but currently just logs to console

### Transaction Wrapper Present?

**NO** - No transaction wrapper exists. All operations are sequential without transaction boundaries.

### DataSource Injection?

**NO** - No DataSource is injected in the constructor. The service uses `@InjectRepository` for repositories only.

### Partial Failure Risk

**Current Risk:** **MEDIUM** (becomes HIGH when phases and usage tracking are fully implemented)

**Explanation:**
- Project is created first
- Phase creation is attempted after project creation (but currently disabled/commented out)
- Template usage tracking is attempted after project creation (but currently just logs)
- If phase creation or usage tracking fails, the project would exist without phases or usage record
- Currently, phases and usage tracking are not fully implemented, so the risk is lower
- When fully implemented, this becomes a HIGH priority operation

**Priority:** **MEDIUM** (becomes HIGH when phases and usage tracking are enabled)

---

## 4. Class-Level Transaction Hooks

### ProjectsService

**DataSource Injection:** **NO**

**Constructor Pattern:**
```typescript
constructor(
  @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
  @InjectRepository(Workspace) private readonly workspaceRepository: Repository<Workspace>,
  private configService: ConfigService,
  @Inject(forwardRef(() => WorkspaceAccessService))
  private readonly workspaceAccessService: WorkspaceAccessService,
)
```

**Note:** No DataSource field exists. Would need to add `private readonly dataSource: DataSource` to constructor.

### WorkspacesService

**DataSource Injection:** **NO**

**Constructor Pattern:**
```typescript
constructor(
  @InjectRepository(Workspace) private repo: Repository<Workspace>,
  @InjectRepository(WorkspaceMember) private memberRepo: Repository<WorkspaceMember>,
  private configService: ConfigService,
)
```

**Note:** No DataSource field exists. Would need to add `private readonly dataSource: DataSource` to constructor.

### TemplateService

**DataSource Injection:** **NO**

**Constructor Pattern:**
```typescript
constructor(
  @InjectRepository(ProjectTemplate)
  private templateRepository: Repository<ProjectTemplate>,
  @InjectRepository(LegoBlock)
  private blockRepository: Repository<LegoBlock>,
  @InjectRepository(Project)
  private projectRepository: Repository<Project>,
)
```

**Note:** No DataSource field exists. Would need to add `private readonly dataSource: DataSource` to constructor.

---

## Summary Table

| Operation | File | Method | Steps | Transaction? | DataSource? | Priority | Risk Description |
|-----------|------|--------|-------|--------------|-------------|----------|------------------|
| **Project Creation** | `projects.service.ts` | `createProject` | 6 | NO | NO | MEDIUM | Currently only creates project. Risk becomes HIGH if phases are enabled. |
| **Workspace Creation** | `workspaces.service.ts` + controller | `create()` + `addExisting()` | 2 (split) | NO | NO | **HIGH** | Workspace created, then member added separately. If member creation fails, workspace exists without owner. |
| **Template Application** | `template.service.ts` | `createProjectFromTemplate` | 7 | NO | NO | MEDIUM | Creates project, then phases (disabled), then usage tracking (logs only). Risk becomes HIGH when fully implemented. |

---

## Priority Operations for Phase 3B

### HIGH Priority

1. **Workspace Creation** (`workspaces.service.ts` + `workspaces.controller.ts`)
   - **Why:** User-facing, multi-step operation (workspace + member)
   - **Risk:** Workspace can exist without owner member if member creation fails
   - **Impact:** Data integrity violation, breaks feature flag requirements

### MEDIUM Priority

2. **Project Creation** (`projects.service.ts`)
   - **Why:** Currently single-step, but `createProjectWithPhases` is multi-step
   - **Risk:** If phases are enabled, project could exist without phases
   - **Impact:** Partial project creation, inconsistent state

3. **Template Application** (`template.service.ts`)
   - **Why:** Multi-step operation (project + phases + usage tracking)
   - **Risk:** Currently phases and usage tracking are disabled/logs only
   - **Impact:** When fully implemented, project could exist without phases or usage record

---

## Recommendations

1. **Phase 3B should wrap HIGH priority operations first:**
   - Workspace creation + member creation must be atomic

2. **For MEDIUM priority operations:**
   - Wrap `createProjectWithPhases` if it's actively used
   - Wrap `createProjectFromTemplate` when phases and usage tracking are fully implemented

3. **DataSource Injection:**
   - All three services need DataSource injected
   - Use `@InjectDataSource()` decorator or inject via constructor

4. **Transaction Pattern:**
   - Use `this.dataSource.transaction(async manager => { ... })`
   - Replace repository calls with `manager.getRepository()` inside transaction
   - Keep all existing logic unchanged, only wrap in transaction

---

## Notes

- Phases creation in projects is currently commented out
- Template phases creation is currently commented out (returns empty array)
- Template usage tracking is currently just a console.log
- Workspace member creation happens in controller, not service - this needs to be moved into service or wrapped at controller level
- All operations use standard TypeORM repositories, no custom transaction patterns exist

---

**Inspection Complete** ✅

