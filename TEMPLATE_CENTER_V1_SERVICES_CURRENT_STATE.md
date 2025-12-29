# Template Center v1 - Current Service Files for Implementation

## Current Service Patterns

### TenantAwareRepository Pattern
- Services inject repositories using: `@Inject(getTenantAwareRepositoryToken(Entity))`
- Repository type: `TenantAwareRepository<Entity>`
- Organization ID from request: `req.user.organizationId` or `tenantContextService.assertOrganizationId()`
- TenantAwareRepository automatically scopes queries by organizationId

### Request Context Pattern
- Extract orgId: `(req.user as any).organizationId` or `tenantContextService.assertOrganizationId()`
- Extract userId: `(req.user as any).id`
- TenantContextService is injected and used for context management

## Current Service Files

### 1. TemplatesService
**File:** `zephix-backend/src/modules/templates/services/templates.service.ts`

**Current State:**
- Uses `TenantAwareRepository<ProjectTemplate>`
- Has methods: `create`, `findAll`, `findOne`, `update`, `delete`, `archive`, `setAsDefault`, `cloneTemplate`, `applyTemplate`
- Uses `TenantContextService` for org ID assertion
- Uses `DataSource` for transactions

**Needs:**
- New v1 methods: `listV1`, `getV1`, `createV1`, `cloneV1`, `setDefaultV1`, `lockV1`, `unlockV1`, `archiveV1`, `getByIdForGuard`
- Should work with `Template` entity (not `ProjectTemplate`) for v1
- Need to handle `lockState`, `isDefault`, `archivedAt` fields
- Need to join with `template_blocks` and `lego_blocks` for blocks array

### 2. TemplateBlocksService
**File:** `zephix-backend/src/modules/templates/services/template-blocks.service.ts`

**Current State:**
- ❌ **DOES NOT EXIST** - needs to be created

**Needs:**
- Create new service file
- Inject `TenantAwareRepository<TemplateBlock>`
- Methods: `attachV1`, `reorderV1`, `patchConfigV1`, `detachV1`
- Validate template exists and belongs to org
- Validate block exists and isActive
- Enforce unique (orgId, templateId, blockId)
- Check template lockState before mutations

### 3. LegoBlocksService
**File:** `zephix-backend/src/modules/templates/services/lego-blocks.service.ts`

**Current State:**
- ❌ **DOES NOT EXIST** - needs to be created

**Needs:**
- Create new service file
- Inject `TenantAwareRepository<LegoBlock>`
- Methods: `listV1`, `getByIdForGuard`, `userMeetsMinRole`
- Filter by type, methodology, isActive
- Return catalog fields: id, key, name, type, category, description, surface, minRoleToAttach
- Role comparison logic for `userMeetsMinRole`

### 4. ProjectsService
**File:** `zephix-backend/src/modules/projects/services/projects.service.ts`

**Current State:**
- Has `createProject` method
- Uses `TenantAwareRepository<Project>` pattern (extends base class)
- Validates workspace belongs to org
- Sets `createdById`, `organizationId`

**Needs:**
- New method: `createWithTemplateSnapshotV1`
- If `templateId` provided:
  - Load template and template_blocks
  - Build snapshot JSONB object
  - Set `templateId`, `templateVersion`, `templateLocked`, `templateSnapshot` on project
- If `templateId` missing, create project normally (no snapshot fields)

## Entity Files Needed

### Template Entity
**File:** `zephix-backend/src/modules/templates/entities/template.entity.ts`
- ✅ Exists
- Needs v1 fields: `isDefault`, `lockState`, `version`, `createdById`, `updatedById`, `publishedAt`, `archivedAt`
- Column names: snake_case (`is_default`, `lock_state`, etc.)

### TemplateBlock Entity
**File:** `zephix-backend/src/modules/templates/entities/template-block.entity.ts`
- ❌ **DOES NOT EXIST** - needs to be created
- Fields: `id`, `organizationId`, `templateId`, `blockId`, `enabled`, `displayOrder`, `config`, `locked`
- Unique constraint: `(organizationId, templateId, blockId)`

### LegoBlock Entity
**File:** `zephix-backend/src/modules/templates/entities/lego-block.entity.ts`
- ✅ Exists (check if v1 fields added)
- Needs v1 fields: `key`, `category`, `surface`, `isSystem`, `isActive`, `minRoleToAttach`

### Project Entity
**File:** `zephix-backend/src/modules/projects/entities/project.entity.ts`
- ✅ Exists
- Needs v1 fields: `templateId`, `templateVersion`, `templateLocked`, `templateSnapshot`
- Column names: snake_case

## Implementation Requirements

### Transaction Boundaries
- `setDefaultV1`: Transaction to unset previous default, set new default
- `reorderV1`: Transaction to update all displayOrder values
- `archiveV1`: Transaction to set archivedAt and isDefault = false
- `createWithTemplateSnapshotV1`: Transaction for project creation with snapshot

### Validation Rules
- Template must belong to org (unless isSystem = true)
- Block must be active (`isActive = true`)
- Template must not be locked for mutations
- Unique default per org (enforced by partial unique index)
- Unique (orgId, templateId, blockId) for template_blocks

### Response Formats
- All v1 methods return `{ data: ... }` wrapper
- Blocks array sorted by `displayOrder`
- Include `lockedEffective` (template.lockState === 'LOCKED' OR templateBlock.locked === true)

## Next Step

Please provide full method bodies for:
1. TemplatesService v1 methods
2. TemplateBlocksService (new file)
3. LegoBlocksService (new file)
4. ProjectsService.createWithTemplateSnapshotV1

Using:
- TenantAwareRepository pattern
- TenantContextService for org ID
- Request object for user context
- Transaction boundaries where specified
- Proper error handling and validation



